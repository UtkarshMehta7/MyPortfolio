"""Single-admin authentication: bcrypt password check, JWT sessions, login rate limit and credential changes."""
import hmac
import re
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Dict, List

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import settings
from .store import Account, store

_bearer = HTTPBearer(auto_error=False)
_failures: Dict[str, List[float]] = defaultdict(list)
MAX_FAILURES = 5
WINDOW_SECONDS = 15 * 60
USERNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{3,32}$")
MIN_PASSWORD = 10


def client_ip(request: Request) -> str:
    # Render's proxy appends the real client address last; earlier entries can be set by the client.
    fwd = request.headers.get("x-forwarded-for", "")
    return fwd.split(",")[-1].strip() if fwd else (request.client.host if request.client else "unknown")


def check_rate_limit(ip: str) -> None:
    now = time.time()
    _failures[ip] = [t for t in _failures[ip] if now - t < WINDOW_SECONDS]
    if len(_failures[ip]) >= MAX_FAILURES:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many failed attempts. Try again in 15 minutes.")


def record_failure(ip: str) -> None:
    _failures[ip].append(time.time())


def _account() -> Account:
    acc = store.get_account()
    if not acc or not settings.jwt_secret:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Admin login is not configured on the server.")
    return acc


def password_ok(acc: Account, password: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), acc["password_hash"].encode("utf-8"))
    except ValueError:
        return False


def verify_credentials(username: str, password: str) -> Account:
    acc = _account()
    user_ok = hmac.compare_digest(username.strip().lower(), acc["username"].lower())
    pass_ok = password_ok(acc, password)  # always run bcrypt so timing doesn't reveal the username
    if not (user_ok and pass_ok):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong username or password.")
    return acc


def create_token(acc: Account) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": acc["username"], "ver": acc["token_version"], "iat": now, "exp": now + timedelta(hours=settings.jwt_hours)}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def require_admin(creds: HTTPAuthorizationCredentials = Depends(_bearer)) -> Account:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not logged in.")
    acc = _account()
    try:
        payload = jwt.decode(creds.credentials, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired. Please log in again.")
    # Changing the username or password bumps token_version, which signs out every older session.
    if payload.get("sub", "").lower() != acc["username"].lower() or payload.get("ver") != acc["token_version"]:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired. Please log in again.")
    return acc


def change_credentials(acc: Account, current_password: str, new_username: str, new_password: str) -> Account:
    if not password_ok(acc, current_password):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Current password is wrong.")
    username = (new_username or acc["username"]).strip()
    if not USERNAME_RE.match(username):
        raise HTTPException(422, "Username must be 3–32 characters: letters, numbers, dot, dash or underscore.")
    if new_password:
        if len(new_password) < MIN_PASSWORD:
            raise HTTPException(422, f"New password must be at least {MIN_PASSWORD} characters.")
        password_hash = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")
    else:
        password_hash = acc["password_hash"]
    if username == acc["username"] and not new_password:
        raise HTTPException(422, "Nothing to change.")
    return store.set_account(username, password_hash)
