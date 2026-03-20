# bot.py
"""
Entry point. Run with:
    BOT_TOKEN=<your_token> WEBAPP_URL=<vercel_url> python bot.py
"""
import asyncio
import logging
import os
from datetime import time

import uvicorn
from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage

import database as db_ops
from api import app as fastapi_app, set_bot_instance
from handlers import router

logging.basicConfig(level=logging.INFO)


async def reminder_scheduler():
    """Background task to schedule workout reminders"""
    while True:
        try:
            from datetime import datetime
            now = datetime.now()
            
            # Morning reminder at 8:00 AM
            if now.hour == 8 and now.minute == 0:
                logging.info("Sending morning workout reminders...")
                try:
                    import requests
                    response = requests.post(
                        "http://localhost:8000/api/send-daily-reminders",
                        json={"time_of_day": "morning"}
                    )
                    logging.info(f"Morning reminders sent: {response.json()}")
                except Exception as e:
                    logging.error(f"Failed to send morning reminders: {e}")
            
            # Inactivity reminders at 12:00 PM
            if now.hour == 12 and now.minute == 0:
                logging.info("Sending inactivity reminders...")
                try:
                    import requests
                    response = requests.post(
                        "http://localhost:8000/api/inactivity-reminders",
                        json={}
                    )
                    logging.info(f"Inactivity reminders sent: {response.json()}")
                except Exception as e:
                    logging.error(f"Failed to send inactivity reminders: {e}")
            
            # Evening reminder at 4:00 PM (16:00)
            if now.hour == 16 and now.minute == 0:
                logging.info("Sending evening workout reminders...")
                try:
                    import requests
                    response = requests.post(
                        "http://localhost:8000/api/send-daily-reminders",
                        json={"time_of_day": "evening"}
                    )
                    logging.info(f"Evening reminders sent: {response.json()}")
                except Exception as e:
                    logging.error(f"Failed to send evening reminders: {e}")
            
            # Check every minute
            await asyncio.sleep(60)
            
        except Exception as e:
            logging.error(f"Scheduler error: {e}")
            await asyncio.sleep(60)


async def main():
    token = os.environ.get("BOT_TOKEN") or os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        raise RuntimeError("BOT_TOKEN or TELEGRAM_BOT_TOKEN environment variable is not set!")

    db_ops.init_db()

    bot = Bot(token=token)
    set_bot_instance(bot)  # Make bot available to API
    dp = Dispatcher(storage=MemoryStorage())
    dp.include_router(router)

    port = int(os.environ.get("PORT", 8000))
    config = uvicorn.Config(fastapi_app, host="0.0.0.0", port=port, log_level="warning")
    server = uvicorn.Server(config)

    logging.info("Bot + API starting on port %d…", port)
    
    # Start all tasks: server, bot polling, and reminder scheduler
    await asyncio.gather(
        server.serve(), 
        dp.start_polling(bot),
        reminder_scheduler()
    )


if __name__ == "__main__":
    asyncio.run(main())
