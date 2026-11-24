# Ektheto

Ektheto is a FastAPI application with a lightweight static/PWA frontend for
investigating suspicious images. The current flow provides image analysis,
optional Gemini observations, session-only history, text-based source search,
and a manual map.

## Architecture and current scope

- `frontend/`: static PWA, deployable to Netlify or served by FastAPI
- `backend/app/`: API, image analysis, EXIF summary, news and image-source search
- `netlify.toml`: publishes `frontend/` as a static Netlify site
- `render.yaml`: Render web-service configuration for the FastAPI backend
- `Dockerfile`: optional container deployment

Supabase, PostgreSQL persistence, user accounts and authentication are
temporarily disabled. History stays in the current browser tab's
`sessionStorage`; uploaded images are not retained by Ektheto.

## Local development

```powershell
python -m pip install -r requirements.txt
copy .env.example .env
# Set Sightengine credentials for live image analysis
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000`. Configure credentials only in `.env` or the
hosting provider's secret settings; never commit populated secrets.

## Investigation providers

- **Sightengine:** primary image-generation and optional deepfake scoring.
  Requires `SIGHTENGINE_USER` and `SIGHTENGINE_SECRET`.
- **Gemini:** optional visual description and investigation prompts. The user
  must opt in before the image is sent to Google. Requires `GEMINI_API_KEY`;
  `GEMINI_MODEL` is optional.
- **Image metadata:** EXIF is read by the backend. GPS coordinates are never
  returned; the UI only indicates whether GPS metadata exists. Metadata may be
  missing, edited, or forged and is not proof of authenticity.
- **Wikimedia Commons:** free, no-key text search for related media. The
  image itself is not sent. This is not reverse-image search and does not
  establish that a result is the same image.
- **News:** GDELT is queried without a key; NewsData.io, GNews and NewsAPI can
  be enabled with optional keys. Their status and quotas depend on each
  provider. The result screen sends only the search text to these providers.

The result screen's external search is user-triggered. It searches Wikimedia
Commons and configured news providers; no image is uploaded by that search.

## Netlify frontend and Render API

The selected frontend address is `https://ektheto.netlify.app`, subject to
availability in the Netlify account. `netlify.toml` publishes the `frontend/`
directory without a build step. Create the Netlify site from the GitHub
repository and confirm the publish directory is `frontend`.

The FastAPI backend remains a separate Render service. After deploying it,
set `window.EKTHETO_API_BASE_URL` in `frontend/config.js` to the backend's
public HTTPS URL, for example `https://<service-name>.onrender.com`, and
redeploy the frontend. The Render `CORS_ORIGINS` setting already includes the
selected Netlify origin; change it if Netlify assigns a different URL.

`render.yaml` uses Render's **Free** web-service plan for preview/testing.
Free services can sleep when idle and cold-start slowly, so this is not a
reliable production plan. Netlify's subdomain is free if available; a custom
`.com` domain must be registered and paid for separately. No Netlify site or
Render deployment has been created from this workspace.

Free hosting does not make third-party analysis free: check the current usage
limits and billing terms for Sightengine, Gemini and optional news providers.

## API

- `GET /api/health`
- `POST /api/analyze` — multipart `file`, optional `use_gemini`, `language`
- `POST /api/investigation/sources` — JSON `{ "query": "...", "pais": "ao", "limite": 3 }`
- `POST /api/news/search`
- `GET /api/news/tools`
- `POST /api/news/tools/execute`
- `GET /api/docs`

Image uploads are limited to 100 MB and 50 megapixels. The analysis provider
may receive an optimized temporary image. API failures are registered in
application logs with request IDs; the system does not automatically repair
code or persist an issue database.

## Validation

```powershell
python -m pip install pytest
python -m pytest tests -v
node --check frontend/app.js
node --check frontend/config.js
git diff --check
```
