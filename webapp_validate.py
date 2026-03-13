"""Валидация Telegram Web App init_data для API."""
import hmac
import hashlib
import json
from typing import Optional
from urllib.parse import unquote


def validate_init_data(init_data: str, bot_token: str) -> Optional[dict]:
    """Проверяет подпись init_data и возвращает словарь параметров или None."""
    if not init_data or not bot_token:
        return None
    parsed = {}
    hash_val = ""
    for part in init_data.split("&"):
        if "=" not in part:
            continue
        key, value = part.split("=", 1)
        if key == "hash":
            hash_val = value
            continue
        parsed[key] = unquote(value)
    if not hash_val:
        return None
    data_check_string = "\n".join(f"{k}={parsed[k]}" for k in sorted(parsed))
    secret_key = hmac.new(
        b"WebAppData", bot_token.encode(), hashlib.sha256
    ).digest()
    expected_hash = hmac.new(
        secret_key, data_check_string.encode(), hashlib.sha256
    ).hexdigest()
    if expected_hash != hash_val:
        return None
    if "user" in parsed:
        parsed["user"] = json.loads(parsed["user"])
    return parsed
