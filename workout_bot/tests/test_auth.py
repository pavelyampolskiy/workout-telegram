import hashlib
import hmac
import json
import urllib.parse

import pytest

import auth


FAKE_TOKEN = "1234567890:ABCDEFghijklmnopqrstuvwxyz0123456789"


def _build_init_data(token: str, user_id: int, extra: dict = None) -> str:
    """Build a valid Telegram WebApp initData string signed with token."""
    user_json = json.dumps({"id": user_id, "first_name": "Test"})
    params = {"user": user_json, "auth_date": "1700000000"}
    if extra:
        params.update(extra)
    data_check = "\n".join(f"{k}={v}" for k, v in sorted(params.items()))
    secret = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    sig = hmac.new(secret, data_check.encode(), hashlib.sha256).hexdigest()
    params["hash"] = sig
    return urllib.parse.urlencode(params)


# ── _validate ─────────────────────────────────────────────────────────────────

def test_validate_correct_hmac_returns_user_id(monkeypatch):
    monkeypatch.setattr(auth, "BOT_TOKEN", FAKE_TOKEN)
    init_data = _build_init_data(FAKE_TOKEN, user_id=42)
    assert auth._validate(init_data) == 42


def test_validate_different_user_ids(monkeypatch):
    monkeypatch.setattr(auth, "BOT_TOKEN", FAKE_TOKEN)
    for uid in [1, 99, 123456789]:
        init_data = _build_init_data(FAKE_TOKEN, user_id=uid)
        assert auth._validate(init_data) == uid


def test_validate_missing_hash_raises(monkeypatch):
    monkeypatch.setattr(auth, "BOT_TOKEN", FAKE_TOKEN)
    # initData without 'hash' param
    init_data = urllib.parse.urlencode({"user": '{"id": 1}', "auth_date": "1700000000"})
    with pytest.raises(ValueError, match="Missing hash"):
        auth._validate(init_data)


def test_validate_wrong_hash_raises(monkeypatch):
    monkeypatch.setattr(auth, "BOT_TOKEN", FAKE_TOKEN)
    init_data = _build_init_data(FAKE_TOKEN, user_id=1)
    # Tamper: replace hash with garbage
    params = dict(urllib.parse.parse_qsl(init_data))
    params["hash"] = "deadbeef" * 8
    tampered = urllib.parse.urlencode(params)
    with pytest.raises(ValueError, match="Invalid hash"):
        auth._validate(tampered)


def test_validate_wrong_token_raises(monkeypatch):
    monkeypatch.setattr(auth, "BOT_TOKEN", FAKE_TOKEN)
    # Build initData signed with a *different* token
    init_data = _build_init_data("9999999999:WRONGtokenwrongtokenwrongtoken0000", user_id=7)
    with pytest.raises(ValueError, match="Invalid hash"):
        auth._validate(init_data)


def test_validate_missing_user_id_raises(monkeypatch):
    monkeypatch.setattr(auth, "BOT_TOKEN", FAKE_TOKEN)
    # user JSON without "id" field
    user_json = json.dumps({"first_name": "NoId"})
    params = {"user": user_json, "auth_date": "1700000000"}
    data_check = "\n".join(f"{k}={v}" for k, v in sorted(params.items()))
    secret = hmac.new(b"WebAppData", FAKE_TOKEN.encode(), hashlib.sha256).digest()
    sig = hmac.new(secret, data_check.encode(), hashlib.sha256).hexdigest()
    params["hash"] = sig
    init_data = urllib.parse.urlencode(params)
    with pytest.raises(ValueError, match="No user.id"):
        auth._validate(init_data)


def test_validate_empty_user_json_raises(monkeypatch):
    monkeypatch.setattr(auth, "BOT_TOKEN", FAKE_TOKEN)
    params = {"user": "{}", "auth_date": "1700000000"}
    data_check = "\n".join(f"{k}={v}" for k, v in sorted(params.items()))
    secret = hmac.new(b"WebAppData", FAKE_TOKEN.encode(), hashlib.sha256).digest()
    sig = hmac.new(secret, data_check.encode(), hashlib.sha256).hexdigest()
    params["hash"] = sig
    init_data = urllib.parse.urlencode(params)
    with pytest.raises(ValueError, match="No user.id"):
        auth._validate(init_data)


def test_validate_data_mutated_after_signing_raises(monkeypatch):
    monkeypatch.setattr(auth, "BOT_TOKEN", FAKE_TOKEN)
    init_data = _build_init_data(FAKE_TOKEN, user_id=5)
    # Inject extra field after signing — changes data_check string
    init_data += "&extra=tampered"
    with pytest.raises(ValueError, match="Invalid hash"):
        auth._validate(init_data)


# ── get_current_user ──────────────────────────────────────────────────────────

def test_get_current_user_no_header_raises_401():
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        auth.get_current_user(x_telegram_init_data=None)
    assert exc_info.value.status_code == 401
    assert "Missing" in exc_info.value.detail


def test_get_current_user_no_bot_token_raises_401(monkeypatch):
    from fastapi import HTTPException
    monkeypatch.setattr(auth, "BOT_TOKEN", "")
    with pytest.raises(HTTPException) as exc_info:
        auth.get_current_user(x_telegram_init_data="anything")
    assert exc_info.value.status_code == 401
    assert "not configured" in exc_info.value.detail


def test_get_current_user_invalid_data_raises_401(monkeypatch):
    from fastapi import HTTPException
    monkeypatch.setattr(auth, "BOT_TOKEN", FAKE_TOKEN)
    with pytest.raises(HTTPException) as exc_info:
        auth.get_current_user(x_telegram_init_data="garbage=data&hash=badhash")
    assert exc_info.value.status_code == 401


def test_get_current_user_valid_returns_user_id(monkeypatch):
    monkeypatch.setattr(auth, "BOT_TOKEN", FAKE_TOKEN)
    init_data = _build_init_data(FAKE_TOKEN, user_id=777)
    result = auth.get_current_user(x_telegram_init_data=init_data)
    assert result == 777
