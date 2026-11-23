from __future__ import annotations

import hashlib
import json
import logging
from collections import defaultdict
from typing import Any

from sqlalchemy import text
from starlette.requests import Request
from starlette.responses import JSONResponse

from .database import session_factory

logger = logging.getLogger("ektheto.bugs")

_recurrence_counts: defaultdict[str, int] = defaultdict(int)


def make_signature(method: str, path: str, status: int, detail: Any) -> str:
    normalized = json.dumps(detail, sort_keys=True, default=str) if detail is not None else ""
    raw = f"{method}:{path}:{status}:{normalized}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


async def record_bug(
    *,
    method: str,
    path: str,
    status: int,
    detail: Any,
    exception_type: str | None = None,
    request_id: str,
) -> dict[str, object]:
    signature = make_signature(method, path, status, detail)
    _recurrence_counts[signature] += 1
    recurrence = _recurrence_counts[signature]
    record = {
        "signature": signature,
        "method": method,
        "path": path,
        "status": status,
        "detail": detail,
        "exception_type": exception_type,
        "request_id": request_id,
        "recurrence_count": recurrence,
    }
    logger.warning("registered_bug=%s", json.dumps(record, default=str))

    if session_factory is not None:
        try:
            async with session_factory() as session:
                await session.execute(
                    text(
                        """
                        insert into public.bug_registry
                          (signature, method, path, status, detail, exception_type, request_id)
                        values
                          (:signature, :method, :path, :status, cast(:detail as jsonb),
                           :exception_type, :request_id)
                        on conflict (signature) do update set
                          recurrence_count = public.bug_registry.recurrence_count + 1,
                          updated_at = now(),
                          resolved = false
                        """
                    ),
                    {
                        "signature": signature,
                        "method": method,
                        "path": path,
                        "status": status,
                        "detail": json.dumps(detail, default=str),
                        "exception_type": exception_type,
                        "request_id": request_id,
                    },
                )
                await session.commit()
        except Exception as exc:
            logger.exception("bug_registry_database_write_failed", exc_info=exc)
    return record


async def bug_registry_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or hashlib.sha256(
        f"{request.method}:{request.url.path}:{id(request)}".encode()
    ).hexdigest()[:16]
    request.state.request_id = request_id
    try:
        response = await call_next(request)
        if (
            response.status_code in {422, 429} or response.status_code >= 500
        ) and not getattr(request.state, "bug_recorded", False):
            await record_bug(
                method=request.method,
                path=request.url.path,
                status=response.status_code,
                detail={
                    "error": (
                        "upstream_rate_limit"
                        if response.status_code == 429
                        else "server_error"
                    )
                },
                request_id=request_id,
            )
        return response
    except Exception as exc:
        await record_bug(
            method=request.method,
            path=request.url.path,
            status=500,
            detail={"error": "unexpected_exception"},
            exception_type=type(exc).__name__,
            request_id=request_id,
        )
        logger.exception("unhandled_exception request_id=%s", request_id)
        return JSONResponse(
            status_code=500,
            content={"detail": "internal_server_error", "request_id": request_id},
        )
