from fastapi import Depends, Header, HTTPException
import httpx
import jwt
from jwt import PyJWKClient

from .config import get_settings


async def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="invalid_token")
    token = authorization.removeprefix("Bearer ").strip()
    settings = get_settings()

    try:
        if settings.supabase_jwt_secret:
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
        else:
            if not settings.supabase_url:
                raise HTTPException(status_code=503, detail="auth_not_configured")
            jwks_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
            signing_key = PyJWKClient(jwks_url).get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256", "ES256"],
                audience="authenticated",
            )
    except HTTPException:
        raise
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="invalid_token") from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="invalid_token")
    return {
        "id": user_id,
        "email": payload.get("email"),
        "role": payload.get("role", "authenticated"),
    }
