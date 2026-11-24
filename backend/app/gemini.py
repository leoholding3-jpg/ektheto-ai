from __future__ import annotations

import base64
import json
from io import BytesIO
from typing import Any, Literal

import httpx
from PIL import Image
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from .analyzer import prepare_image_for_provider, validate_image

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
LANGUAGES = {"pt": "Portuguese", "en": "English", "es": "Spanish"}


class GeminiServiceError(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


class GeminiImageAssessment(BaseModel):
    model_config = ConfigDict(extra="ignore")

    descricao: str = Field(min_length=1, max_length=1200)
    texto_visivel: list[str] = Field(max_length=8)
    pistas_visuais: list[str] = Field(max_length=8)
    hipoteses: list[str] = Field(max_length=5)
    verificacoes_sugeridas: list[str] = Field(max_length=5)
    limitacoes: str = Field(min_length=1, max_length=600)


def _extract_assessment(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise GeminiServiceError(502, "gemini_invalid_response")
    candidates = payload.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        raise GeminiServiceError(502, "gemini_response_blocked")

    content = candidates[0].get("content") if isinstance(candidates[0], dict) else None
    parts = content.get("parts") if isinstance(content, dict) else None
    if not isinstance(parts, list):
        raise GeminiServiceError(502, "gemini_invalid_response")
    text = "".join(
        part["text"]
        for part in parts
        if isinstance(part, dict) and isinstance(part.get("text"), str)
    ).strip()
    if not text:
        raise GeminiServiceError(502, "gemini_invalid_response")

    try:
        return GeminiImageAssessment.model_validate(json.loads(text)).model_dump()
    except (ValueError, TypeError, ValidationError) as exc:
        raise GeminiServiceError(502, "gemini_invalid_response") from exc


async def analyze_image_with_gemini(
    image_bytes: bytes,
    api_key: str,
    model: str,
    language: Literal["pt", "en", "es"] = "pt",
) -> dict[str, Any]:
    if not api_key.strip():
        raise GeminiServiceError(503, "gemini_not_configured")
    if not model or any(character not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-" for character in model):
        raise GeminiServiceError(503, "gemini_model_not_configured")

    try:
        content_type = validate_image(image_bytes)
        if content_type == "image/bmp":
            with Image.open(BytesIO(image_bytes)) as image:
                output = BytesIO()
                image.convert("RGB").save(output, format="JPEG", quality=88, optimize=True)
                image_bytes = output.getvalue()
            content_type = "image/jpeg"
        image_bytes, content_type = prepare_image_for_provider(image_bytes, content_type)
    except (ValueError, OSError, Image.DecompressionBombError) as exc:
        raise GeminiServiceError(422, "gemini_invalid_image") from exc

    system_instruction = (
        "You assist image investigations. Describe only what is visible. "
        "Do not decide whether an image is authentic or AI-generated, identify "
        "people, infer sensitive traits, or claim external verification. "
        "Separate observations from hypotheses and suggest checks that require "
        "independent sources. Return only valid JSON with the requested fields."
    )
    prompt = (
        f"Analyze the supplied image and answer in {LANGUAGES[language]}. "
        "Return a JSON object with exactly these fields: descricao (a neutral "
        "visual description), texto_visivel (up to 8 readable text strings), "
        "pistas_visuais (up to 8 observable clues), hipoteses (up to 5 "
        "unverified hypotheses), verificacoes_sugeridas (up to 5 concrete "
        "checks), and limitacoes (what cannot be concluded from the image "
        "alone). Keep each list item concise. Do not include URLs or claim that "
        "you searched the web."
    )
    request_body = {
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": prompt},
                    {
                        "inlineData": {
                            "mimeType": content_type,
                            "data": base64.b64encode(image_bytes).decode("ascii"),
                        }
                    },
                ],
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.2,
            "maxOutputTokens": 900,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                GEMINI_URL.format(model=model),
                headers={"x-goog-api-key": api_key},
                json=request_body,
            )
    except httpx.TimeoutException as exc:
        raise GeminiServiceError(504, "gemini_timeout") from exc
    except httpx.RequestError as exc:
        raise GeminiServiceError(502, "gemini_unavailable") from exc

    if response.status_code == 429:
        raise GeminiServiceError(429, "gemini_rate_limit")
    if response.status_code in {401, 403}:
        raise GeminiServiceError(503, "gemini_credentials_invalid")
    if response.status_code == 404:
        raise GeminiServiceError(503, "gemini_model_unavailable")
    if response.status_code == 408:
        raise GeminiServiceError(504, "gemini_timeout")
    if response.status_code != 200:
        raise GeminiServiceError(502, "gemini_upstream_error")

    try:
        payload = response.json()
    except ValueError as exc:
        raise GeminiServiceError(502, "gemini_invalid_response") from exc
    return _extract_assessment(payload)
