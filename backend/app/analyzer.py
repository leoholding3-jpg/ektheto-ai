from __future__ import annotations

import math
from dataclasses import dataclass
from io import BytesIO
from typing import Any

import requests
from PIL import Image, ImageOps, UnidentifiedImageError

API_URL = "https://api.sightengine.com/1.0/check.json"
MAX_IMAGE_BYTES = 100 * 1024 * 1024
MAX_IMAGE_PIXELS = 50_000_000
MAX_PROVIDER_IMAGE_BYTES = 10 * 1024 * 1024
MAX_PROVIDER_IMAGE_PIXELS = 25_000_000
SUPPORTED_IMAGE_FORMATS = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
    "BMP": "image/bmp",
}


class AnalysisError(Exception):
    pass


@dataclass(frozen=True)
class ImageAnalysis:
    score: float
    generator_scores: tuple[tuple[str, float], ...] = ()
    deepfake_score: float | None = None
    content_type: str = "application/octet-stream"


def validate_image(data: bytes) -> str:
    if not data:
        raise ValueError("empty")
    if len(data) > MAX_IMAGE_BYTES:
        raise ValueError("size")
    try:
        with Image.open(BytesIO(data)) as image:
            image_format = image.format
            width, height = image.size
            if image_format not in SUPPORTED_IMAGE_FORMATS:
                raise ValueError("format")
            if width <= 0 or height <= 0 or width * height > MAX_IMAGE_PIXELS:
                raise ValueError("dimensions")
            image.verify()
    except ValueError:
        raise
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ValueError("invalid") from exc
    except Exception as exc:
        raise ValueError("invalid") from exc
    return SUPPORTED_IMAGE_FORMATS[image_format]


def extract_image_metadata(data: bytes) -> dict[str, str | bool | None]:
    with Image.open(BytesIO(data)) as image:
        exif = image.getexif()
        exif_ifd = exif.get_ifd(34665)

    def value(tag: int, exif_tag: int | None = None) -> str | None:
        raw = exif.get(tag)
        if raw is None and exif_tag is not None:
            raw = exif_ifd.get(exif_tag)
        if raw is None:
            return None
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8", errors="replace")
        text = str(raw).strip()
        return text[:120] or None

    return {
        "camera_make": value(271),
        "camera_model": value(272),
        "software": value(305),
        "captured_at": (
            value(36867, 36867)
            or value(36868, 36868)
            or value(306)
        ),
        "gps_data_present": bool(exif.get(34853)),
    }


def prepare_image_for_provider(data: bytes, content_type: str) -> tuple[bytes, str]:
    try:
        with Image.open(BytesIO(data)) as source:
            if (
                len(data) <= MAX_PROVIDER_IMAGE_BYTES
                and source.width * source.height <= MAX_PROVIDER_IMAGE_PIXELS
            ):
                return data, content_type

            target_scale = min(
                1,
                math.sqrt(MAX_PROVIDER_IMAGE_PIXELS / (source.width * source.height)),
            )
            target_size = (
                max(1, int(source.width * target_scale)),
                max(1, int(source.height * target_scale)),
            )
            if source.format == "JPEG":
                source.draft("RGB", target_size)
            image = ImageOps.exif_transpose(source)
            image.thumbnail(target_size, Image.Resampling.LANCZOS)
            if "A" in image.getbands():
                rgba = image.convert("RGBA")
                rgb = Image.new("RGB", rgba.size, "white")
                rgb.paste(rgba, mask=rgba.getchannel("A"))
                image = rgb
            else:
                image = image.convert("RGB")

            while True:
                for quality in (88, 82, 76, 70, 64):
                    output = BytesIO()
                    image.save(output, format="JPEG", quality=quality, optimize=True)
                    if output.tell() <= MAX_PROVIDER_IMAGE_BYTES:
                        return output.getvalue(), "image/jpeg"

                width, height = image.size
                if width <= 1 or height <= 1:
                    raise ValueError("invalid")
                image = image.resize(
                    (max(1, int(width * 0.85)), max(1, int(height * 0.85))),
                    Image.Resampling.LANCZOS,
                )
    except ValueError:
        raise
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ValueError("invalid") from exc


def parse_score(payload: Any) -> float:
    if not isinstance(payload, dict) or payload.get("status") != "success":
        raise ValueError("status")
    result_type = payload.get("type")
    score = result_type.get("ai_generated") if isinstance(result_type, dict) else None
    if (
        isinstance(score, bool)
        or not isinstance(score, (int, float))
        or not math.isfinite(score)
        or not 0 <= score <= 1
    ):
        raise ValueError("score")
    return float(score)


def parse_deepfake(payload: Any) -> float | None:
    if not isinstance(payload, dict) or not isinstance(payload.get("type"), dict):
        return None
    score = payload["type"].get("deepfake")
    if score is None:
        return None
    if (
        isinstance(score, bool)
        or not isinstance(score, (int, float))
        or not math.isfinite(score)
        or not 0 <= score <= 1
    ):
        raise ValueError("score")
    return float(score)


def parse_generators(payload: Any) -> tuple[tuple[str, float], ...]:
    if not isinstance(payload, dict) or not isinstance(payload.get("type"), dict):
        return ()
    raw = payload["type"].get("ai_generators")
    if not isinstance(raw, dict):
        return ()
    valid = [
        (str(name), float(score))
        for name, score in raw.items()
        if isinstance(name, str)
        and name
        and isinstance(score, (int, float))
        and not isinstance(score, bool)
        and math.isfinite(score)
        and 0 <= score <= 1
    ]
    return tuple(sorted(valid, key=lambda item: item[1], reverse=True)[:3])


def classify_score(score: float) -> str:
    if score >= 0.8:
        return "high"
    if score <= 0.2:
        return "low"
    return "inconclusive"


def analyze_image(
    image_bytes: bytes,
    api_user: str,
    api_secret: str,
    timeout: int = 30,
) -> ImageAnalysis:
    content_type = validate_image(image_bytes)
    image_bytes, content_type = prepare_image_for_provider(image_bytes, content_type)

    def send(models: str) -> requests.Response:
        try:
            return requests.post(
                API_URL,
                data={"models": models, "api_user": api_user, "api_secret": api_secret},
                files={"media": ("upload", image_bytes, content_type)},
                timeout=timeout,
            )
        except requests.Timeout as exc:
            raise AnalysisError("timeout") from exc
        except requests.RequestException as exc:
            raise AnalysisError("network") from exc

    response = send("genai,deepfake")
    deepfake_requested = True
    if response.status_code in {400, 403}:
        response = send("genai")
        deepfake_requested = False
    if response.status_code in {401, 403}:
        raise AnalysisError("credentials")
    if response.status_code == 429:
        raise AnalysisError("rate_limit")
    if response.status_code >= 500:
        raise AnalysisError("unavailable")
    if response.status_code >= 400:
        raise AnalysisError("provider")
    try:
        payload = response.json()
        return ImageAnalysis(
            score=parse_score(payload),
            generator_scores=parse_generators(payload),
            deepfake_score=parse_deepfake(payload) if deepfake_requested else None,
            content_type=content_type,
        )
    except ValueError as exc:
        raise AnalysisError("invalid_response") from exc
