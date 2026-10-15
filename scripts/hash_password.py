"""Create the bcrypt hash for your admin password.

Usage:
    pip install bcrypt
    python scripts/hash_password.py

Paste the printed hash into Render as ADMIN_PASSWORD_HASH. Your plain password is never stored anywhere.
"""
import getpass

import bcrypt

pw = getpass.getpass("New admin password: ")
if len(pw) < 10:
    raise SystemExit("Use at least 10 characters.")
if pw != getpass.getpass("Repeat password: "):
    raise SystemExit("Passwords don't match.")
print(bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8"))
