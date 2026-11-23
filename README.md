# Ektheto

Ektheto is a FastAPI + static frontend application for AI-image investigation.
The current interface follows the supplied ZIP design: an onboarding carousel,
image analysis, session-only history, Radar, settings and help. Account creation
and sign-in are intentionally not part of this iteration.

## Architecture

- `frontend/`: installable PWA served by FastAPI
- `backend/app/`: API, image analysis, Supabase JWT authentication, PostgreSQL access
- `supabase/migrations/`: PostgreSQL schema and row-level security policies
- `render.yaml`: Render web-service deployment
- `Dockerfile`: container deployment

## Local development

```powershell
python -m pip install -r requirements.txt
copy .env.example .env
# Fill in Sightengine values for live image analysis
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000`.

The onboarding and current-session history are intentionally account-free.
History metadata lives only in the current browser tab session; image files are
not stored in history.

The Radar map is a local SVG generated from Natural Earth 1:110m Admin-0
country data ([public-domain source](https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/)).
It supports country coloring, zoom, panning, ocean color, and SVG export without
loading map libraries or geographic data from a CDN at runtime.

## Supabase

1. Create a Supabase project when the account/database iteration is approved.
2. Run `supabase/migrations/001_initial.sql` in the Supabase SQL Editor.
3. Configure the Supabase environment variables in Render.

The database migration is retained for that later iteration. In the current
ZIP-design flow, history is held only in browser `sessionStorage` and is
discarded when the tab session ends. No account is needed to select an image.

## Render

Create a Render Web Service from this repository or use `render.yaml`.
Set every `sync: false` environment variable in the Render dashboard.
Configure `CORS_ORIGINS` with the public frontend origin.

Build: `pip install -r requirements.txt`

Start: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`

Health: `/api/health`

## Frontend deployment

The frontend is currently served by FastAPI and can be deployed with the backend.
For CDN/static hosting, publish `frontend/` and set the frontend origin in
`CORS_ORIGINS`.

## NASA tools

The FastAPI backend provides the NASA Astronomy Picture of the Day (APOD) and
Near Earth Object (NeoWs) tools. Set `NASA_API_KEY` in `.env` or the Render
environment; `DEMO_KEY` is a low-quota testing key and should be replaced before
production. The key stays on the server and is not included in API responses.

- `GET /api/nasa/apod?date=YYYY-MM-DD` (date optional)
- `GET /api/nasa/asteroids?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
- `GET /api/nasa/tools` returns function-calling schemas.
- `POST /api/nasa/tools/execute` dispatches a tool with `{ "name": "...", "arguments": {} }`.

NeoWs date ranges are validated to a maximum seven-day difference. Upstream
timeouts and NASA rate limits are returned as explicit API errors.

## News search tools

News search queries GDELT, NewsData.io, GNews and NewsAPI concurrently. GDELT
needs no key; the other providers are enabled independently by setting
`NEWSDATA_API_KEY`, `GNEWS_API_KEY` and `NEWSAPI_API_KEY`. Missing keys return a
`nao_configurado` provider status, while provider failures are returned
separately and registered in the bug log. Provider quotas and freshness depend
on each provider's plan.

- `POST /api/news/search` accepts `{ "tema": "Angola tecnologia", "pais": "ao", "limite": 5 }`.
- `GET /api/news/tools` returns the function-calling schema.
- `POST /api/news/tools/execute` dispatches `pesquisar_noticias_na_hora`.

## Cloudflare

Point the production domain to Render, enable Cloudflare proxying, set DNS to
Full (Strict) mode, configure HTTPS, WAF/managed rules and rate limiting.
Keep Cloudflare origin protection enabled in production.

## API

- `GET /api/health`
- `GET /api/config/public`
- `GET /api/nasa/apod`
- `GET /api/nasa/asteroids`
- `GET /api/nasa/tools`
- `POST /api/nasa/tools/execute`
- `POST /api/news/search`
- `GET /api/news/tools`
- `POST /api/news/tools/execute`
- `GET /api/me`
- `POST /api/analyze`
- `GET/POST /api/investigations`
- `GET/POST /api/reports`
- `GET /api/history`
- `GET/PUT /api/settings/{key}`
- `GET/PUT /api/integrations/{provider}`

Account/database endpoints remain protected for a later iteration. Image
analysis is available without an account; analysis still requires the
Sightengine environment credentials on the server. Image uploads are limited
to 100 MB and 50 megapixels; larger-than-provider-limit images are converted
to a temporary JPEG for analysis, while the browser keeps the original preview.

## Tests

```powershell
python -m pip install pytest
python -m pytest tests -v
```
