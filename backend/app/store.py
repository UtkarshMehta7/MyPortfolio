"""Storage: portfolio content (one JSONB row) and the admin account, in Neon Postgres or local JSON files."""
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from .config import settings

SEED_PATH = Path(__file__).resolve().parent.parent / "seed.json"

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS site_content (
    id          SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    data        JSONB NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS admin_account (
    id             SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    username       TEXT NOT NULL,
    password_hash  TEXT NOT NULL,
    token_version  INTEGER NOT NULL DEFAULT 1,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""

Account = Dict[str, Any]  # {"username", "password_hash", "token_version"}


def _seed() -> Dict[str, Any]:
    return json.loads(SEED_PATH.read_text(encoding="utf-8"))


def _initial_account() -> Optional[Account]:
    if not settings.admin_password_hash:
        return None
    return {"username": settings.admin_username.strip(), "password_hash": settings.admin_password_hash, "token_version": 1}


class PostgresStore:
    def __init__(self, url: str) -> None:
        import psycopg  # imported lazily so local dev works without the driver

        self._psycopg = psycopg
        self.url = url

    def _conn(self):
        return self._psycopg.connect(self.url, autocommit=True, connect_timeout=15)

    def init(self) -> None:
        from psycopg.types.json import Jsonb

        with self._conn() as conn:
            conn.execute(SCHEMA_SQL)
            conn.execute(
                "INSERT INTO site_content (id, data) VALUES (1, %s) ON CONFLICT (id) DO NOTHING",
                (Jsonb(_seed()),),
            )
            initial = _initial_account()
            if initial:
                if settings.admin_reset:
                    conn.execute(
                        "INSERT INTO admin_account (id, username, password_hash) VALUES (1, %s, %s) "
                        "ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, password_hash = EXCLUDED.password_hash, "
                        "token_version = admin_account.token_version + 1, updated_at = now()",
                        (initial["username"], initial["password_hash"]),
                    )
                else:
                    conn.execute(
                        "INSERT INTO admin_account (id, username, password_hash) VALUES (1, %s, %s) ON CONFLICT (id) DO NOTHING",
                        (initial["username"], initial["password_hash"]),
                    )

    def get(self) -> Tuple[Dict[str, Any], str]:
        with self._conn() as conn:
            row = conn.execute("SELECT data, updated_at FROM site_content WHERE id = 1").fetchone()
        if row is None:
            self.init()
            return self.get()
        return row[0], row[1].isoformat()

    def put(self, data: Dict[str, Any]) -> str:
        from psycopg.types.json import Jsonb

        with self._conn() as conn:
            row = conn.execute(
                "INSERT INTO site_content (id, data, updated_at) VALUES (1, %s, now()) "
                "ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now() RETURNING updated_at",
                (Jsonb(data),),
            ).fetchone()
        return row[0].isoformat()

    def get_account(self) -> Optional[Account]:
        with self._conn() as conn:
            row = conn.execute("SELECT username, password_hash, token_version FROM admin_account WHERE id = 1").fetchone()
        return {"username": row[0], "password_hash": row[1], "token_version": row[2]} if row else None

    def set_account(self, username: str, password_hash: str) -> Account:
        with self._conn() as conn:
            row = conn.execute(
                "UPDATE admin_account SET username = %s, password_hash = %s, token_version = token_version + 1, "
                "updated_at = now() WHERE id = 1 RETURNING username, password_hash, token_version",
                (username, password_hash),
            ).fetchone()
        return {"username": row[0], "password_hash": row[1], "token_version": row[2]}


class FileStore:
    def __init__(self, path: str) -> None:
        self.path = Path(path)
        self.account_path = Path(path + ".account.json")

    def init(self) -> None:
        if not self.path.exists():
            self.put(_seed())
        initial = _initial_account()
        if initial and (settings.admin_reset or not self.account_path.exists()):
            old = self.get_account()
            if old:
                initial["token_version"] = old["token_version"] + 1
            self.account_path.write_text(json.dumps(initial), encoding="utf-8")

    def get(self) -> Tuple[Dict[str, Any], str]:
        if not self.path.exists():
            self.init()
        blob = json.loads(self.path.read_text(encoding="utf-8"))
        return blob["data"], blob["updated_at"]

    def put(self, data: Dict[str, Any]) -> str:
        ts = datetime.now(timezone.utc).isoformat()
        self.path.write_text(json.dumps({"data": data, "updated_at": ts}, ensure_ascii=False, indent=2), encoding="utf-8")
        return ts

    def get_account(self) -> Optional[Account]:
        return json.loads(self.account_path.read_text(encoding="utf-8")) if self.account_path.exists() else None

    def set_account(self, username: str, password_hash: str) -> Account:
        old = self.get_account() or {"token_version": 0}
        acc = {"username": username, "password_hash": password_hash, "token_version": old["token_version"] + 1}
        self.account_path.write_text(json.dumps(acc), encoding="utf-8")
        return acc


store = PostgresStore(settings.database_url) if settings.database_url else FileStore(settings.local_store)
