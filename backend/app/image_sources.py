from html.parser import HTMLParser
from typing import Any
from urllib.parse import urlparse

import httpx


COMMONS_API_URL = "https://commons.wikimedia.org/w/api.php"
COMMONS_USER_AGENT = (
    "Ektheto/1.3 (https://github.com/leoholding3-jpg/ektheto-ai)"
)


class ImageSourceError(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


class _PlainTextParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def _plain_text(metadata: Any, key: str) -> str | None:
    entry = metadata.get(key) if isinstance(metadata, dict) else None
    value = entry.get("value") if isinstance(entry, dict) else None
    if not isinstance(value, str):
        return None
    parser = _PlainTextParser()
    parser.feed(value)
    text = " ".join(" ".join(parser.parts).split())
    return text[:300] or None


def _safe_wikimedia_url(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    parsed = urlparse(value)
    hostname = (parsed.hostname or "").lower()
    if (
        parsed.scheme != "https"
        or not (hostname == "wikimedia.org" or hostname.endswith(".wikimedia.org"))
    ):
        return None
    return value


def _normalize_page(page: Any) -> dict[str, str] | None:
    if not isinstance(page, dict):
        return None
    imageinfo = page.get("imageinfo")
    if not isinstance(imageinfo, list) or not imageinfo or not isinstance(imageinfo[0], dict):
        return None
    info = imageinfo[0]
    thumbnail = _safe_wikimedia_url(info.get("thumburl") or info.get("url"))
    source = _safe_wikimedia_url(info.get("descriptionurl"))
    if not thumbnail or not source:
        return None
    metadata = info.get("extmetadata")
    result = {
        "title": str(page.get("title", "Wikimedia Commons"))[:250],
        "thumbnail_url": thumbnail,
        "source_url": source,
    }
    for key, field in (("LicenseShortName", "license"), ("Artist", "creator")):
        value = _plain_text(metadata, key)
        if value:
            result[field] = value
    return result


async def search_commons_images(query: str, limit: int = 5) -> dict[str, Any]:
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": query,
        "gsrnamespace": 6,
        "gsrlimit": min(max(limit, 1), 5),
        "prop": "imageinfo",
        "iiprop": "url|extmetadata",
        "iiurlwidth": 360,
        "format": "json",
        "formatversion": 2,
    }
    try:
        async with httpx.AsyncClient(
            timeout=10.0,
            headers={"Accept": "application/json", "User-Agent": COMMONS_USER_AGENT},
        ) as client:
            response = await client.get(COMMONS_API_URL, params=params)
    except httpx.TimeoutException as exc:
        raise ImageSourceError(504, "commons_timeout") from exc
    except httpx.RequestError as exc:
        raise ImageSourceError(502, "commons_unavailable") from exc

    if response.status_code == 429:
        raise ImageSourceError(429, "commons_rate_limit")
    if response.status_code in {401, 403}:
        raise ImageSourceError(503, "commons_access_denied")
    if response.status_code != 200:
        raise ImageSourceError(502, "commons_upstream_error")
    try:
        payload = response.json()
    except ValueError as exc:
        raise ImageSourceError(502, "commons_invalid_response") from exc
    if not isinstance(payload, dict) or payload.get("error"):
        raise ImageSourceError(502, "commons_invalid_response")
    query_data = payload.get("query")
    if not isinstance(query_data, dict):
        raise ImageSourceError(502, "commons_invalid_response")
    pages = query_data.get("pages", [])
    if not isinstance(pages, list):
        raise ImageSourceError(502, "commons_invalid_response")

    results = [
        result
        for page in pages
        if (result := _normalize_page(page)) is not None
    ]
    return {
        "estado": "ok",
        "fonte": "Wikimedia Commons",
        "resultados": results[:params["gsrlimit"]],
    }
