import re
from datetime import date
from typing import Any

import httpx


APOD_URL = "https://api.nasa.gov/planetary/apod"
NEO_FEED_URL = "https://api.nasa.gov/neo/rest/v1/feed"
MAX_NEO_DATE_RANGE_DAYS = 7

NASA_TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "obter_foto_astronomia_do_dia",
            "description": "Obtém a foto espacial oficial do dia da NASA e a sua explicação científica.",
            "parameters": {
                "type": "object",
                "properties": {
                    "data": {
                        "type": "string",
                        "format": "date",
                        "description": "Data no formato YYYY-MM-DD (opcional).",
                    }
                },
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "buscar_asteroides_proximos",
            "description": "Conta asteroides próximos da Terra num intervalo máximo de sete dias.",
            "parameters": {
                "type": "object",
                "properties": {
                    "data_inicio": {
                        "type": "string",
                        "format": "date",
                        "description": "Data inicial no formato YYYY-MM-DD.",
                    },
                    "data_fim": {
                        "type": "string",
                        "format": "date",
                        "description": "Data final no formato YYYY-MM-DD.",
                    },
                },
                "required": ["data_inicio", "data_fim"],
                "additionalProperties": False,
            },
        },
    },
]


class NasaServiceError(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


async def _request_json(url: str, params: dict[str, str], api_key: str) -> dict[str, Any]:
    if not api_key.strip():
        raise NasaServiceError(503, "nasa_api_key_not_configured")

    query = {**params, "api_key": api_key}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=query)
    except httpx.TimeoutException as exc:
        raise NasaServiceError(504, "nasa_timeout") from exc
    except httpx.RequestError as exc:
        raise NasaServiceError(502, "nasa_unavailable") from exc

    if response.status_code == 429:
        raise NasaServiceError(429, "nasa_rate_limit")
    if response.status_code in {400, 422}:
        raise NasaServiceError(422, "nasa_invalid_request")
    if response.status_code in {401, 403}:
        raise NasaServiceError(503, "nasa_api_key_rejected")
    if response.status_code != 200:
        raise NasaServiceError(502, "nasa_upstream_error")

    try:
        payload = response.json()
    except ValueError as exc:
        raise NasaServiceError(502, "nasa_invalid_response") from exc

    if not isinstance(payload, dict) or payload.get("error"):
        raise NasaServiceError(502, "nasa_invalid_response")
    return payload


def _parse_tool_date(value: Any, argument_name: str, optional: bool = False) -> date | None:
    if value is None and optional:
        return None
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise NasaServiceError(422, f"invalid_{argument_name}_date")
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise NasaServiceError(422, f"invalid_{argument_name}_date") from exc


def _validate_arguments(arguments: dict[str, Any], allowed: set[str], required: set[str]) -> None:
    if set(arguments) - allowed:
        raise NasaServiceError(422, "unexpected_tool_arguments")
    if required - set(arguments):
        raise NasaServiceError(422, "missing_tool_arguments")


async def obter_foto_astronomia_do_dia(api_key: str, data: date | None = None) -> dict[str, Any]:
    params = {"date": data.isoformat()} if data else {}
    payload = await _request_json(APOD_URL, params, api_key)
    required_fields = ("title", "date", "explanation", "url")
    if any(not isinstance(payload.get(field), str) for field in required_fields):
        raise NasaServiceError(502, "nasa_invalid_response")
    return {
        "titulo": payload["title"],
        "data": payload["date"],
        "explicacao": payload["explanation"],
        "url_imagem": payload["url"],
    }


async def buscar_asteroides_proximos(
    api_key: str,
    data_inicio: date,
    data_fim: date,
) -> dict[str, Any]:
    if data_fim < data_inicio:
        raise NasaServiceError(422, "nasa_invalid_date_range")
    if (data_fim - data_inicio).days > MAX_NEO_DATE_RANGE_DAYS:
        raise NasaServiceError(422, "nasa_date_range_exceeds_7_days")

    payload = await _request_json(
        NEO_FEED_URL,
        {"start_date": data_inicio.isoformat(), "end_date": data_fim.isoformat()},
        api_key,
    )
    total = payload.get("element_count")
    if not isinstance(total, int) or total < 0:
        raise NasaServiceError(502, "nasa_invalid_response")
    return {
        "total_asteroides": total,
        "resumo": (
            f"Foram detetados {total} asteroides próximos da Terra entre "
            f"{data_inicio.isoformat()} e {data_fim.isoformat()}."
        ),
    }


async def execute_nasa_tool(
    name: str,
    arguments: dict[str, Any],
    api_key: str,
) -> dict[str, Any]:
    if name == "obter_foto_astronomia_do_dia":
        _validate_arguments(arguments, {"data"}, set())
        apod_date = _parse_tool_date(arguments.get("data"), "apod", optional=True)
        return await obter_foto_astronomia_do_dia(api_key, apod_date)

    if name == "buscar_asteroides_proximos":
        _validate_arguments(arguments, {"data_inicio", "data_fim"}, {"data_inicio", "data_fim"})
        start_date = _parse_tool_date(arguments.get("data_inicio"), "start")
        end_date = _parse_tool_date(arguments.get("data_fim"), "end")
        if start_date is None or end_date is None:
            raise NasaServiceError(422, "missing_tool_arguments")
        return await buscar_asteroides_proximos(api_key, start_date, end_date)

    raise NasaServiceError(404, "nasa_tool_not_found")
