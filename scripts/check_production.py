import json
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


API_BASE_URL = "https://ektheto-api.onrender.com"
FRONTEND_ORIGIN = "https://ektheto.netlify.app"
PROJECT_ROOT = Path(__file__).resolve().parents[1]


def open_url(request: Request):
    try:
        return urlopen(request, timeout=90)
    except HTTPError as exc:
        raise RuntimeError(f"HTTP {exc.code} for {request.full_url}") from exc
    except (URLError, TimeoutError) as exc:
        raise RuntimeError(f"Could not reach {request.full_url}: {exc}") from exc


def check_render_health() -> None:
    request = Request(f"{API_BASE_URL}/api/health")
    with open_url(request) as response:
        payload = json.loads(response.read())

    if payload.get("status") != "ok":
        raise RuntimeError("Render health check did not report status=ok")
    if payload.get("image_analysis_configured") is not True:
        raise RuntimeError(
            "Render is reachable, but SIGHTENGINE_USER or SIGHTENGINE_SECRET is missing"
        )
    print("PASS: Render API is healthy and image-analysis credentials are configured")


def check_netlify_cors() -> None:
    request = Request(
        f"{API_BASE_URL}/api/analyze",
        headers={
            "Origin": FRONTEND_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
        method="OPTIONS",
    )
    with open_url(request) as response:
        allowed_origin = response.headers.get("Access-Control-Allow-Origin")

    if allowed_origin != FRONTEND_ORIGIN:
        raise RuntimeError(
            f"Render CORS does not allow the configured frontend origin: {FRONTEND_ORIGIN}"
        )
    print("PASS: Render CORS allows the Netlify frontend")


def check_frontend_api_url() -> None:
    config_path = PROJECT_ROOT / "frontend" / "config.js"
    if API_BASE_URL not in config_path.read_text(encoding="utf-8"):
        raise RuntimeError(
            "frontend/config.js does not point to the configured Render API"
        )
    print("PASS: Frontend configuration points to the Render API")


def main() -> None:
    check_frontend_api_url()
    check_render_health()
    check_netlify_cors()


if __name__ == "__main__":
    main()
