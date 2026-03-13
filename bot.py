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

logging.basicConfig(level=logging.INFO)


async def _health(_request: web.Request) -> web.Response:
    """Для Railway: ответ на health check по PORT."""
    return web.Response(text="ok", status=200)


async def main():
    token = os.environ.get("BOT_TOKEN") or os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        raise RuntimeError("BOT_TOKEN or TELEGRAM_BOT_TOKEN environment variable is not set!")

    db_ops.init_db()

    # Слушаем PORT, чтобы Railway не считал сервис упавшим (health check)
    port = int(os.environ.get("PORT", "8080"))
    app = web.Application()
    app.router.add_get("/", _health)
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
