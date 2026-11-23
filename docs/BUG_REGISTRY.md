# Ektheto bug registry

## Purpose

The API records HTTP 422/5xx failures and unhandled exceptions with:

- deterministic bug signature
- HTTP method and path
- status code
- sanitized detail
- exception type
- request ID
- recurrence count
- resolution state

In production, records are stored in `public.bug_registry`. Locally or before
Supabase is configured, records are emitted as structured logs.

The `/api/admin/bugs` endpoint is restricted to `admin` or `service_role`
principals.

## Automatic prevention

1. Authentication dependencies use an optional header and return `401
   invalid_token` when missing or malformed.
2. Request validation failures receive a stable `422` response plus a request ID.
3. Unhandled exceptions receive `500 internal_server_error` plus a request ID.
4. Repeated signatures reuse the same registry record and increment the
   recurrence count instead of creating duplicate rows.
5. A deterministic signature test prevents equivalent HTTP failures from being
   misclassified after code changes.

## Known case: missing Authorization header

- **Observed:** a missing Bearer header was validated as a required
  `Header(...)` dependency and returned `422`.
- **Root cause:** FastAPI dependency validation occurred before the
  authentication function could translate an absent header to an unauthorized
  response.
- **Fix:** the dependency now accepts `authorization: str | None =
  Header(default=None)` and returns `401 {"detail":"invalid_token"}`.
- **Regression test:** `test_missing_auth_is_rejected`
- **Repeat test:** `test_missing_auth_is_stable_for_regression`
- **Prevention:** the missing-token contract is covered by repeated tests and
  recorded in the bug registry.
