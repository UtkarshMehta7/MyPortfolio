"""Terminal Utkarsh API — public read of portfolio content, admin-only editing and imports."""
import json
from contextlib import asynccontextmanager
from typing import Any, Dict

import logging

import httpx
from fastapi import BackgroundTasks, Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import importers
from .auth import (
    change_credentials,
    check_rate_limit,
    client_ip,
    create_token,
    record_failure,
    require_admin,
    verify_credentials,
)
from .config import settings
from .store import Account, store

REQUIRED_KEYS = {"profile", "stats", "projects", "logbook", "certifications", "skills", "contact"}
MAX_CONTENT_BYTES = 500_000
MAX_UPLOAD_BYTES = 20_000_000
log = logging.getLogger("uvicorn.error")


def trigger_site_rebuild() -> None:
    """Ask Netlify to rebuild, so the static site bakes in the content that was just saved."""
    if not settings.netlify_build_hook.startswith("https://api.netlify.com/build_hooks/"):
        return
    try:
        r = httpx.post(settings.netlify_build_hook, params={"trigger_title": "Content saved in admin"}, timeout=10)
        if r.status_code >= 300:
            log.warning("Netlify rebuild trigger failed: HTTP %s", r.status_code)
        else:
            log.info("Netlify rebuild triggered")
    except httpx.HTTPError as e:
        log.warning("Netlify rebuild trigger failed: %s", e)


@asynccontextmanager
async def lifespan(_: FastAPI):
    store.init()
    yield


app = FastAPI(title="Terminal Utkarsh API", version="1.0.0", lifespan=lifespan, docs_url=None, redoc_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


class LoginBody(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=256)


class ContentBody(BaseModel):
    content: Dict[str, Any]


class AccountBody(BaseModel):
    current_password: str = Field(min_length=1, max_length=256)
    new_username: str = Field(default="", max_length=32)
    new_password: str = Field(default="", max_length=256)


@app.get("/api/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/api/content")
def get_content() -> Dict[str, Any]:
    data, updated_at = store.get()
    return {"content": data, "updated_at": updated_at}


@app.post("/api/login")
def login(body: LoginBody, request: Request) -> Dict[str, str]:
    ip = client_ip(request)
    check_rate_limit(ip)
    try:
        acc = verify_credentials(body.username, body.password)
    except HTTPException as e:
        if e.status_code == 401:
            record_failure(ip)
        raise
    return {"token": create_token(acc), "username": acc["username"]}


@app.get("/api/me")
def me(acc: Account = Depends(require_admin)) -> Dict[str, str]:
    return {"username": acc["username"]}


@app.put("/api/account")
def update_account(body: AccountBody, request: Request, acc: Account = Depends(require_admin)) -> Dict[str, str]:
    ip = client_ip(request)
    check_rate_limit(ip)
    try:
        new_acc = change_credentials(acc, body.current_password, body.new_username, body.new_password)
    except HTTPException as e:
        if e.status_code == 403:
            record_failure(ip)
        raise
    # Other sessions are now signed out; this one gets a fresh token.
    return {"token": create_token(new_acc), "username": new_acc["username"]}


@app.put("/api/content")
def put_content(body: ContentBody, background: BackgroundTasks, _: Account = Depends(require_admin)) -> Dict[str, Any]:
    data = body.content
    missing = REQUIRED_KEYS - set(data)
    if missing:
        raise HTTPException(422, f"Content is missing: {', '.join(sorted(missing))}")
    unknown = set(data) - REQUIRED_KEYS
    if unknown:
        raise HTTPException(422, f"Unknown sections: {', '.join(sorted(unknown))}")
    if len(json.dumps(data)) > MAX_CONTENT_BYTES:
        raise HTTPException(413, "Content is too large.")
    for key in REQUIRED_KEYS - {"profile", "contact"}:
        if not isinstance(data[key], list):
            raise HTTPException(422, f"'{key}' must be a list.")
    updated_at = store.put(data)
    background.add_task(trigger_site_rebuild)
    return {"updated_at": updated_at, "site_rebuild": bool(settings.netlify_build_hook)}


@app.get("/api/import/github")
async def import_github(username: str, _: Account = Depends(require_admin)) -> Dict[str, Any]:
    return {"projects": await importers.github_projects(username)}


@app.get("/api/import/credly")
async def import_credly(username: str, _: Account = Depends(require_admin)) -> Dict[str, Any]:
    return {"certifications": await importers.credly_certifications(username)}


@app.post("/api/import/linkedin")
async def import_linkedin(file: UploadFile = File(...), _: Account = Depends(require_admin)) -> Dict[str, Any]:
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "File is larger than 20 MB.")
    return importers.linkedin_export(file.filename or "", data)
