import asyncio
import json
from io import BytesIO
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from PIL import Image

from backend.app.gemini import GeminiServiceError, analyze_image_with_gemini


ASSESSMENT = {
    "descricao": "Uma pessoa segura um cartaz numa rua.",
    "texto_visivel": ["Marcha hoje"],
    "pistas_visuais": ["O texto do cartaz está parcialmente desfocado."],
    "hipoteses": ["A fotografia pode ter sido comprimida."],
    "verificacoes_sugeridas": ["Procurar a publicação original."],
    "limitacoes": "A imagem sozinha não confirma a origem.",
}


def make_image() -> bytes:
    output = BytesIO()
    Image.new("RGB", (20, 20), color=(40, 60, 80)).save(output, format="PNG")
    return output.getvalue()


def make_bmp() -> bytes:
    output = BytesIO()
    Image.new("RGB", (20, 20), color=(40, 60, 80)).save(output, format="BMP")
    return output.getvalue()


def test_gemini_sends_opted_in_image_and_parses_structured_response():
    response = httpx.Response(
        200,
        json={"candidates": [{"content": {"parts": [{"text": json.dumps(ASSESSMENT)}]}}]},
    )
    mock_post = AsyncMock(return_value=response)

    async def run():
        with patch("backend.app.gemini.httpx.AsyncClient.post", new=mock_post):
            result = await analyze_image_with_gemini(
                make_image(),
                "test-gemini-secret",
                "gemini-3.6-flash",
                "en",
            )
        return result

    result = asyncio.run(run())
    request = mock_post.await_args.kwargs
    image_part = request["json"]["contents"][0]["parts"][1]["inlineData"]

    assert result == ASSESSMENT
    assert request["headers"]["x-goog-api-key"] == "test-gemini-secret"
    assert mock_post.await_args.args[0].endswith(
        "/models/gemini-3.6-flash:generateContent"
    )
    assert image_part["mimeType"] == "image/png"
    assert request["json"]["generationConfig"]["responseMimeType"] == "application/json"
    assert "answer in English." in request["json"]["contents"][0]["parts"][0]["text"]
    assert "test-gemini-secret" not in json.dumps(result)


def test_gemini_rate_limit_is_returned_as_a_provider_error():
    mock_post = AsyncMock(return_value=httpx.Response(429, json={"error": "quota"}))

    async def run():
        with patch("backend.app.gemini.httpx.AsyncClient.post", new=mock_post):
            with pytest.raises(GeminiServiceError) as error:
                await analyze_image_with_gemini(make_image(), "secret", "gemini-3.6-flash")
        return error.value

    error = asyncio.run(run())

    assert error.status_code == 429
    assert error.detail == "gemini_rate_limit"


def test_gemini_converts_bmp_to_jpeg_for_image_input():
    response = httpx.Response(
        200,
        json={"candidates": [{"content": {"parts": [{"text": json.dumps(ASSESSMENT)}]}}]},
    )
    mock_post = AsyncMock(return_value=response)

    async def run():
        with patch("backend.app.gemini.httpx.AsyncClient.post", new=mock_post):
            await analyze_image_with_gemini(make_bmp(), "secret", "gemini-3.6-flash")

    asyncio.run(run())
    image_part = mock_post.await_args.kwargs["json"]["contents"][0]["parts"][1]["inlineData"]

    assert image_part["mimeType"] == "image/jpeg"


def test_gemini_rejects_malformed_structured_response():
    mock_post = AsyncMock(
        return_value=httpx.Response(
            200,
            json={"candidates": [{"content": {"parts": [{"text": "not json"}]}}]},
        )
    )

    async def run():
        with patch("backend.app.gemini.httpx.AsyncClient.post", new=mock_post):
            with pytest.raises(GeminiServiceError) as error:
                await analyze_image_with_gemini(make_image(), "secret", "gemini-3.6-flash")
        return error.value

    error = asyncio.run(run())

    assert error.status_code == 502
    assert error.detail == "gemini_invalid_response"


def test_gemini_requires_a_server_side_key_without_requesting_google():
    mock_post = AsyncMock()

    async def run():
        with patch("backend.app.gemini.httpx.AsyncClient.post", new=mock_post):
            with pytest.raises(GeminiServiceError) as error:
                await analyze_image_with_gemini(make_image(), "", "gemini-3.6-flash")
        return error.value

    error = asyncio.run(run())

    assert error.status_code == 503
    assert error.detail == "gemini_not_configured"
    mock_post.assert_not_awaited()
