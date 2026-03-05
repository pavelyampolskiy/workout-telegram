# auth.py
import hashlib
import hmac
import json
import os
from urllib.parse import parse_qsl

from fastapi import Header, HTTPException

BOT_TOKEN = os.getenv("BOT_TOKEN") or os.getenv("TELEGRAM_BOT_TOKEN", "")


def _validate(init_data: str) -> int:
    """Verify Telegram WebApp initData HMAC and return user_id."""
    params = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = params.pop("hash", None)
    if not received_hash:
        raise ValueError("Missing hash")

    data_check = "\n".join(f"{k}={v}" for k, v in sorted(params.items()))
    secret = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    expected = hmac.new(secret, data_check.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(received_hash, expected):
        raise ValueError("Invalid hash")

    user = json.loads(params.get("user", "{}"))
    uid = user.get("id")
    if not uid:
        raise ValueError("No user.id in initData")
    return int(uid)


def get_current_user(x_telegram_init_data: str = Header(None)) -> int:
    if not x_telegram_init_data:
        raise HTTPException(status_code=401, detail="Missing X-Telegram-Init-Data header")
    if not BOT_TOKEN:
        raise HTTPException(status_code=401, detail="Server not configured for auth")
    try:
        return _validate(x_telegram_init_data)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
