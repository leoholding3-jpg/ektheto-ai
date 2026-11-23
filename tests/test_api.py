from io import BytesIO
from unittest.mock import AsyncMock, patch

import httpx
from PIL import Image
from fastapi.testclient import TestClient

from backend.app.main import app, settings
from backend.app.bug_registry import make_signature


client = TestClient(app)


def make_image() -> bytes:
    output = BytesIO()
    Image.new("RGB", (20, 20), color=(40, 60, 80)).save(output, format="PNG")
    return output.getvalue()


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_public_config():
    response = client.get("/api/config/public")
    assert response.status_code == 200
    assert "supabase_url" in response.json()


def test_nasa_tool_schemas_are_available_without_exposing_api_key():
    response = client.get("/api/nasa/tools")

    assert response.status_code == 200
    names = [tool["function"]["name"] for tool in response.json()]
    assert names == ["obter_foto_astronomia_do_dia", "buscar_asteroides_proximos"]
    assert settings.nasa_api_key not in response.text


def test_nasa_apod_endpoint_normalizes_response_and_keeps_key_server_side():
    nasa_response = httpx.Response(
        200,
        json={
            "title": "Nebula",
            "date": "2025-11-22",
            "explanation": "A NASA astronomy image.",
            "url": "https://images.example.test/apod.jpg",
        },
    )
    mock_get = AsyncMock(return_value=nasa_response)
    with patch.object(settings, "nasa_api_key", "test-nasa-key"), patch(
        "backend.app.nasa.httpx.AsyncClient.get",
        new=mock_get,
    ):
        response = client.get("/api/nasa/apod", params={"date": "2025-11-22"})

    assert response.status_code == 200
    assert response.json() == {
        "titulo": "Nebula",
        "data": "2025-11-22",
        "explicacao": "A NASA astronomy image.",
        "url_imagem": "https://images.example.test/apod.jpg",
    }
    assert mock_get.await_args.kwargs["params"]["api_key"] == "test-nasa-key"
    assert "test-nasa-key" not in response.text


def test_nasa_rate_limit_is_returned_and_registered(caplog):
    mock_get = AsyncMock(return_value=httpx.Response(429, json={"error": "quota"}))
    with patch("backend.app.nasa.httpx.AsyncClient.get", new=mock_get):
        response = client.get("/api/nasa/apod")

    assert response.status_code == 429
    assert response.json()["detail"] == "nasa_rate_limit"
    assert settings.nasa_api_key not in response.text
    assert "registered_bug=" in caplog.text
    assert '"status": 429' in caplog.text
    assert "upstream_rate_limit" in caplog.text


def test_nasa_asteroid_endpoint_enforces_seven_day_range_before_request():
    mock_get = AsyncMock()
    with patch("backend.app.nasa.httpx.AsyncClient.get", new=mock_get):
        response = client.get(
            "/api/nasa/asteroids",
            params={"start_date": "2025-11-01", "end_date": "2025-11-09"},
        )

    assert response.status_code == 422
    assert response.json()["detail"] == "nasa_date_range_exceeds_7_days"
    mock_get.assert_not_awaited()


def test_nasa_asteroid_endpoint_returns_total_and_summary():
    mock_get = AsyncMock(return_value=httpx.Response(200, json={"element_count": 3}))
    with patch.object(settings, "nasa_api_key", "test-nasa-key"), patch(
        "backend.app.nasa.httpx.AsyncClient.get",
        new=mock_get,
    ):
        response = client.get(
            "/api/nasa/asteroids",
            params={"start_date": "2025-11-01", "end_date": "2025-11-07"},
        )

    assert response.status_code == 200
    assert response.json() == {
        "total_asteroides": 3,
        "resumo": "Foram detetados 3 asteroides próximos da Terra entre 2025-11-01 e 2025-11-07.",
    }
    assert mock_get.await_args.kwargs["params"]["api_key"] == "test-nasa-key"


def test_nasa_tool_execution_dispatches_to_apod():
    mock_get = AsyncMock(
        return_value=httpx.Response(
            200,
            json={
                "title": "Nebula",
                "date": "2025-11-22",
                "explanation": "A NASA astronomy image.",
                "url": "https://images.example.test/apod.jpg",
            },
        )
    )
    with patch("backend.app.nasa.httpx.AsyncClient.get", new=mock_get):
        response = client.post(
            "/api/nasa/tools/execute",
            json={
                "name": "obter_foto_astronomia_do_dia",
                "arguments": {"data": "2025-11-22"},
            },
        )

    assert response.status_code == 200
    assert response.json()["titulo"] == "Nebula"
    assert mock_get.await_args.kwargs["params"]["date"] == "2025-11-22"


def test_news_tool_schema_is_available():
    response = client.get("/api/news/tools")

    assert response.status_code == 200
    assert response.json()[0]["function"]["name"] == "pesquisar_noticias_na_hora"


def test_request_validation_error_is_registered_once(caplog):
    response = client.post("/api/news/search", json={})

    assert response.status_code == 422
    records = [
        line for line in caplog.text.splitlines() if "registered_bug=" in line
    ]
    assert len(records) == 1
    assert '"exception_type": "RequestValidationError"' in records[0]


def test_news_search_aggregates_providers_and_registers_partial_failures(caplog):
    async def fake_get(url, params=None, headers=None):
        if url == "https://api.gdeltproject.org/api/v2/doc/doc":
            return httpx.Response(
                200,
                json={
                    "articles": [
                        {
                            "domain": "gdelt.example",
                            "title": "GDELT headline",
                            "url": "https://gdelt.example/story",
                        }
                    ]
                },
            )
        if url == "https://newsdata.io/api/1/latest":
            return httpx.Response(
                200,
                json={
                    "results": [
                        {
                            "source_id": "newsdata-source",
                            "title": "NewsData headline",
                            "link": "https://newsdata.example/story",
                        }
                    ]
                },
            )
        if url == "https://gnews.io/api/v4/search":
            return httpx.Response(429, json={"errors": ["quota"]})
        if url == "https://newsapi.org/v2/everything":
            return httpx.Response(
                200,
                json={
                    "articles": [
                        {
                            "source": {"name": "NewsAPI source"},
                            "title": "NewsAPI headline",
                            "url": "https://newsapi.example/story",
                        }
                    ]
                },
            )
        raise AssertionError(f"Unexpected news provider URL: {url}")

    mock_get = AsyncMock(side_effect=fake_get)
    with (
        patch.object(settings, "newsdata_api_key", "test-newsdata-key"),
        patch.object(settings, "gnews_api_key", "test-gnews-key"),
        patch.object(settings, "newsapi_api_key", "test-newsapi-key"),
        patch("backend.app.news.httpx.AsyncClient.get", new=mock_get),
    ):
        response = client.post(
            "/api/news/search",
            json={"tema": "Angola tecnologia", "pais": "ao", "limite": 5},
        )

    assert response.status_code == 200
    providers = response.json()["provedores"]
    assert providers["gdelt"]["artigos"][0]["titulo"] == "GDELT headline"
    assert providers["newsdata"]["artigos"][0]["fonte"] == "newsdata-source"
    assert providers["gnews"] == {
        "estado": "erro",
        "artigos": [],
        "codigo": "limite_de_pedidos",
    }
    assert providers["newsapi"]["artigos"][0]["fonte"] == "NewsAPI source"
    assert "test-newsdata-key" not in response.text
    assert "test-gnews-key" not in response.text
    assert "test-newsapi-key" not in response.text
    assert "registered_bug=" in caplog.text
    assert '"provider": "gnews"' in caplog.text
    assert '"status": 429' in caplog.text


def test_news_tool_execution_uses_gdelt_when_optional_keys_are_missing():
    mock_get = AsyncMock(
        return_value=httpx.Response(
            200,
            json={
                "articles": [
                    {
                        "domain": "gdelt.example",
                        "title": "Technology headline",
                        "url": "https://gdelt.example/story",
                    }
                ]
            },
        )
    )
    with (
        patch.object(settings, "newsdata_api_key", ""),
        patch.object(settings, "gnews_api_key", ""),
        patch.object(settings, "newsapi_api_key", ""),
        patch("backend.app.news.httpx.AsyncClient.get", new=mock_get),
    ):
        response = client.post(
            "/api/news/tools/execute",
            json={
                "name": "pesquisar_noticias_na_hora",
                "arguments": {"tema": "tecnologia", "pais": "br"},
            },
        )

    assert response.status_code == 200
    providers = response.json()["provedores"]
    assert providers["gdelt"]["estado"] == "ok"
    assert providers["newsdata"]["estado"] == "nao_configurado"
    assert providers["gnews"]["estado"] == "nao_configurado"
    assert providers["newsapi"]["estado"] == "nao_configurado"
    assert mock_get.await_count == 1


def test_frontend_is_served():
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert b"Ektheto" in response.content
    assert b"auth-dialog" not in response.content
    assert b"account-button" not in response.content
    assert b"supabase-js" not in response.content
    app_js = client.get("/app.js")
    assert app_js.status_code == 200
    assert b"100 MB" in app_js.content
    assert b"data-tutorial-action" in app_js.content
    assert b"radar-map-card" in app_js.content
    world_map = client.get("/assets/world-map.svg")
    assert world_map.status_code == 200
    assert world_map.headers["content-type"] == "image/svg+xml"
    assert world_map.content.count(b'class="country"') > 150
    assert b'data-country="BRA"' in world_map.content
    assert b'data-country="AGO"' in world_map.content
    assert b'data-country="PRT"' in world_map.content
    assert b"radar-country-color" in app_js.content
    assert b"radar-map-export" in app_js.content


def test_image_validation_accepts_files_larger_than_50mb():
    from backend.app.analyzer import validate_image

    data = make_image() + bytes(52 * 1024 * 1024)
    assert validate_image(data) == "image/png"


def test_large_images_are_optimized_for_analysis_without_changing_original():
    from backend.app.analyzer import (
        MAX_PROVIDER_IMAGE_BYTES,
        prepare_image_for_provider,
    )

    original = make_image() + bytes(11 * 1024 * 1024)
    original_size = len(original)
    prepared, content_type = prepare_image_for_provider(original, "image/png")

    assert content_type == "image/jpeg"
    assert len(prepared) <= MAX_PROVIDER_IMAGE_BYTES
    assert len(original) == original_size


def test_image_analysis_works_without_account():
    from backend.app.analyzer import ImageAnalysis
    from backend.app.main import settings

    with patch.object(settings, "sightengine_user", "test-user"), patch.object(
        settings, "sightengine_secret", "test-secret"
    ), patch("backend.app.main.analyze_image", return_value=ImageAnalysis(score=0.87, deepfake_score=0.12)):
        response = client.post(
            "/api/analyze",
            files={"file": ("image.png", make_image(), "image/png")},
        )

    assert response.status_code == 200
    assert response.json()["score"] == 0.87
    assert response.json()["deepfake_score"] == 0.12


def test_bug_signature_is_deterministic():
    first = make_signature("POST", "/api/analyze", 422, {"field": "file"})
    second = make_signature("POST", "/api/analyze", 422, {"field": "file"})
    assert first == second
