from pathlib import Path
import uuid
from datetime import date

from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.exception_handlers import http_exception_handler
from fastapi import HTTPException
from fastapi.middleware import Middleware
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy import text

from .analyzer import (
    MAX_IMAGE_BYTES,
    AnalysisError,
    analyze_image,
    classify_score,
)
from .auth import get_current_user
from .config import get_settings
from .database import engine, get_db
from .nasa import (
    NASA_TOOLS_SCHEMA,
    NasaServiceError,
    buscar_asteroides_proximos,
    execute_nasa_tool,
    obter_foto_astronomia_do_dia,
)
from .news import NEWS_TOOLS_SCHEMA, NewsServiceError, execute_news_tool, pesquisar_noticias_na_hora
from .schemas import (
    InvestigationCreate,
    IntegrationUpdate,
    NasaToolInvocation,
    NewsSearchRequest,
    NewsToolInvocation,
    SettingUpdate,
)
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


@app.middleware("http")
async def bug_middleware(request: Request, call_next):
    return await bug_registry_middleware(request, call_next)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = (
        request.headers.get("x-request-id")
        or getattr(request.state, "request_id", None)
        or str(uuid.uuid4())
    )
    await record_bug(
        method=request.method,
        path=request.url.path,
        status=422,
        detail={"errors": exc.errors()},
        exception_type="RequestValidationError",
        request_id=request_id,
    )
    request.state.bug_recorded = True
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "request_id": request_id},
    )


@app.get("/api/health")
async def health():
    database = "not_configured"
    if engine is not None:
        try:
            async with engine.connect() as connection:
                await connection.execute(text("select 1"))
            database = "ok"
        except Exception:
            database = "error"
    return {
        "status": "ok",
        "environment": settings.environment,
        "database": database,
    }


@app.get("/api/config/public")
async def public_config():
    return {
        "supabase_url": settings.supabase_url,
        "supabase_anon_key": settings.supabase_anon_key,
    }


@app.get("/api/nasa/tools")
async def nasa_tools():
    return NASA_TOOLS_SCHEMA


@app.get("/api/nasa/apod")
async def nasa_apod(apod_date: date | None = Query(default=None, alias="date")):
    try:
        return await obter_foto_astronomia_do_dia(settings.nasa_api_key, apod_date)
    except NasaServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@app.get("/api/nasa/asteroids")
async def nasa_asteroids(start_date: date, end_date: date):
    try:
        return await buscar_asteroides_proximos(
            settings.nasa_api_key,
            start_date,
            end_date,
        )
    except NasaServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@app.post("/api/nasa/tools/execute")
async def nasa_tool(payload: NasaToolInvocation):
    try:
        return await execute_nasa_tool(
            payload.name,
            payload.arguments,
            settings.nasa_api_key,
        )
    except NasaServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


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
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
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


@app.get("/api/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@app.get("/api/admin/bugs")
async def list_bugs(
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    if user.get("role") not in {"admin", "service_role"}:
        raise HTTPException(status_code=403, detail="admin_required")
    result = await db.execute(
        text(
            """
            select id, signature, method, path, status, detail, exception_type,
                   request_id, resolved, resolution, recurrence_count, created_at, updated_at
            from public.bug_registry
            order by updated_at desc
            limit 250
            """
        )
    )
    return [dict(row) for row in result.mappings().all()]


@app.post("/api/analyze")
async def analyze(
    file: UploadFile = File(...),
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

    return {
        "score": result.score,
        "verdict": classify_score(result.score),
        "generator_scores": [
            {"name": name, "score": score}
            for name, score in result.generator_scores
        ],
        "deepfake_score": result.deepfake_score,
        "disclaimer": "Model scores are estimates and do not prove image authenticity.",
    }


@app.post("/api/investigations")
async def create_investigation(
    payload: InvestigationCreate,
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    result = await db.execute(
        text(
            """
            insert into public.investigations
              (user_id, title, image_name, score, verdict, deepfake_score, metadata)
            values
              (:user_id, :title, :image_name, :score, :verdict, :deepfake_score, cast(:metadata as jsonb))
            returning id, created_at
            """
        ),
        {
            "user_id": user["id"],
            "title": payload.title,
            "image_name": payload.image_name,
            "score": payload.score,
            "verdict": payload.verdict,
            "deepfake_score": payload.deepfake_score,
            "metadata": __import__("json").dumps(payload.metadata),
        },
    )
    row = result.mappings().first()
    await db.commit()
    return {"id": str(row["id"]), "created_at": row["created_at"].isoformat()}


@app.get("/api/investigations")
async def list_investigations(
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    result = await db.execute(
        text(
            """
            select id, title, image_name, score, verdict, deepfake_score, metadata, created_at
            from public.investigations
            where user_id = :user_id
            order by created_at desc
            limit 100
            """
        ),
        {"user_id": user["id"]},
    )
    return [dict(row) for row in result.mappings().all()]


@app.get("/api/history")
async def list_history(
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    result = await db.execute(
        text(
            """
            select id, action, details, created_at
            from public.verification_history
            where user_id = :user_id
            order by created_at desc
            limit 100
            """
        ),
        {"user_id": user["id"]},
    )
    return [dict(row) for row in result.mappings().all()]


@app.post("/api/reports")
async def create_report(
    payload: dict,
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    title = str(payload.get("title", "Relatório Ektheto"))[:200]
    metadata = payload.get("content", {})
    result = await db.execute(
        text(
            """
            insert into public.reports (user_id, investigation_id, title, content)
            values (
              :user_id,
              nullif(:investigation_id, '')::uuid,
              :title,
              cast(:content as jsonb)
            )
            returning id, created_at
            """
        ),
        {
            "user_id": user["id"],
            "investigation_id": str(payload.get("investigation_id", "") or ""),
            "title": title,
            "content": __import__("json").dumps(metadata),
        },
    )
    row = result.mappings().first()
    await db.commit()
    return {"id": str(row["id"]), "created_at": row["created_at"].isoformat()}


@app.get("/api/reports")
async def list_reports(
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    result = await db.execute(
        text(
            """
            select id, investigation_id, title, content, created_at
            from public.reports
            where user_id = :user_id
            order by created_at desc
            limit 100
            """
        ),
        {"user_id": user["id"]},
    )
    return [dict(row) for row in result.mappings().all()]


@app.put("/api/settings/{key}")
async def save_setting(
    key: str,
    payload: SettingUpdate,
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    if key != payload.key:
        raise HTTPException(status_code=422, detail="key_mismatch")
    await db.execute(
        text(
            """
            insert into public.user_settings (user_id, key, value)
            values (:user_id, :key, cast(:value as jsonb))
            on conflict (user_id, key)
            do update set value = excluded.value, updated_at = now()
            """
        ),
        {
            "user_id": user["id"],
            "key": key,
            "value": __import__("json").dumps(payload.value),
        },
    )
    await db.commit()
    return {"key": key, "value": payload.value}


@app.get("/api/settings")
async def list_settings(
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    result = await db.execute(
        text("select key, value from public.user_settings where user_id = :user_id"),
        {"user_id": user["id"]},
    )
    return {row["key"]: row["value"] for row in result.mappings().all()}


@app.put("/api/integrations/{provider}")
async def save_integration(
    provider: str,
    payload: IntegrationUpdate,
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    if provider != payload.provider:
        raise HTTPException(status_code=422, detail="provider_mismatch")
    await db.execute(
        text(
            """
            insert into public.integrations (user_id, provider, enabled, configuration)
            values (:user_id, :provider, :enabled, cast(:configuration as jsonb))
            on conflict (user_id, provider)
            do update set enabled = excluded.enabled,
                          configuration = excluded.configuration,
                          updated_at = now()
            """
        ),
        {
            "user_id": user["id"],
            "provider": provider,
            "enabled": payload.enabled,
            "configuration": __import__("json").dumps(payload.configuration),
        },
    )
    await db.commit()
    return {"provider": provider, "enabled": payload.enabled}


@app.get("/", include_in_schema=False)
def frontend() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


app.mount("/", StaticFiles(directory=FRONTEND_DIR), name="frontend-assets")
