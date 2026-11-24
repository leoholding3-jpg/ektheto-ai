import asyncio
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError

from .analyzer import (
    MAX_IMAGE_BYTES,
    AnalysisError,
    analyze_image,
    classify_score,
    extract_image_metadata,
)
from .config import get_settings
from .gemini import GeminiServiceError, analyze_image_with_gemini
from .image_sources import ImageSourceError, search_commons_images
from .news import NEWS_TOOLS_SCHEMA, NewsServiceError, execute_news_tool, pesquisar_noticias_na_hora
from .schemas import ImageInvestigationSourcesRequest, NewsSearchRequest, NewsToolInvocation
from .bug_registry import record_bug, bug_registry_middleware

settings = get_settings()
ROOT_DIR = Path(__file__).resolve().parents[2]
FRONTEND_DIR = ROOT_DIR / "frontend"

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


def _request_id(request: Request) -> str:
    return (
        request.headers.get("x-request-id")
        or getattr(request.state, "request_id", None)
        or str(uuid.uuid4())
    )


@app.middleware("http")
async def bug_middleware(request: Request, call_next):
    return await bug_registry_middleware(request, call_next)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = jsonable_encoder(exc.errors())
    log_errors = [
        {key: value for key, value in error.items() if key not in {"input", "ctx"}}
        for error in errors
    ]
    request_id = (
        request.headers.get("x-request-id")
        or getattr(request.state, "request_id", None)
        or str(uuid.uuid4())
    )
    await record_bug(
        method=request.method,
        path=request.url.path,
        status=422,
        detail={"errors": log_errors},
        exception_type="RequestValidationError",
        request_id=request_id,
    )
    request.state.bug_recorded = True
    return JSONResponse(
        status_code=422,
        content={"detail": errors, "request_id": request_id},
    )


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "environment": settings.environment,
        "image_analysis_configured": bool(
            settings.sightengine_user and settings.sightengine_secret
        ),
    }


async def _record_news_provider_errors(request: Request, result: dict):
    status_by_code = {
        "limite_de_pedidos": 429,
        "timeout": 504,
        "chave_invalida": 503,
        "indisponivel": 502,
        "pedido_rejeitado": 502,
        "servico_indisponivel": 502,
        "resposta_invalida": 502,
    }
    request_id = _request_id(request)
    for provider, outcome in result["provedores"].items():
        if outcome["estado"] != "erro":
            continue
        code = outcome["codigo"]
        await record_bug(
            method=request.method,
            path=request.url.path,
            status=status_by_code[code],
            detail={"provider": provider, "error": code},
            request_id=request_id,
        )


@app.get("/api/news/tools")
async def news_tools():
    return NEWS_TOOLS_SCHEMA


@app.post("/api/news/search")
async def news_search(payload: NewsSearchRequest, request: Request):
    result = await pesquisar_noticias_na_hora(
        payload.tema,
        payload.pais,
        payload.limite,
        settings.newsdata_api_key,
        settings.gnews_api_key,
        settings.newsapi_api_key,
    )
    await _record_news_provider_errors(request, result)
    return result


@app.post("/api/investigation/sources")
async def investigation_sources(
    payload: ImageInvestigationSourcesRequest,
    request: Request,
):
    image_search, news_search = await asyncio.gather(
        search_commons_images(payload.query, payload.limite),
        pesquisar_noticias_na_hora(
            payload.query,
            payload.pais,
            payload.limite,
            settings.newsdata_api_key,
            settings.gnews_api_key,
            settings.newsapi_api_key,
        ),
        return_exceptions=True,
    )
    if isinstance(image_search, BaseException):
        if not isinstance(image_search, ImageSourceError):
            raise image_search
        image_results = {
            "estado": "erro",
            "fonte": "Wikimedia Commons",
            "codigo": image_search.detail,
            "resultados": [],
        }
        await record_bug(
            method=request.method,
            path=request.url.path,
            status=image_search.status_code,
            detail={"provider": "wikimedia_commons", "error": image_search.detail},
            request_id=_request_id(request),
        )
    else:
        image_results = image_search
    if isinstance(news_search, BaseException):
        raise news_search
    await _record_news_provider_errors(request, news_search)
    return {
        "consulta": payload.query,
        "imagens": image_results,
        "noticias": news_search,
        "nota": "A pesquisa envia apenas o texto da consulta; a imagem não é enviada.",
    }


@app.post("/api/news/tools/execute")
async def news_tool(payload: NewsToolInvocation, request: Request):
    try:
        result = await execute_news_tool(
            payload.name,
            payload.arguments,
            settings.newsdata_api_key,
            settings.gnews_api_key,
            settings.newsapi_api_key,
        )
    except NewsServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    await _record_news_provider_errors(request, result)
    return result


@app.post("/api/analyze")
async def analyze(
    request: Request,
    file: UploadFile = File(...),
    use_gemini: bool = Form(default=False),
    language: str = Form(default="pt"),
):
    image_bytes = await file.read(MAX_IMAGE_BYTES + 1)
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="image_too_large")
    if not settings.sightengine_user or not settings.sightengine_secret:
        raise HTTPException(status_code=503, detail="analysis_not_configured")
    try:
        result = analyze_image(
            image_bytes,
            settings.sightengine_user,
            settings.sightengine_secret,
        )
    except ValueError as exc:
        code = str(exc) or "invalid"
        status = 413 if code == "size" else 422
        raise HTTPException(status_code=status, detail=code) from exc
    except AnalysisError as exc:
        status = {
            "credentials": 503,
            "rate_limit": 429,
            "unavailable": 503,
            "timeout": 504,
            "network": 502,
        }.get(str(exc), 502)
        raise HTTPException(status_code=status, detail=str(exc)) from exc

    gemini_result = None
    if use_gemini:
        try:
            assessment = await analyze_image_with_gemini(
                image_bytes,
                settings.gemini_api_key,
                settings.gemini_model,
                language if language in {"pt", "en", "es"} else "pt",
            )
            gemini_result = {"estado": "ok", "avaliacao": assessment}
        except GeminiServiceError as exc:
            gemini_result = {"estado": "erro", "codigo": exc.detail}
            await record_bug(
                method=request.method,
                path=request.url.path,
                status=exc.status_code,
                detail={"provider": "gemini", "error": exc.detail},
                request_id=_request_id(request),
            )

    return {
        "score": result.score,
        "verdict": classify_score(result.score),
        "generator_scores": [
            {"name": name, "score": score}
            for name, score in result.generator_scores
        ],
        "deepfake_score": result.deepfake_score,
        "metadata": extract_image_metadata(image_bytes),
        "gemini": gemini_result,
        "disclaimer": "Model scores are estimates and do not prove image authenticity.",
    }


@app.get("/", include_in_schema=False)
def frontend() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


app.mount("/", StaticFiles(directory=FRONTEND_DIR), name="frontend-assets")
