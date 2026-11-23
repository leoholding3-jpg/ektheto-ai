# Ektheto production migration report

## Summary

The local application was migrated from Streamlit to a FastAPI backend with a
separate static/PWA frontend. The production code is structured for Render,
Supabase PostgreSQL, Supabase Auth and Cloudflare.

## What changed

- Removed `app.py`, `api.py`, `capturar.py`, `carga_diaria.py`, Streamlit test
  code and Streamlit dependencies from the runtime.
- Added `backend/app/main.py` for API routes and static frontend hosting.
- Added JWT verification for Supabase access tokens.
- Added protected image analysis and PostgreSQL-backed user data routes.
- Added account, investigation, report, history, settings and integration APIs.
- Added a Supabase SQL migration with RLS policies.
- Added PWA pages for analysis, history, Radar, help, about and settings.
- Added a Supabase browser login/create-account dialog.
- Added Render and Docker deployment configuration.
- Added a structured bug registry and regression tests.
- Created an external Streamlit backup archive:
  `streamlit-backup-20261123.tar.gz`.

## Validation

- `python -m pytest tests -v`: 6 tests passed.
- Backend Python compilation passed.
- `/api/health`: returned HTTP 200.
- `/`: returned HTTP 200 and served the Ektheto frontend.
- `POST /api/analyze` without authentication: HTTP 401 with
  `{"detail":"invalid_token"}`.

## Hardest parts

1. **Authentication compatibility:** Supabase supports legacy HS256 JWT secrets
   and newer asymmetric signing keys through JWKS. The backend supports both
   modes, selected from environment variables.
2. **Database security:** RLS and backend ownership checks must agree. The
   migration uses `auth.uid()` policies, while backend routes validate the JWT
   first and scope SQL by the token subject.
3. **Provider fallback:** the analysis provider may reject optional deepfake
   models. The provider function falls back to the generation model and returns
   a valid result without a deepfake score.
4. **Bug classification:** expected authentication failures must not be
   confused with application bugs. HTTP 422/5xx and unhandled exceptions are
   registered; missing authentication is normalized to 401.
5. **External credentials:** deployment cannot be truthfully marked complete
   without Supabase, Sightengine, Render and Cloudflare credentials.

## Why some parts remain as configuration

The repository cannot safely create infrastructure or publish secrets without
the user's service credentials or explicit dashboard authorization. The local
source now contains placeholders and deployment manifests, but:

- Supabase requires project creation and migration execution.
- Render requires account access and secret values.
- Cloudflare requires domain ownership and DNS control.
- GitHub private visibility/repository creation requires authenticated account
  access. The `gh` executable is not currently installed.
- Production HTTPS and public DNS can only be verified after those resources
  exist.

## Production launch checklist

1. Create/configure the Supabase project.
2. Run `supabase/migrations/001_initial.sql`.
3. Configure environment variables in Render.
4. Create the private GitHub repository and push this branch.
5. Deploy the Render service.
6. Add the custom domain.
7. Add Cloudflare DNS, WAF, HTTPS and rate limits.
8. Verify account registration, login, analysis and database persistence.
9. Run the full test suite against the deployed API.
10. Enable monitoring and review `/api/admin/bugs`.
