# bot.py
"""
Entry point. Run with:
    BOT_TOKEN=<your_token> python bot.py
"""
import asyncio
import logging
import os

from aiohttp import web
from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage

import database as db_ops
from handlers import router
from webapp_validate import validate_init_data

logging.basicConfig(level=logging.INFO)


async def _health(_request: web.Request) -> web.Response:
    """Для Railway: ответ на health check по PORT."""
    return web.Response(text="ok", status=200)


def _webapp_paths():
    """Несколько возможных путей к index.html (разный cwd в Docker/локально)."""
    base = os.path.dirname(os.path.abspath(__file__))
    yield os.path.join(base, "webapp", "index.html")
    yield os.path.join(os.getcwd(), "webapp", "index.html")


async def _serve_miniapp(_request: web.Request) -> web.Response:
    """Отдаём Mini App по корню /, чтобы по основной ссылке открывалось приложение, а не «ok»."""
    body = None
    tried = []
    for path in _webapp_paths():
        tried.append(path)
        if os.path.isfile(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    body = f.read()
                break
            except Exception as e:
                logging.warning("webapp read %s: %s", path, e)
    if not body:
        logging.warning("webapp index.html not found, tried: %s", tried)
        return web.Response(text="ok", status=200)
    return web.Response(text=body, content_type="text/html; charset=utf-8")


async def _api_set(request: web.Request) -> web.Response:
    """POST /api/set — сохранение сета из Mini App (вес поддерживает дробные)."""
    try:
        body = await request.json()
    except Exception:
        return web.json_response({"ok": False, "error": "Invalid JSON"}, status=400)
    try:
        ex_id = body.get("ex_id")
        weight = body.get("weight")
        reps = body.get("reps")
        init_data = body.get("init_data") or ""
        bot_token = request.app.get("bot_token")
        if not bot_token:
            return web.json_response({"ok": False, "error": "Server error"}, status=500)
        parsed = validate_init_data(init_data, bot_token)
        if not parsed or "user" not in parsed:
            return web.json_response({"ok": False, "error": "Invalid init_data"}, status=401)
        user_id = parsed["user"].get("id")
        if ex_id is None or weight is None or reps is None:
            return web.json_response({"ok": False, "error": "Missing ex_id, weight or reps"}, status=400)
        try:
            ex_id = int(ex_id)
            weight = float(weight)
            reps = int(reps)
        except (TypeError, ValueError):
            return web.json_response({"ok": False, "error": "Invalid numbers"}, status=400)
        if weight <= 0 or reps < 1 or reps > 100:
            return web.json_response({"ok": False, "error": "Weight > 0, reps 1–100"}, status=400)
        ex = db_ops.get_exercise(ex_id)
        if not ex:
            return web.json_response({"ok": False, "error": "Exercise not found"}, status=404)
        workout = db_ops.get_workout(ex["workout_id"])
        if not workout or workout["user_id"] != user_id:
            return web.json_response({"ok": False, "error": "Access denied"}, status=403)
        sets = db_ops.get_sets_for_exercise(ex_id)
        db_ops.add_set(ex_id, len(sets) + 1, weight, reps)
        return web.json_response({"ok": True})
    except Exception as e:
        logging.exception("api_set: %s", e)
        return web.json_response({"ok": False, "error": "Internal error"}, status=500)


async def main():
    token = os.environ.get("BOT_TOKEN") or os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        raise RuntimeError("BOT_TOKEN or TELEGRAM_BOT_TOKEN environment variable is not set!")

    db_ops.init_db()

    # Слушаем PORT, чтобы Railway не считал сервис упавшим (health check)
    port = int(os.environ.get("PORT", "8080"))
    app = web.Application()
    app["bot_token"] = token
    app.router.add_get("/health", _health)
    app.router.add_get("/", _serve_miniapp)
    app.router.add_post("/api/set", _api_set)
    webapp_path = os.path.join(os.path.dirname(__file__), "webapp")
    if os.path.isdir(webapp_path):
        app.router.add_static("/app", webapp_path, name="webapp")
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", port)
    await site.start()
    logging.info("Health check server on 0.0.0.0:%s", port)

    bot = Bot(token=token)
    dp = Dispatcher(storage=MemoryStorage())
    dp.include_router(router)

    logging.info("Bot starting…")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
