"""Simulate 100 daily visits to the Ektheto Streamlit app and report latency."""

from __future__ import annotations

import argparse
import json
import math
import statistics
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import requests


PROJECT_ROOT = Path(__file__).resolve().parent


def percentile(values: list[float], fraction: float) -> float:
    ordered = sorted(values)
    if len(ordered) == 1:
        return ordered[0]
    position = (len(ordered) - 1) * fraction
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    return ordered[lower] * (upper - position) + ordered[upper] * (position - lower)


def check_local_target(url: str, allow_remote: bool) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise SystemExit("URL inválido. Indique um endereço http:// ou https://.")
    if parsed.username or parsed.password:
        raise SystemExit("Não inclua credenciais na URL do teste.")
    if not allow_remote and parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
        raise SystemExit(
            "Por segurança, o teste só aceita localhost. Para um sistema seu, "
            "use --allow-remote explicitamente."
        )


def run_visit(url: str, timeout: float, delay: float, start_at: float) -> dict[str, object]:
    if delay > 0:
        time.sleep(max(0, start_at + delay - time.monotonic()))
    started = time.perf_counter()
    try:
        response = requests.get(url, timeout=timeout, headers={"User-Agent": "EkthetoDailyLoadTest/1.0"})
        elapsed_ms = (time.perf_counter() - started) * 1000
        try:
            healthy = response.status_code == 200 and response.text.strip().lower() == "ok"
        except requests.RequestException:
            healthy = False
        return {"status": response.status_code, "latency_ms": round(elapsed_ms, 2), "ok": healthy}
    except requests.RequestException as exc:
        return {"status": None, "latency_ms": round((time.perf_counter() - started) * 1000, 2), "ok": False, "error": type(exc).__name__}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://localhost:8501/_stcore/health")
    parser.add_argument("--users", type=int, default=100, help="Número de visitas simuladas (predefinição: 100).")
    parser.add_argument("--window-hours", type=float, default=24, help="Distribui as visitas igualmente nesta janela de horas.")
    parser.add_argument("--timeout", type=float, default=30)
    parser.add_argument("--report", type=Path, default=PROJECT_ROOT / "relatorio_carga.json")
    parser.add_argument("--allow-remote", action="store_true", help="Permite explicitamente testar um host não local.")
    args = parser.parse_args()

    if args.users < 1 or args.users > 10000:
        parser.error("--users deve estar entre 1 e 10000.")
    if args.window_hours <= 0 or args.timeout <= 0:
        parser.error("--window-hours e --timeout devem ser maiores que zero.")
    check_local_target(args.url, args.allow_remote)

    window_seconds = args.window_hours * 3600
    start_at = time.monotonic()
    results: list[dict[str, object]] = []
    # Schedule each visit across the requested window; only a few worker
    # threads are needed because requests are spaced out over 24 hours.
    workers = min(args.users, 16)
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [
            pool.submit(run_visit, args.url, args.timeout, window_seconds * i / args.users, start_at)
            for i in range(args.users)
        ]
        for index, future in enumerate(as_completed(futures), 1):
            result = future.result()
            results.append(result)
            print(f"Visita concluída {index}/{args.users}: HTTP {result['status']}, {result['latency_ms']} ms, {'OK' if result['ok'] else 'FALHA'}", flush=True)

    latencies = [float(result["latency_ms"]) for result in results]
    successful = sum(bool(result["ok"]) for result in results)
    report = {
        "target": args.url,
        "scheduled_at_utc": datetime.now(timezone.utc).isoformat(),
        "users": args.users,
        "window_hours": args.window_hours,
        "completed": len(results),
        "successful": successful,
        "failed": len(results) - successful,
        "latency_ms": {
            "min": round(min(latencies), 2),
            "median": round(statistics.median(latencies), 2),
            "p95": round(percentile(latencies, 0.95), 2),
            "max": round(max(latencies), 2),
        },
        "visits": results,
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Relatório: {args.report}")
    return 0 if successful == args.users else 1


if __name__ == "__main__":
    raise SystemExit(main())
