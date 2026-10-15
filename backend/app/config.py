import os
from dataclasses import dataclass, field
from typing import List


def _list(name: str) -> List[str]:
    return [x.strip().rstrip("/") for x in os.getenv(name, "").split(",") if x.strip()]


@dataclass(frozen=True)
class Settings:
    # Neon connection string, e.g. postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
    # When empty, content is kept in a local JSON file (for development only).
    database_url: str = os.getenv("DATABASE_URL", "")
    # Initial admin login. Used only to create the account the first time (or when ADMIN_RESET=true);
    # after that the username and password live in the database and are changed from /admin → Account.
    admin_username: str = os.getenv("ADMIN_USERNAME", "admin")
    # bcrypt hash created with scripts/hash_password.py — the plain password is never stored.
    admin_password_hash: str = os.getenv("ADMIN_PASSWORD_HASH", "")
    # Set to "true" once to overwrite the stored login with ADMIN_USERNAME / ADMIN_PASSWORD_HASH (lockout recovery).
    admin_reset: bool = os.getenv("ADMIN_RESET", "").lower() in ("1", "true", "yes")
    jwt_secret: str = os.getenv("JWT_SECRET", "")
    jwt_hours: int = int(os.getenv("JWT_HOURS", "12"))
    allowed_origins: List[str] = field(default_factory=lambda: _list("ALLOWED_ORIGINS") or ["http://localhost:5173"])
    github_token: str = os.getenv("GITHUB_TOKEN", "")
    # Netlify build hook URL. Called after every save so the always-on static site is rebuilt with the new content.
    netlify_build_hook: str = os.getenv("NETLIFY_BUILD_HOOK", "")
    local_store: str = os.getenv("LOCAL_STORE", "local_content.json")


settings = Settings()
