from fastapi import Response

from app.core.config import Settings

from ..application.dto import AuthenticatedSession

SESSION_COOKIE_NAME = "gheymatyar_session"
CSRF_COOKIE_NAME = "gheymatyar_csrf"


def set_auth_cookies(
    response: Response,
    authenticated: AuthenticatedSession,
    settings: Settings,
) -> None:
    max_age = settings.auth_session_ttl_seconds
    response.set_cookie(
        SESSION_COOKIE_NAME,
        authenticated.tokens.session_token,
        httponly=True,
        secure=settings.secure_auth_cookies,
        samesite="lax",
        path="/",
        max_age=max_age,
        expires=authenticated.expires_at,
    )
    response.set_cookie(
        CSRF_COOKIE_NAME,
        authenticated.tokens.csrf_token,
        httponly=False,
        secure=settings.secure_auth_cookies,
        samesite="lax",
        path="/",
        max_age=max_age,
        expires=authenticated.expires_at,
    )
    response.headers["Cache-Control"] = "no-store"


def clear_auth_cookies(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        SESSION_COOKIE_NAME,
        httponly=True,
        secure=settings.secure_auth_cookies,
        samesite="lax",
        path="/",
    )
    response.delete_cookie(
        CSRF_COOKIE_NAME,
        httponly=False,
        secure=settings.secure_auth_cookies,
        samesite="lax",
        path="/",
    )
    response.headers["Cache-Control"] = "no-store"
