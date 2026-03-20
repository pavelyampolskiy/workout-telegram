# bot.py
"""
Entry point. Run with:
    BOT_TOKEN=<your_token> WEBAPP_URL=<vercel_url> python bot.py
"""
import asyncio
import logging
import os

import uvicorn
from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage

import database as db_ops
from api import app as fastapi_app, set_bot_instance
from handlers import router
from simple_reminders import start_simple_reminders

logging.basicConfig(level=logging.INFO)


async def main():
    token = os.environ.get("BOT_TOKEN") or os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        raise RuntimeError("BOT_TOKEN or TELEGRAM_BOT_TOKEN environment variable is not set!")

    db_ops.init_db()

    bot = Bot(token=token)
    set_bot_instance(bot)  # Make bot available to API
    dp = Dispatcher(storage=MemoryStorage())
    dp.include_router(router)

    # Запускаем простые напоминания
    await start_simple_reminders(bot)
    logging.info("Simple reminders started (8:00 and 16:00)")

    port = int(os.environ.get("PORT", 8000))
    config = uvicorn.Config(fastapi_app, host="0.0.0.0", port=port, log_level="warning")
    server = uvicorn.Server(config)

    logging.info("Bot + API starting on port %d…", port)
    await asyncio.gather(server.serve(), dp.start_polling(bot))


if __name__ == "__main__":
    asyncio.run(main())
