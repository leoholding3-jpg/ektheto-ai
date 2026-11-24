# Ektheto error logging

## Purpose

The API emits HTTP 422/429/5xx failures and unhandled exceptions as structured
application logs with:

- deterministic bug signature
- HTTP method and path
- status code
- sanitized detail
- exception type
- request ID

The recurrence count is process-local. There is no database-backed issue
registry or `/api/admin/bugs` endpoint while Supabase is disabled. On Render,
these records are available in the service logs subject to Render's retention.

## What this does and does not do

1. Request validation failures receive a `422` response and request ID.
2. Unhandled exceptions receive `500 internal_server_error` and a request ID.
3. Provider errors are logged with a stable signature and request ID.
4. The logs help a developer diagnose failures; they do not automatically
   modify code, retry indefinitely, or resolve bugs.

## Validation

Regression tests cover validation error logging, provider failures and stable
bug signatures. Production log access and alerting still need to be configured
in the hosting account.
