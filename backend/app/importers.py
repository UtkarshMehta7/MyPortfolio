"""Pull profile data from GitHub, Credly and a LinkedIn data export, mapped to portfolio item drafts."""
import csv
import io
import re
import zipfile
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException

from .config import settings

USERNAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9-_.]{0,62}$")


def _check_username(u: str) -> str:
    u = (u or "").strip().strip("/").split("/")[-1]
    if not USERNAME_RE.match(u):
        raise HTTPException(400, "That doesn't look like a valid username.")
    return u


def _mon_yy(iso: Optional[str]) -> str:
    if not iso:
        return ""
    try:
        d = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return d.strftime("%b %y").upper()
    except ValueError:
        return ""


def _mon_yyyy(text: str) -> str:
    """'Jul 2026', '2026-07-15' or '2026' -> 'JUL 2026'."""
    text = (text or "").strip()
    for fmt in ("%b %Y", "%Y-%m-%d", "%Y-%m", "%m/%Y", "%Y"):
        try:
            d = datetime.strptime(text, fmt)
            return d.strftime("%b %Y").upper() if fmt != "%Y" else d.strftime("%Y")
        except ValueError:
            continue
    return text.upper()


def _pretty(name: str) -> str:
    return re.sub(r"[-_]+", " ", name).strip().title()


# ---------------- GitHub ----------------
async def github_projects(username: str) -> List[Dict[str, Any]]:
    user = _check_username(username)
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "terminal-utkarsh-portfolio"}
    if settings.github_token:
        headers["Authorization"] = f"Bearer {settings.github_token}"
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(f"https://api.github.com/users/{user}/repos", params={"per_page": 100, "sort": "pushed"}, headers=headers)
    if r.status_code == 404:
        raise HTTPException(404, "GitHub user not found.")
    if r.status_code == 403:
        raise HTTPException(429, "GitHub rate limit reached. Try again later or set GITHUB_TOKEN on the server.")
    r.raise_for_status()
    out = []
    for repo in r.json():
        if repo.get("fork") or repo.get("archived"):
            continue
        name = repo["name"]
        topics = repo.get("topics") or []
        stack = " · ".join([x for x in [repo.get("language")] + [t.replace("-", " ").title() for t in topics[:4]] if x])
        letters = re.sub(r"[^A-Z]", "", name.upper())[:3] or "GH"
        out.append({
            "date": _mon_yy(repo.get("pushed_at")),
            "code": f"{letters} {len(name) * 37 % 900 + 100}",
            "board_name": _pretty(name).upper()[:14],
            "status": "BOARDING" if repo.get("homepage") else "IN HANGAR",
            "stack": stack,
            "title": _pretty(name),
            "description": repo.get("description") or "",
            "live_url": repo.get("homepage") or "",
            "source_url": repo["html_url"],
            "repo": name,
            "stars": repo.get("stargazers_count", 0),
            "pushed_at": repo.get("pushed_at") or "",
        })
    return out


# ---------------- Credly ----------------
def _cert_color(issuer: str) -> str:
    i = issuer.lower()
    if "amazon" in i or "aws" in i:
        return "aws"
    if "google" in i:
        return "gcp"
    if "oracle" in i:
        return "oci"
    return "other"


async def credly_certifications(username: str) -> List[Dict[str, Any]]:
    user = _check_username(username)
    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        r = await client.get(f"https://www.credly.com/users/{user}/badges.json", headers={"Accept": "application/json", "User-Agent": "terminal-utkarsh-portfolio"})
    if r.status_code == 404:
        raise HTTPException(404, "Credly profile not found, or it isn't public.")
    r.raise_for_status()
    out = []
    for b in r.json().get("data", []):
        tpl = b.get("badge_template") or {}
        issuer = ""
        for ent in (b.get("issuer") or {}).get("entities", []):
            issuer = (ent.get("entity") or {}).get("name") or issuer
        issuer = issuer.replace("Amazon Web Services Training and Certification", "AWS")
        out.append({
            "issuer": issuer,
            "name": tpl.get("name", ""),
            "date": _mon_yyyy(b.get("issued_at_date", "")),
            "color": _cert_color(issuer),
            "url": f"https://www.credly.com/badges/{b.get('id')}/public_url",
        })
    return out


# ---------------- LinkedIn export ----------------
def _read_csv(raw: bytes, required: str) -> List[Dict[str, str]]:
    text = raw.decode("utf-8-sig", errors="replace")
    lines = text.splitlines()
    # Some LinkedIn CSVs start with a "Notes:" preamble; start at the real header row.
    start = next((i for i, line in enumerate(lines) if required in line), 0)
    return list(csv.DictReader(io.StringIO("\n".join(lines[start:]))))


def _g(row: Dict[str, Optional[str]], key: str) -> str:
    return (row.get(key) or "").strip()


def _range(start: str, end: str) -> Dict[str, str]:
    s, e = _mon_yyyy(start), _mon_yyyy(end) if end else "PRESENT"
    s_mon, s_year = (s.split(" ") + [""])[:2] if " " in s else ("", s)
    e_mon, e_year = (e.split(" ") + [""])[:2] if " " in e else ("", e)
    if s_year and s_year == e_year and s_mon and e_mon:
        return {"date_top": f"{s_mon}–{e_mon}", "date_bottom": s_year}
    return {"date_top": f"{s}–", "date_bottom": e}


def linkedin_export(filename: str, data: bytes) -> Dict[str, Any]:
    files: Dict[str, bytes] = {}
    if filename.lower().endswith(".zip"):
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as zf:
                for info in zf.infolist():
                    base = info.filename.rsplit("/", 1)[-1]
                    if base.lower().endswith(".csv") and info.file_size < 5_000_000:
                        files[base.lower()] = zf.read(info)
        except zipfile.BadZipFile:
            raise HTTPException(400, "That ZIP file couldn't be read.")
    elif filename.lower().endswith(".csv"):
        files[filename.rsplit("/", 1)[-1].lower()] = data
    else:
        raise HTTPException(400, "Upload the LinkedIn export ZIP or one of its CSV files.")

    logbook, certs, projects, skills = [], [], [], []

    if "positions.csv" in files:
        for row in _read_csv(files["positions.csv"], "Company Name"):
            desc = _g(row, "Description")
            bullets = [b.strip(" •-\t") for b in re.split(r"\n|•", desc) if b.strip(" •-\t")]
            logbook.append({
                **_range(_g(row, "Started On"), _g(row, "Finished On")),
                "type": " · ".join(x for x in ["Experience", _g(row, "Location")] if x),
                "title": ", ".join(x for x in [_g(row, "Title"), _g(row, "Company Name")] if x),
                "bullets": bullets, "text": "", "link_label": "", "link_url": "",
            })
    if "education.csv" in files:
        for row in _read_csv(files["education.csv"], "School Name"):
            logbook.append({
                **_range(_g(row, "Start Date"), _g(row, "End Date")),
                "type": "Education",
                "title": " · ".join(x for x in [_g(row, "Degree Name"), _g(row, "School Name")] if x),
                "bullets": [], "text": _g(row, "Notes") or _g(row, "Activities"),
                "link_label": "", "link_url": "",
            })
    if "certifications.csv" in files:
        for row in _read_csv(files["certifications.csv"], "Authority"):
            issuer = _g(row, "Authority")
            certs.append({
                "issuer": issuer, "name": _g(row, "Name"),
                "date": _mon_yyyy(_g(row, "Started On")), "color": _cert_color(issuer),
                "url": _g(row, "Url"),
            })
    if "projects.csv" in files:
        for row in _read_csv(files["projects.csv"], "Title"):
            title = _g(row, "Title")
            projects.append({
                "date": _mon_yyyy(_g(row, "Started On")).replace(" 20", " "),
                "code": (re.sub(r"[^A-Z]", "", title.upper())[:3] or "PRJ") + " 100",
                "board_name": title.upper()[:14], "status": "BOARDING", "stack": "",
                "title": title, "description": _g(row, "Description"),
                "live_url": _g(row, "Url"), "source_url": "",
            })
    if "skills.csv" in files:
        skills = [_g(r, "Name") for r in _read_csv(files["skills.csv"], "Name") if _g(r, "Name")]

    if not (logbook or certs or projects or skills):
        raise HTTPException(400, "No Positions, Education, Certifications, Projects or Skills data found in that file.")
    return {"logbook": logbook, "certifications": certs, "projects": projects, "skills": skills}
