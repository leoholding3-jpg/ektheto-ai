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


def test_validation_error_logs_do_not_include_submitted_values(caplog):
    private_query = "private-user-search-term"
    response = client.post(
        "/api/investigation/sources",
        json={"query": private_query * 10},
    )

    assert response.status_code == 422
    assert private_query not in caplog.text


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


def test_investigation_sources_combines_text_only_image_and_news_searches():
    images = {
        "estado": "ok",
        "fonte": "Wikimedia Commons",
        "resultados": [
            {
                "title": "File: Example.jpg",
                "thumbnail_url": "https://upload.wikimedia.org/example.jpg",
                "source_url": "https://commons.wikimedia.org/wiki/File:Example.jpg",
                "license": "CC BY-SA 4.0",
            }
        ],
    }
    news = {
        "tema": "street poster",
        "pais": "ao",
        "provedores": {
            "gdelt": {"estado": "ok", "artigos": []},
            "newsdata": {"estado": "nao_configurado", "artigos": []},
            "gnews": {"estado": "nao_configurado", "artigos": []},
            "newsapi": {"estado": "nao_configurado", "artigos": []},
        },
    }
    with (
        patch("backend.app.main.search_commons_images", new=AsyncMock(return_value=images)) as mock_images,
        patch("backend.app.main.pesquisar_noticias_na_hora", new=AsyncMock(return_value=news)) as mock_news,
    ):
        response = client.post(
            "/api/investigation/sources",
            json={"query": "street poster", "pais": "ao", "limite": 3},
        )

    assert response.status_code == 200
    assert response.json()["imagens"] == images
    assert response.json()["noticias"] == news
    assert "a imagem não é enviada" in response.json()["nota"]
    mock_images.assert_awaited_once_with("street poster", 3)
    assert mock_news.await_args.args[:3] == ("street poster", "ao", 3)


def test_investigation_sources_keeps_news_results_when_wikimedia_is_unavailable():
    from backend.app.image_sources import ImageSourceError

    news = {"provedores": {"gdelt": {"estado": "ok", "artigos": []}}}
    with (
        patch(
            "backend.app.main.search_commons_images",
            new=AsyncMock(side_effect=ImageSourceError(504, "commons_timeout")),
        ),
        patch("backend.app.main.pesquisar_noticias_na_hora", new=AsyncMock(return_value=news)),
    ):
        response = client.post(
            "/api/investigation/sources",
            json={"query": "Angola tecnologia"},
        )

    assert response.status_code == 200
    assert response.json()["imagens"]["codigo"] == "commons_timeout"
    assert response.json()["noticias"] == news


def test_investigation_sources_validates_query_length():
    for query in ("x", "   "):
        response = client.post("/api/investigation/sources", json={"query": query})
        assert response.status_code == 422


def test_frontend_is_served():
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert b"Ektheto" in response.content
    assert response.content.index(b"/config.js") < response.content.index(b"/app.js")
    config = client.get("/config.js")
    assert config.status_code == 200
    assert b'window.EKTHETO_API_BASE_URL = "";' in config.content
    assert b"auth-dialog" not in response.content
    assert b"account-button" not in response.content
    assert client.get("/api/config/public").status_code == 404
    assert client.get("/api/nasa/tools").status_code == 404
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
    assert b"exemplo.com/foto-falsa" not in app_js.content
    assert "Pesquisar imagens e notícias relacionadas".encode() in app_js.content


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
    ), patch("backend.app.main.analyze_image", return_value=ImageAnalysis(score=0.87, deepfake_score=0.12)), patch(
        "backend.app.main.analyze_image_with_gemini", new_callable=AsyncMock
    ) as mock_gemini:
        response = client.post(
            "/api/analyze",
            files={"file": ("image.png", make_image(), "image/png")},
        )

    assert response.status_code == 200
    assert response.json()["score"] == 0.87
    assert response.json()["deepfake_score"] == 0.12
    assert response.json()["metadata"]["gps_data_present"] is False
    assert response.json()["gemini"] is None
    mock_gemini.assert_not_awaited()


def test_image_analysis_runs_gemini_only_after_explicit_opt_in():
    from backend.app.analyzer import ImageAnalysis

    assessment = {
        "descricao": "A street scene.",
        "texto_visivel": [],
        "pistas_visuais": ["A sign is partly obscured."],
        "hipoteses": [],
        "verificacoes_sugeridas": ["Find the original post."],
        "limitacoes": "The image alone cannot confirm its origin.",
    }
    mock_gemini = AsyncMock(return_value=assessment)
    with (
        patch.object(settings, "sightengine_user", "test-user"),
        patch.object(settings, "sightengine_secret", "test-secret"),
        patch.object(settings, "gemini_api_key", "test-gemini-key"),
        patch.object(settings, "gemini_model", "gemini-3.6-flash"),
        patch(
            "backend.app.main.analyze_image",
            return_value=ImageAnalysis(score=0.87, deepfake_score=0.12),
        ),
        patch("backend.app.main.analyze_image_with_gemini", new=mock_gemini),
    ):
        response = client.post(
            "/api/analyze",
            files={"file": ("image.png", make_image(), "image/png")},
            data={"use_gemini": "true", "language": "en"},
        )

    assert response.status_code == 200
    assert response.json()["score"] == 0.87
    assert response.json()["gemini"] == {"estado": "ok", "avaliacao": assessment}
    mock_gemini.assert_awaited_once()
    assert mock_gemini.await_args.args[1:] == (
        "test-gemini-key",
        "gemini-3.6-flash",
        "en",
    )


def test_gemini_failure_keeps_sightengine_result_and_registers_provider_error(caplog):
    from backend.app.analyzer import ImageAnalysis
    from backend.app.gemini import GeminiServiceError

    with (
        patch.object(settings, "sightengine_user", "test-user"),
        patch.object(settings, "sightengine_secret", "test-secret"),
        patch.object(settings, "gemini_api_key", "test-gemini-key"),
        patch(
            "backend.app.main.analyze_image",
            return_value=ImageAnalysis(score=0.87, deepfake_score=0.12),
        ),
        patch(
            "backend.app.main.analyze_image_with_gemini",
            new=AsyncMock(side_effect=GeminiServiceError(429, "gemini_rate_limit")),
        ),
    ):
        response = client.post(
            "/api/analyze",
            files={"file": ("image.png", make_image(), "image/png")},
            data={"use_gemini": "true"},
        )

    assert response.status_code == 200
    assert response.json()["score"] == 0.87
    assert response.json()["gemini"] == {
        "estado": "erro",
        "codigo": "gemini_rate_limit",
    }
    assert '"provider": "gemini"' in caplog.text


def test_bug_signature_is_deterministic():
    first = make_signature("POST", "/api/analyze", 422, {"field": "file"})
    second = make_signature("POST", "/api/analyze", 422, {"field": "file"})
    assert first == second
