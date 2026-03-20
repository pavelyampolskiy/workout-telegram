# simple_reminders.py - Простые напоминания в 8:00 и 16:00
import asyncio
import logging
from datetime import time, datetime
import os

logger = logging.getLogger(__name__)


async def send_reminder(bot, user_id, message):
    """Отправить напоминание пользователю"""
    try:
        from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
        
        webapp_url = os.environ.get("WEBAPP_URL", "https://workout-app.vercel.app")
        
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🏋️ Start Workout",
                    web_app={"url": webapp_url}
                )
            ]
        ])
        
        await bot.send_message(
            user_id,
            f"💪 *Workout Reminder*\n\n{message}",
            reply_markup=keyboard
        )
        logger.info(f"Sent reminder to user {user_id}")
    except Exception as e:
        logger.error(f"Error sending reminder to {user_id}: {e}")


async def check_and_send_reminders(bot):
    """Проверить и отправить напоминания в 8:00 и 16:00"""
    try:
        import database as db_ops
        from api import get_smart_reminder
        
        # Получаем всех пользователей
        users = db_ops.get_all_users()
        
        now = datetime.now()
        current_time = now.time()
        current_hour = current_time.hour
        
        # Отправляем в 8:00 и 16:00
        if current_hour in [8, 16]:
            logger.info(f"Checking reminders at {current_hour}:00")
            
            for user_id in users:
                try:
                    # Получаем умное напоминание
                    reminder_data = get_smart_reminder(user_id)
                    
                    if reminder_data and reminder_data.get("reminder"):
                        reminder = reminder_data["reminder"]
                        
                        # Добавляем время суток к сообщению
                        if current_hour == 8:
                            time_msg = "Good morning! ☀️"
                        else:
                            time_msg = "Good afternoon! 🌤️"
                        
                        full_message = f"{time_msg}\n\n{reminder}"
                        
                        await send_reminder(bot, user_id, full_message)
                        
                except Exception as e:
                    logger.error(f"Error processing user {user_id}: {e}")
                    
    except Exception as e:
        logger.error(f"Error in reminder check: {e}")


async def start_simple_reminders(bot):
    """Запустить простые напоминания"""
    async def reminder_loop():
        while True:
            try:
                await check_and_send_reminders(bot)
                # Проверяем каждый час
                await asyncio.sleep(60 * 60)  # 1 час
            except Exception as e:
                logger.error(f"Error in reminder loop: {e}")
                await asyncio.sleep(60)  # Подождать минуту при ошибке
    
    # Запускаем в фоне
    asyncio.create_task(reminder_loop())
    logger.info("Simple reminders started (8:00 and 16:00)")
