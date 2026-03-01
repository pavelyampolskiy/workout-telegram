# keyboards.py
from aiogram.types import InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder


def cb(*parts: str) -> str:
    return "|".join(parts)


def kb_home() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="🆕 Новая тренировка", callback_data=cb("new", "open"))
    kb.button(text="📋 Программа", callback_data=cb("prog", "open"))
    kb.button(text="🗓 История", callback_data=cb("hist", "open"))
    kb.button(text="📈 Статистика", callback_data=cb("stats", "open"))
    kb.adjust(2, 2)
    return kb.as_markup()


def kb_new_workout() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="Day A", callback_data=cb("new", "day", "DAY_A"))
    kb.button(text="Day B", callback_data=cb("new", "day", "DAY_B"))
    kb.button(text="Day C", callback_data=cb("new", "day", "DAY_C"))
    kb.button(text="❤️ Кардио", callback_data=cb("new", "cardio"))
    kb.button(text="⬅️ Назад", callback_data=cb("home", "open"))
    kb.adjust(3, 1, 1)
    return kb.as_markup()


def kb_day_menu(day: str, exercise_buttons: list[str]) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    for idx, title in enumerate(exercise_buttons):
        kb.button(text=title, callback_data=cb("day", "ex", str(idx)))
    kb.button(text="✅ Сохранить тренировку", callback_data=cb("day", "save", day))
    kb.button(text="🗑 Отменить", callback_data=cb("day", "cancel", day))
    kb.button(text="⬅️ Назад", callback_data=cb("new", "open"))
    kb.adjust(1, 1, 1, 1, 1, 1, 2, 1)
    return kb.as_markup()


def kb_cancel_confirm(day: str) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="✅ Да", callback_data=cb("cancel", "yes", day))
    kb.button(text="⬅️ Нет", callback_data=cb("cancel", "no", day))
    kb.adjust(2)
    return kb.as_markup()


def kb_set_input(day: str) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="✅ Сохранить сет", callback_data=cb("set", "save", day))
    kb.button(text="➕ Следующий сет", callback_data=cb("set", "next", day))
    kb.button(text="✏️ Исправить последний", callback_data=cb("set", "edit_last", day))
    kb.button(text="🗑 Удалить последний", callback_data=cb("set", "delete_last", day))
    kb.button(text="📌 Завершить упражнение", callback_data=cb("set", "finish_ex", day))
    kb.button(text="⬅️ К упражнениям", callback_data=cb("set", "back_to_day", day))
    kb.button(text="🗑 Отменить тренировку", callback_data=cb("set", "cancel", day))
    kb.adjust(2, 2, 2, 1)
    return kb.as_markup()


def kb_cardio() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="⬅️ Назад", callback_data=cb("new", "open"))
    kb.adjust(1)
    return kb.as_markup()


def kb_program() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="Day A", callback_data=cb("prog", "day", "DAY_A"))
    kb.button(text="Day B", callback_data=cb("prog", "day", "DAY_B"))
    kb.button(text="Day C", callback_data=cb("prog", "day", "DAY_C"))
    kb.button(text="⬅️ Назад", callback_data=cb("home", "open"))
    kb.adjust(3, 1)
    return kb.as_markup()


def kb_program_day(day: str) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text=f"🆕 Начать {day.replace('DAY_', 'Day ')}", callback_data=cb("new", "day", day))
    kb.button(text="⬅️ Назад", callback_data=cb("prog", "open"))
    kb.adjust(1, 1)
    return kb.as_markup()


def kb_history(items: list[tuple[str, str]], has_more: bool) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    for workout_id, title in items:
        kb.button(text=title, callback_data=cb("hist", "item", workout_id))
    if has_more:
        kb.button(text="🔄 Ещё", callback_data=cb("hist", "more"))
    kb.button(text="⬅️ Назад", callback_data=cb("home", "open"))
    rows = [1] * len(items)
    rows.append(2 if has_more else 1)
    kb.adjust(*rows)
    return kb.as_markup()


def kb_history_entry(workout_id: str) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="✏️ Редактировать", callback_data=cb("entry", "edit", workout_id))
    kb.button(text="🗑 Удалить", callback_data=cb("entry", "delete", workout_id))
    kb.button(text="⬅️ Назад к списку", callback_data=cb("hist", "open"))
    kb.adjust(2, 1)
    return kb.as_markup()


def kb_delete_confirm(workout_id: str) -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="✅ Да", callback_data=cb("del", "yes", workout_id))
    kb.button(text="⬅️ Нет", callback_data=cb("del", "no", workout_id))
    kb.adjust(2)
    return kb.as_markup()


def kb_stats() -> InlineKeyboardMarkup:
    kb = InlineKeyboardBuilder()
    kb.button(text="📆 Неделя", callback_data=cb("stats", "week"))
    kb.button(text="📅 Месяц", callback_data=cb("stats", "month"))
    kb.button(text="🔥 Частота", callback_data=cb("stats", "freq"))
    kb.button(text="⬅️ Назад", callback_data=cb("home", "open"))
    kb.adjust(3, 1)
    return kb.as_markup()


def kb_history_edit_select_ex(exercises: list[tuple[str, str]]) -> InlineKeyboardMarkup:
    """exercises: list of (ex_id, label)"""
    kb = InlineKeyboardBuilder()
    for ex_id, label in exercises:
        kb.button(text=label, callback_data=cb("hedit", "ex", ex_id))
    kb.button(text="⬅️ Назад", callback_data=cb("hist", "open"))
    kb.adjust(*([1] * len(exercises)), 1)
    return kb.as_markup()


def kb_history_edit_select_set(sets: list[tuple[str, str]], ex_id: str) -> InlineKeyboardMarkup:
    """sets: list of (set_id, label)"""
    kb = InlineKeyboardBuilder()
    for set_id, label in sets:
        kb.button(text=label, callback_data=cb("hedit", "set", set_id))
    kb.button(text="⬅️ Назад", callback_data=cb("hedit", "back_ex", ex_id))
    kb.adjust(*([1] * len(sets)), 1)
    return kb.as_markup()
