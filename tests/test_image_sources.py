import asyncio
from io import BytesIO
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from PIL import Image

from backend.app.analyzer import extract_image_metadata
from backend.app.image_sources import ImageSourceError, search_commons_images


def test_extract_image_metadata_returns_basic_fields_without_gps_coordinates():
    output = BytesIO()
    image = Image.new("RGB", (20, 20), color=(40, 60, 80))
    exif = image.getexif()
    exif[271] = "Canon"
    exif[272] = "EOS"
    exif[305] = "Photo Editor"
    exif[306] = "2025:11:22 12:34:56"
    image.save(output, format="JPEG", exif=exif)

    metadata = extract_image_metadata(output.getvalue())

    assert metadata == {
        "camera_make": "Canon",
        "camera_model": "EOS",
        "software": "Photo Editor",
        "captured_at": "2025:11:22 12:34:56",
        "gps_data_present": False,
    }


def test_commons_search_normalizes_results_and_strips_metadata_markup():
    response = httpx.Response(
        200,
        json={
            "query": {
                "pages": [
                    {
                        "title": "File:Example.jpg",
                        "imageinfo": [
                            {
                                "thumburl": "https://upload.wikimedia.org/example-thumb.jpg",
                                "descriptionurl": "https://commons.wikimedia.org/wiki/File:Example.jpg",
                                "extmetadata": {
                                    "LicenseShortName": {"value": "CC BY-SA 4.0"},
                                    "Artist": {"value": '<a href="https://example.test">Ada &amp; Bo</a>'},
                                },
                            }
                        ],
                    }
                ]
            }
        },
    )
    mock_get = AsyncMock(return_value=response)

    async def run():
        with patch("backend.app.image_sources.httpx.AsyncClient.get", new=mock_get):
            return await search_commons_images("example image", 3)

    result = asyncio.run(run())

    assert result["estado"] == "ok"
    assert result["resultados"] == [
        {
            "title": "File:Example.jpg",
            "thumbnail_url": "https://upload.wikimedia.org/example-thumb.jpg",
            "source_url": "https://commons.wikimedia.org/wiki/File:Example.jpg",
            "license": "CC BY-SA 4.0",
            "creator": "Ada & Bo",
        }
    ]
    assert mock_get.await_args.kwargs["params"]["gsrsearch"] == "example image"
    assert mock_get.await_args.kwargs["params"]["gsrlimit"] == 3


def test_commons_search_discards_non_wikimedia_result_urls():
    response = httpx.Response(
        200,
        json={
            "query": {
                "pages": [
                    {
                        "title": "File:External.jpg",
                        "imageinfo": [
                            {
                                "thumburl": "https://outside.example/image.jpg",
                                "descriptionurl": "https://commons.wikimedia.org/wiki/File:External.jpg",
                            }
                        ],
                    }
                ]
            }
        },
    )
    mock_get = AsyncMock(return_value=response)

    async def run():
        with patch("backend.app.image_sources.httpx.AsyncClient.get", new=mock_get):
            return await search_commons_images("external image")

    assert asyncio.run(run())["resultados"] == []


def test_commons_rate_limit_is_reported_explicitly():
    mock_get = AsyncMock(return_value=httpx.Response(429))

    async def run():
        with patch("backend.app.image_sources.httpx.AsyncClient.get", new=mock_get):
            with pytest.raises(ImageSourceError) as error:
                await search_commons_images("test image")
        return error.value

    failure = asyncio.run(run())

    assert failure.status_code == 429
    assert failure.detail == "commons_rate_limit"


def test_commons_rejects_an_error_payload_instead_of_reporting_no_matches():
    mock_get = AsyncMock(return_value=httpx.Response(200, json={"error": {"code": "badvalue"}}))

    async def run():
        with patch("backend.app.image_sources.httpx.AsyncClient.get", new=mock_get):
            with pytest.raises(ImageSourceError) as error:
                await search_commons_images("test image")
        return error.value

    failure = asyncio.run(run())

    assert failure.status_code == 502
    assert failure.detail == "commons_invalid_response"
