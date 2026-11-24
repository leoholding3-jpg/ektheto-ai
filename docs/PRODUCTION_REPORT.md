# Ektheto readiness report

## Current state

The codebase uses FastAPI and a static PWA. Supabase, PostgreSQL persistence,
authentication and the unused NASA tools have been removed from the current
runtime. The interface stores history only in the browser tab session and does
not persist uploaded images.

The image investigation flow includes:

- Sightengine as the primary image-analysis provider.
- Optional Gemini image analysis only after explicit user consent.
- Local EXIF summary with GPS coordinates withheld.
- User-triggered text search against Wikimedia Commons and available news
  providers. The image is not sent to these search providers.
- A manual map without fabricated distribution charts or sample cases.

## Deployment status

No Netlify site, Render deployment, custom domain, Cloudflare configuration,
or new GitHub push was performed. `netlify.toml` publishes the `frontend/`
directory and `render.yaml` allows the chosen `https://ektheto.netlify.app`
origin. The Netlify name must still be claimed in an account and is subject to
availability. Render's free service can sleep, and a custom `.com` domain
requires paid registration.

The local `.env` is ignored by Git and was not edited. Any former Supabase
values in that file are no longer read by the application; remove them locally
if they are no longer needed.

## Remaining release requirements

1. Claim the Netlify site name and verify it serves the static frontend.
2. Deploy the FastAPI service on Render, then set its public URL in
   `frontend/config.js` and run the frontend deployment again.
3. Provide valid Sightengine credentials and test a real image-analysis
   request.
4. Provide a Gemini key if the optional provider is to be enabled; verify it
   with an explicit, consented request.
5. Decide whether to use the free Render preview or a paid always-on plan.
6. Register a custom domain if desired, then configure DNS and HTTPS.
7. Configure Cloudflare protections if a custom domain is added, matching the
   selected plan and traffic needs; no Cloudflare settings have been applied
   from this workspace.
8. Push the reviewed changes to the authorized GitHub repository.
9. Configure log alerts and run production smoke tests after deployment.

## Verification

- `python -m pytest tests -q`: 26 tests passed.
- `python -m compileall -q backend tests`: passed.
- `node --check frontend/app.js`: passed.
- `git diff --check`: passed.
- Live Wikimedia Commons query with generic terms returned three results.
- Sightengine and Gemini were not called live; those calls require configured
  credentials and an explicit image-analysis request.
