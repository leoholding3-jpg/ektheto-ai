import asyncio
from typing import Any
from urllib.parse import urlparse

import httpx
from pydantic import ValidationError

from .schemas import NewsSearchRequest


GDELT_URL = "https://api.gdeltproject.org/api/v2/doc/doc"
NEWSDATA_URL = "https://newsdata.io/api/1/latest"
GNEWS_URL = "https://gnews.io/api/v4/search"
NEWSAPI_URL = "https://newsapi.org/v2/everything"

NEWS_TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "pesquisar_noticias_na_hora",
            "description": "Pesquisa notícias recentes em português em várias fontes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "tema": {
                        "type": "string",
                        "minLength": 2,
                        "maxLength": 200,
                        "description": "Tema ou palavras-chave da pesquisa.",
                    },
                    "pais": {
                        "type": "string",
                        "enum": ["ao", "br", "pt"],
                        "default": "ao",
                        "description": "País para a pesquisa NewsData: Angola, Brasil ou Portugal.",
                    },
                    "limite": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 5,
                        "default": 5,
                        "description": "Número máximo de artigos por fonte.",
                    },
                },
                "required": ["tema"],
                "additionalProperties": False,
            },
        },
    }
]


class NewsServiceError(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def _provider_result(state: str, articles: list[dict[str, str]] | None = None, code: str | None = None):
    result: dict[str, Any] = {"estado": state, "artigos": articles or []}
    if code:
        result["codigo"] = code
    return result


def _normalize_article(article: Any, provider: str) -> dict[str, str] | None:
    if not isinstance(article, dict):
        return None

    if provider == "gdelt":
        source = article.get("domain")
        title = article.get("title")
        url = article.get("url")
    elif provider == "newsdata":
        source = article.get("source_id")
        title = article.get("title")
        url = article.get("link")
    else:
        source_data = article.get("source")
        source = source_data.get("name") if isinstance(source_data, dict) else None
        title = article.get("title")
        url = article.get("url")

    if not isinstance(title, str) or not title.strip() or not isinstance(url, str):
        return None
    parsed_url = urlparse(url)
    if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
        return None
    if not isinstance(source, str) or not source.strip():
        source = parsed_url.netloc
    return {"fonte": source, "titulo": title, "url": url}


async def _fetch_articles(
    client: httpx.AsyncClient,
    provider: str,
    url: str,
    params: dict[str, Any],
    articles_field: str,
    limit: int,
    api_key: str | None = None,
    key_parameter: str | None = None,
    headers: dict[str, str] | None = None,
) -> dict[str, Any]:
    if api_key is not None and not api_key.strip():
        return _provider_result("nao_configurado")

    request_params = dict(params)
    if api_key and key_parameter:
        request_params[key_parameter] = api_key

    try:
        response = await client.get(url, params=request_params, headers=headers)
    except httpx.TimeoutException:
        return _provider_result("erro", code="timeout")
    except httpx.RequestError:
        return _provider_result("erro", code="indisponivel")

    if response.status_code == 429:
        return _provider_result("erro", code="limite_de_pedidos")
    if response.status_code in {401, 403}:
        return _provider_result("erro", code="chave_invalida")
    if response.status_code in {400, 422}:
        return _provider_result("erro", code="pedido_rejeitado")
    if response.status_code != 200:
        return _provider_result("erro", code="servico_indisponivel")

    try:
        payload = response.json()
    except ValueError:
        return _provider_result("erro", code="resposta_invalida")
    if not isinstance(payload, dict) or payload.get("status") == "error":
        return _provider_result("erro", code="resposta_invalida")

    articles = payload.get(articles_field)
    if not isinstance(articles, list):
        return _provider_result("erro", code="resposta_invalida")
    normalized = [
        normalized_article
        for article in articles
        if (normalized_article := _normalize_article(article, provider)) is not None
    ]
    return _provider_result("ok", normalized[:limit])


async def buscar_gdelt(
    client: httpx.AsyncClient,
    tema: str,
    limite: int,
) -> dict[str, Any]:
    return await _fetch_articles(
        client,
        "gdelt",
        GDELT_URL,
        {
            "query": f"{tema} sourcelang:portuguese",
            "mode": "ArtList",
            "maxrecords": limite,
            "format": "json",
            "sort": "DateDesc",
        },
        "articles",
        limite,
    )


async def buscar_newsdata(
    client: httpx.AsyncClient,
    tema: str,
    pais: str,
    limite: int,
    api_key: str,
) -> dict[str, Any]:
    return await _fetch_articles(
        client,
        "newsdata",
        NEWSDATA_URL,
        {"q": tema, "country": pais, "language": "pt"},
        "results",
        limite,
        api_key=api_key,
        key_parameter="apikey",
    )


async def buscar_gnews(
    client: httpx.AsyncClient,
    tema: str,
    limite: int,
    api_key: str,
) -> dict[str, Any]:
    return await _fetch_articles(
        client,
        "gnews",
        GNEWS_URL,
        {"q": tema, "lang": "pt", "max": limite},
        "articles",
        limite,
        api_key=api_key,
        key_parameter="apikey",
    )


async def buscar_newsapi(
    client: httpx.AsyncClient,
    tema: str,
    limite: int,
    api_key: str,
) -> dict[str, Any]:
    return await _fetch_articles(
        client,
        "newsapi",
        NEWSAPI_URL,
        {"q": tema, "language": "pt", "sortBy": "publishedAt", "pageSize": limite},
        "articles",
        limite,
        api_key=api_key,
        headers={"X-Api-Key": api_key} if api_key.strip() else None,
    )


async def pesquisar_noticias_na_hora(
    tema: str,
    pais: str,
    limite: int,
    newsdata_api_key: str,
    gnews_api_key: str,
    newsapi_api_key: str,
) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=10.0, headers={"Accept": "application/json"}) as client:
        gdelt, newsdata, gnews, newsapi = await asyncio.gather(
            buscar_gdelt(client, tema, limite),
            buscar_newsdata(client, tema, pais, limite, newsdata_api_key),
            buscar_gnews(client, tema, limite, gnews_api_key),
            buscar_newsapi(client, tema, limite, newsapi_api_key),
        )
    return {
        "tema": tema,
        "pais": pais,
        "provedores": {
            "gdelt": gdelt,
            "newsdata": newsdata,
            "gnews": gnews,
            "newsapi": newsapi,
        },
    }


async def execute_news_tool(
    name: str,
    arguments: dict[str, Any],
    newsdata_api_key: str,
    gnews_api_key: str,
    newsapi_api_key: str,
) -> dict[str, Any]:
    if name != "pesquisar_noticias_na_hora":
        raise NewsServiceError(404, "news_tool_not_found")
    try:
        request = NewsSearchRequest.model_validate(arguments)
    except ValidationError as exc:
        raise NewsServiceError(422, "invalid_news_arguments") from exc
    return await pesquisar_noticias_na_hora(
        request.tema,
        request.pais,
        request.limite,
        newsdata_api_key,
        gnews_api_key,
        newsapi_api_key,
    )
