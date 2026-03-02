# handlers.py
import os

from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

router = Router()

WEBAPP_URL = os.environ.get("WEBAPP_URL", "https://your-app.vercel.app")


@router.message(CommandStart())
async def cmd_start(msg: Message):
    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(
            text="🏋️ Open Workout App",
            web_app=WebAppInfo(url=WEBAPP_URL),
        )
    ]])
    await msg.answer("Hey, pussy! 💪\n\nTap the button to open the app.", reply_markup=kb)
