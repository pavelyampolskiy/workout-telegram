# handlers.py
"""
All bot handlers organized by screen/flow.
Register them via register_handlers(dp).
"""
from datetime import date, timedelta

from aiogram import Router, F
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.types import Message, CallbackQuery

import database as db_ops
from keyboards import (
    kb_home, kb_new_workout, kb_day_menu, kb_cancel_confirm,
    kb_set_input, kb_rest_timer, kb_cardio, kb_program, kb_program_day,
    kb_history, kb_history_entry, kb_delete_confirm, kb_stats,
    kb_history_edit_select_ex, kb_history_edit_select_set,
    kb_add_custom_exercise,
)
from parser import parse_set
from program import PROGRAM, exercise_buttons
from states import Flow

router = Router()

HISTORY_PAGE_SIZE = 10


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

async def send_home(target, state: FSMContext, keep_data: bool = False):
    await state.set_state(Flow.home)
    if not keep_data:
        await state.update_data({})  # clear session data
    
    # Check for active workout
    user_id = target.from_user.id
    active = db_ops.get_active_workout(user_id)
    
    text = "Главное меню"
    if active:
        day_label = active["type"].replace("DAY_", "Day ")
        text = f"⚠️ У вас есть незавершённая тренировка ({day_label})\n\nГлавное меню"
    
    if isinstance(target, CallbackQuery):
        await target.message.edit_text(text, reply_markup=kb_home(active))
        await target.answer()
    else:
        await target.answer(text, reply_markup=kb_home(active))


async def safe_edit(cq: CallbackQuery, text: str, markup):
    try:
        await cq.message.edit_text(text, reply_markup=markup)
    except Exception:
        await cq.message.answer(text, reply_markup=markup)
    await cq.answer()


def day_label(day: str) -> str:
    return day.replace("DAY_", "Day ")


def get_exercise_info(data: dict, day: str) -> dict:
    """Get exercise info from PROGRAM or custom_ex_info in state."""
    ex_idx = data.get("current_ex_idx")
    if ex_idx is not None:
        return PROGRAM[day][ex_idx]
    return data.get("custom_ex_info", {"group": "UNKNOWN", "name": "Unknown", "target_sets": 4})


def format_history_title(w) -> str:
    d = w["date"]
    if w["type"] == "CARDIO":
        return f"❤️ {d}"
    return f"{d} — {day_label(w['type'])}"


# ─────────────────────────────────────────────────────────────────────────────
# Screen 0 — HOME
# ─────────────────────────────────────────────────────────────────────────────

@router.message(CommandStart())
async def cmd_start(msg: Message, state: FSMContext):
    await send_home(msg, state)


@router.callback_query(F.data == "home|open")
async def cb_home(cq: CallbackQuery, state: FSMContext):
    await send_home(cq, state)


# ─────────────────────────────────────────────────────────────────────────────
# Resume Workout
# ─────────────────────────────────────────────────────────────────────────────

@router.callback_query(F.data.startswith("resume|workout|"))
async def cb_resume_workout(cq: CallbackQuery, state: FSMContext):
    workout_id = int(cq.data.split("|")[2])
    w = db_ops.get_workout(workout_id)
    if not w:
        await cq.answer("Тренировка не найдена", show_alert=True)
        await send_home(cq, state)
        return
    
    day = w["type"]
    await state.set_state(Flow.day_menu)
    await state.update_data(
        day=day,
        workout_id=workout_id,
        current_ex_idx=None,
        current_ex_db_id=None,
        pending_set_text=None,
    )
    
    buttons = exercise_buttons(day)
    await safe_edit(cq, f"▶️ Продолжаем {day_label(day)} — выбери упражнение", kb_day_menu(day, buttons))


# ─────────────────────────────────────────────────────────────────────────────
# Screen 1 — NEW WORKOUT
# ─────────────────────────────────────────────────────────────────────────────

@router.callback_query(F.data == "new|open")
async def cb_new_open(cq: CallbackQuery, state: FSMContext):
    await state.set_state(Flow.new_workout)
    await safe_edit(cq, "Выбери тренировку", kb_new_workout())


# ─────────────────────────────────────────────────────────────────────────────
# Screen 2A/2B/2C — DAY WORKOUT
# ─────────────────────────────────────────────────────────────────────────────

@router.callback_query(F.data.startswith("new|day|"))
async def cb_new_day(cq: CallbackQuery, state: FSMContext):
    day = cq.data.split("|")[2]
    user_id = cq.from_user.id

    # Create workout record
    workout_id = db_ops.create_workout(user_id, day)
    await state.set_state(Flow.day_menu)
    await state.update_data(
        day=day,
        workout_id=workout_id,
        current_ex_idx=None,
        current_ex_db_id=None,
        pending_set_text=None,
    )

    buttons = exercise_buttons(day)
    await safe_edit(cq, f"{day_label(day)} — выбери упражнение", kb_day_menu(day, buttons))


@router.callback_query(F.data.startswith("day|ex|"))
async def cb_day_ex(cq: CallbackQuery, state: FSMContext):
    idx = int(cq.data.split("|")[2])
    data = await state.get_data()
    day = data["day"]
    workout_id = data["workout_id"]
    ex_info = PROGRAM[day][idx]

    # Create or find the exercise entry in DB
    existing = db_ops.get_exercises_for_workout(workout_id)
    ex_db = next((e for e in existing if e["name"] == ex_info["name"]), None)
    if ex_db is None:
        ex_db_id = db_ops.create_exercise(workout_id, ex_info["group"], ex_info["name"], ex_info["target_sets"])
    else:
        ex_db_id = ex_db["id"]

    sets = db_ops.get_sets_for_exercise(ex_db_id)
    k = len(sets) + 1
    target = ex_info["target_sets"]

    await state.set_state(Flow.set_input)
    await state.update_data(current_ex_idx=idx, current_ex_db_id=ex_db_id, pending_set_text=None)

    label = f"{ex_info['group']} — {ex_info['name']}"
    text = f"{label} — сет {k}/{target}\nФормат: 140x12"
    await safe_edit(cq, text, kb_set_input(day))


@router.callback_query(F.data.startswith("day|save|"))
async def cb_day_save(cq: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    workout_id = data.get("workout_id")
    # workout already persisted, just go home
    await state.set_state(Flow.home)
    await safe_edit(cq, "✅ Тренировка сохранена!\n\nГлавное меню", kb_home())


@router.callback_query(F.data.startswith("day|cancel|"))
async def cb_day_cancel(cq: CallbackQuery, state: FSMContext):
    day = cq.data.split("|")[2]
    await safe_edit(cq, "Отменить тренировку? Данные не сохранятся.", kb_cancel_confirm(day))


@router.callback_query(F.data.startswith("cancel|yes|"))
async def cb_cancel_yes(cq: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    workout_id = data.get("workout_id")
    if workout_id:
        db_ops.delete_workout(workout_id)
    await send_home(cq, state)


@router.callback_query(F.data.startswith("cancel|no|"))
async def cb_cancel_no(cq: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    day = data.get("day", cq.data.split("|")[2])
    workout_id = data.get("workout_id")
    buttons = exercise_buttons(day)
    custom = get_custom_exercises_for_workout(workout_id) if workout_id else []
    await state.set_state(Flow.day_menu)
    await safe_edit(cq, f"{day_label(day)} — выбери упражнение", kb_day_menu(day, buttons, custom))


# ─────────────────────────────────────────────────────────────────────────────
# Screen 3Set — SET INPUT (text messages)
# ─────────────────────────────────────────────────────────────────────────────

@router.message(Flow.set_input)
async def msg_set_input(msg: Message, state: FSMContext):
    data = await state.get_data()
    day = data["day"]
    ex_db_id = data["current_ex_db_id"]
    ex_info = get_exercise_info(data, day)

    try:
        entry = parse_set(msg.text.strip())
    except ValueError as e:
        await msg.answer(str(e))
        return

    await state.update_data(pending_set_text=msg.text.strip())

    sets = db_ops.get_sets_for_exercise(ex_db_id)
    k = len(sets) + 1
    target = ex_info["target_sets"]
    label = f"{ex_info['group']} — {ex_info['name']}"

    lines = [f"{label} — сет {k}/{target}", f"Введено: {entry.weight}кг × {entry.reps} повт."]
    if sets:
        lines.append("\nЗаписанные сеты:")
        for s in sets:
            lines.append(f"  Сет {s['set_number']}: {s['weight']}кг × {s['reps']}")

    await msg.answer("\n".join(lines), reply_markup=kb_set_input(day))


# Default rest times by muscle group (in seconds)
REST_TIMES = {
    "LEGS": 180,      # 3 minutes for legs
    "BACK": 90,
    "CHEST": 90,
    "BICEPS": 60,
    "TRICEPS": 60,
    "SHOULDERS": 90,
}
DEFAULT_REST_TIME = 90


@router.callback_query(F.data.startswith("set|save|"))
async def cb_set_save(cq: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    day = data["day"]
    ex_db_id = data["current_ex_db_id"]
    ex_idx = data["current_ex_idx"]
    pending = data.get("pending_set_text")

    if not pending:
        await cq.answer("Сначала введите сет в формате 140x12", show_alert=True)
        return

    entry = parse_set(pending)
    sets = db_ops.get_sets_for_exercise(ex_db_id)
    db_ops.add_set(ex_db_id, len(sets) + 1, entry.weight, entry.reps)
    await state.update_data(pending_set_text=None)

    ex_info = get_exercise_info(data, day)
    sets_updated = db_ops.get_sets_for_exercise(ex_db_id)
    target = ex_info["target_sets"]
    label = f"{ex_info['group']} — {ex_info['name']}"

    # Get rest time based on muscle group
    rest_time = REST_TIMES.get(ex_info["group"], DEFAULT_REST_TIME)
    
    lines = [f"✅ Сет сохранён! ({len(sets_updated)}/{target})"]
    lines.append(f"\n⏱ Отдых: {rest_time} сек")
    lines.append(f"\n{label}")
    lines.append("\nЗаписанные сеты:")
    for s in sets_updated:
        lines.append(f"  Сет {s['set_number']}: {s['weight']}кг × {s['reps']}")

    await state.set_state(Flow.rest_timer)
    await state.update_data(rest_seconds=rest_time)
    await safe_edit(cq, "\n".join(lines), kb_rest_timer(day, rest_time))


# ─────────────────────────────────────────────────────────────────────────────
# Rest Timer handlers
# ─────────────────────────────────────────────────────────────────────────────

@router.callback_query(F.data.startswith("rest|plus|"))
async def cb_rest_plus(cq: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    day = data["day"]
    rest = data.get("rest_seconds", DEFAULT_REST_TIME) + 30
    await state.update_data(rest_seconds=rest)
    await cq.answer(f"Отдых: {rest} сек")
    try:
        await cq.message.edit_reply_markup(reply_markup=kb_rest_timer(day, rest))
    except Exception:
        pass


@router.callback_query(F.data.startswith("rest|minus|"))
async def cb_rest_minus(cq: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    day = data["day"]
    rest = max(30, data.get("rest_seconds", DEFAULT_REST_TIME) - 30)
    await state.update_data(rest_seconds=rest)
    await cq.answer(f"Отдых: {rest} сек")
    try:
        await cq.message.edit_reply_markup(reply_markup=kb_rest_timer(day, rest))
    except Exception:
        pass


@router.callback_query(F.data.startswith("rest|skip|"))
async def cb_rest_skip(cq: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    day = data["day"]
    ex_db_id = data["current_ex_db_id"]
    
    ex_info = get_exercise_info(data, day)
    sets = db_ops.get_sets_for_exercise(ex_db_id)
    k = len(sets) + 1
    target = ex_info["target_sets"]
    label = f"{ex_info['group']} — {ex_info['name']}"
    
    await state.set_state(Flow.set_input)
    await safe_edit(cq, f"{label} — сет {k}/{target}\nФормат: 140x12", kb_set_input(day))


@router.callback_query(F.data.startswith("rest|info|"))
async def cb_rest_info(cq: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    rest = data.get("rest_seconds", DEFAULT_REST_TIME)
    await cq.answer(f"Текущий отдых: {rest} сек", show_alert=False)


@router.callback_query(F.data.startswith("set|next|"))
async def cb_set_next(cq: CallbackQuery, state: FSMContext):
    # Just clear pending, prompt again
    data = await state.get_data()
    day = data["day"]
    ex_db_id = data["current_ex_db_id"]
    await state.update_data(pending_set_text=None)

    ex_info = get_exercise_info(data, day)
    sets = db_ops.get_sets_for_exercise(ex_db_id)
    k = len(sets) + 1
    target = ex_info["target_sets"]
    label = f"{ex_info['group']} — {ex_info['name']}"
    await safe_edit(cq, f"{label} — сет {k}/{target}\nФормат: 140x12", kb_set_input(day))


@router.callback_query(F.data.startswith("set|edit_last|"))
async def cb_set_edit_last(cq: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    day = data["day"]
    ex_db_id = data["current_ex_db_id"]
    sets = db_ops.get_sets_for_exercise(ex_db_id)
    if not sets:
        await cq.answer("Нет записанных сетов", show_alert=True)
        return
    last = sets[-1]
    await state.update_data(editing_set_id=last["id"])
    await safe_edit(
        cq,
        f"Исправить сет {last['set_number']}: {last['weight']}кг × {last['reps']} повт.\nВведи новое значение:",
        kb_set_input(day),
    )
    # Switch to a sub-state: we'll handle the next message as an edit
    await state.update_data(mode="edit_last")


@router.callback_query(F.data.startswith("set|delete_last|"))
async def cb_set_delete_last(cq: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    day = data["day"]
    ex_db_id = data["current_ex_db_id"]
    sets = db_ops.get_sets_for_exercise(ex_db_id)
    if not sets:
        await cq.answer("Нет записанных сетов", show_alert=True)
        return
    db_ops.delete_set(sets[-1]["id"])

    ex_info = get_exercise_info(data, day)
    sets_updated = db_ops.get_sets_for_exercise(ex_db_id)
    k = len(sets_updated) + 1
    target = ex_info["target_sets"]
    label = f"{ex_info['group']} — {ex_info['name']}"
    lines = [f"🗑 Последний сет удалён.\n\n{label} — сет {k}/{target}"]
    if sets_updated:
        lines.append("\nЗаписанные сеты:")
        for s in sets_updated:
            lines.append(f"  Сет {s['set_number']}: {s['weight']}кг × {s['reps']}")
    await safe_edit(cq, "\n".join(lines), kb_set_input(day))


@router.callback_query(F.data.startswith("set|finish_ex|"))
async def cb_set_finish_ex(cq: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    day = data["day"]
    workout_id = data["workout_id"]
    buttons = exercise_buttons(day)
    custom = get_custom_exercises_for_workout(workout_id)
    await state.set_state(Flow.day_menu)
    await state.update_data(pending_set_text=None, current_ex_idx=None, current_ex_db_id=None, custom_ex_info=None)
    await safe_edit(cq, f"{day_label(day)} — выбери упражнение", kb_day_menu(day, buttons, custom))


@router.callback_query(F.data.startswith("set|back_to_day|"))
async def cb_set_back_to_day(cq: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    day = data["day"]
    workout_id = data.get("workout_id")
    buttons = exercise_buttons(day)
    custom = get_custom_exercises_for_workout(workout_id) if workout_id else []
    await state.set_state(Flow.day_menu)
    await safe_edit(cq, f"{day_label(day)} — выбери упражнение", kb_day_menu(day, buttons, custom))


@router.callback_query(F.data.startswith("set|cancel|"))
async def cb_set_cancel(cq: CallbackQuery, state: FSMContext):
    day = cq.data.split("|")[2]
    await safe_edit(cq, "Отменить тренировку? Данные не сохранятся.", kb_cancel_confirm(day))


# ─────────────────────────────────────────────────────────────────────────────
# Add Custom Exercise
# ─────────────────────────────────────────────────────────────────────────────

@router.callback_query(F.data.startswith("day|add_ex|"))
async def cb_day_add_ex(cq: CallbackQuery, state: FSMContext):
    day = cq.data.split("|")[2]
    await state.set_state(Flow.add_custom_exercise_group)
    await safe_edit(cq, "Выбери группу мышц для нового упражнения:", kb_add_custom_exercise(day))


@router.callback_query(F.data.startswith("addex|grp|"))
async def cb_addex_grp(cq: CallbackQuery, state: FSMContext):
    parts = cq.data.split("|")
    day = parts[2]
    grp = parts[3]
    await state.set_state(Flow.add_custom_exercise)
    await state.update_data(custom_ex_group=grp)
    await safe_edit(cq, f"Группа: {grp}\n\nВведи название упражнения:", None)


@router.callback_query(F.data.startswith("addex|cancel|"))
async def cb_addex_cancel(cq: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    day = data.get("day", cq.data.split("|")[2])
    workout_id = data.get("workout_id")
    buttons = exercise_buttons(day)
    custom = get_custom_exercises_for_workout(workout_id) if workout_id else []
    await state.set_state(Flow.day_menu)
    await safe_edit(cq, f"{day_label(day)} — выбери упражнение", kb_day_menu(day, buttons, custom))


@router.message(Flow.add_custom_exercise)
async def msg_add_custom_exercise(msg: Message, state: FSMContext):
    data = await state.get_data()
    day = data["day"]
    workout_id = data["workout_id"]
    grp = data["custom_ex_group"]
    name = msg.text.strip()
    
    # Create exercise in DB with target_sets=4 (default)
    ex_db_id = db_ops.create_exercise(workout_id, grp, name, 4)
    
    # Store custom exercise IDs in state
    custom_ids = data.get("custom_exercise_ids", [])
    custom_ids.append(ex_db_id)
    await state.update_data(custom_exercise_ids=custom_ids)
    
    buttons = exercise_buttons(day)
    custom = get_custom_exercises_for_workout(workout_id)
    await state.set_state(Flow.day_menu)
    await msg.answer(f"✅ Упражнение '{name}' добавлено!\n\n{day_label(day)} — выбери упражнение", 
                     reply_markup=kb_day_menu(day, buttons, custom))


def get_custom_exercises_for_workout(workout_id: int) -> list[tuple[int, str]]:
    """Get custom exercises (not in PROGRAM) for a workout."""
    if not workout_id:
        return []
    exercises = db_ops.get_exercises_for_workout(workout_id)
    custom = []
    for ex in exercises:
        # Check if this exercise is from PROGRAM or custom
        is_program_ex = False
        for day_exs in PROGRAM.values():
            for prog_ex in day_exs:
                if prog_ex["name"] == ex["name"] and prog_ex["group"] == ex["grp"]:
                    is_program_ex = True
                    break
            if is_program_ex:
                break
        if not is_program_ex:
            custom.append((ex["id"], f"{ex['grp']} — {ex['name']}"))
    return custom


@router.callback_query(F.data.startswith("day|custom_ex|"))
async def cb_day_custom_ex(cq: CallbackQuery, state: FSMContext):
    ex_db_id = int(cq.data.split("|")[2])
    data = await state.get_data()
    day = data["day"]
    
    ex = db_ops.get_exercise(ex_db_id)
    if not ex:
        await cq.answer("Упражнение не найдено", show_alert=True)
        return
    
    sets = db_ops.get_sets_for_exercise(ex_db_id)
    k = len(sets) + 1
    target = ex["target_sets"]
    
    await state.set_state(Flow.set_input)
    await state.update_data(current_ex_idx=None, current_ex_db_id=ex_db_id, pending_set_text=None, 
                            custom_ex_info={"group": ex["grp"], "name": ex["name"], "target_sets": target})
    
    label = f"{ex['grp']} — {ex['name']}"
    text = f"{label} — сет {k}/{target}\nФормат: 140x12"
    await safe_edit(cq, text, kb_set_input(day))


# ─────────────────────────────────────────────────────────────────────────────
# Screen 3Cardio — CARDIO
# ─────────────────────────────────────────────────────────────────────────────

@router.callback_query(F.data == "new|cardio")
async def cb_new_cardio(cq: CallbackQuery, state: FSMContext):
    user_id = cq.from_user.id
    workout_id = db_ops.create_workout(user_id, "CARDIO")
    await state.set_state(Flow.cardio_input)
    await state.update_data(workout_id=workout_id)
    await safe_edit(
        cq,
        "Кардио — введи одной строкой\nПример: Бег 30 мин",
        kb_cardio(),
    )


@router.message(Flow.cardio_input)
async def msg_cardio_input(msg: Message, state: FSMContext):
    data = await state.get_data()
    workout_id = data["workout_id"]
    db_ops.add_cardio(workout_id, msg.text.strip())
    await state.set_state(Flow.home)
    await msg.answer("✅ Кардио сохранено!\n\nГлавное меню", reply_markup=kb_home())


# ─────────────────────────────────────────────────────────────────────────────
# Screen 4 — PROGRAM
# ─────────────────────────────────────────────────────────────────────────────

@router.callback_query(F.data == "prog|open")
async def cb_prog_open(cq: CallbackQuery, state: FSMContext):
    await state.set_state(Flow.home)
    await safe_edit(cq, "Программа — выбери день", kb_program())


@router.callback_query(F.data.startswith("prog|day|"))
async def cb_prog_day(cq: CallbackQuery, state: FSMContext):
    day = cq.data.split("|")[2]
    exs = PROGRAM[day]
    lines = [f"📋 {day_label(day)}\n"]
    for i, ex in enumerate(exs, 1):
        lines.append(f"{i}. {ex['group']} — {ex['name']} ({ex['target_sets']} сет.)")
    await safe_edit(cq, "\n".join(lines), kb_program_day(day))


# ─────────────────────────────────────────────────────────────────────────────
# Screen 5 — HISTORY
# ─────────────────────────────────────────────────────────────────────────────

@router.callback_query(F.data == "hist|open")
async def cb_hist_open(cq: CallbackQuery, state: FSMContext):
    user_id = cq.from_user.id
    await state.set_state(Flow.history_menu)
    await state.update_data(hist_offset=0)
    workouts, has_more = db_ops.get_history(user_id, offset=0, limit=HISTORY_PAGE_SIZE)
    if not workouts:
        await safe_edit(cq, "История пуста.", kb_history([], False))
        return
    items = [(str(w["id"]), format_history_title(w)) for w in workouts]
    await safe_edit(cq, "История — выбери запись", kb_history(items, has_more))


@router.callback_query(F.data == "hist|more")
async def cb_hist_more(cq: CallbackQuery, state: FSMContext):
    user_id = cq.from_user.id
    data = await state.get_data()
    offset = data.get("hist_offset", 0) + HISTORY_PAGE_SIZE
    await state.update_data(hist_offset=offset)
    workouts, has_more = db_ops.get_history(user_id, offset=offset, limit=HISTORY_PAGE_SIZE)
    items = [(str(w["id"]), format_history_title(w)) for w in workouts]
    await safe_edit(cq, "История — выбери запись", kb_history(items, has_more))


@router.callback_query(F.data.startswith("hist|item|"))
async def cb_hist_item(cq: CallbackQuery, state: FSMContext):
    workout_id = cq.data.split("|")[2]
    await state.set_state(Flow.history_entry_actions)
    await state.update_data(viewing_workout_id=workout_id)

    w = db_ops.get_workout(int(workout_id))
    if not w:
        await cq.answer("Запись не найдена", show_alert=True)
        return

    lines = [format_history_title(w)]
    if w["type"] == "CARDIO":
        c = db_ops.get_cardio(int(workout_id))
        if c:
            lines.append(f"\n{c['text']}")
    else:
        exs = db_ops.get_exercises_for_workout(int(workout_id))
        for ex in exs:
            lines.append(f"\n{ex['grp']} — {ex['name']}")
            sets = db_ops.get_sets_for_exercise(ex["id"])
            for s in sets:
                lines.append(f"  Сет {s['set_number']}: {s['weight']}кг × {s['reps']}")

    await safe_edit(cq, "\n".join(lines), kb_history_entry(workout_id))


@router.callback_query(F.data.startswith("entry|delete|"))
async def cb_entry_delete(cq: CallbackQuery, state: FSMContext):
    workout_id = cq.data.split("|")[2]
    await safe_edit(cq, "Удалить запись? Данные не восстановятся.", kb_delete_confirm(workout_id))


@router.callback_query(F.data.startswith("del|yes|"))
async def cb_del_yes(cq: CallbackQuery, state: FSMContext):
    workout_id = cq.data.split("|")[2]
    db_ops.delete_workout(int(workout_id))
    user_id = cq.from_user.id
    workouts, has_more = db_ops.get_history(user_id, offset=0, limit=HISTORY_PAGE_SIZE)
    items = [(str(w["id"]), format_history_title(w)) for w in workouts]
    await state.set_state(Flow.history_menu)
    await safe_edit(cq, "🗑 Запись удалена.\n\nИстория — выбери запись", kb_history(items, has_more))


@router.callback_query(F.data.startswith("del|no|"))
async def cb_del_no(cq: CallbackQuery, state: FSMContext):
    workout_id = cq.data.split("|")[2]
    w = db_ops.get_workout(int(workout_id))
    lines = [format_history_title(w)] if w else ["Запись"]
    await safe_edit(cq, "\n".join(lines), kb_history_entry(workout_id))


# ── History Edit ──────────────────────────────────────────────────────────────

@router.callback_query(F.data.startswith("entry|edit|"))
async def cb_entry_edit(cq: CallbackQuery, state: FSMContext):
    workout_id = cq.data.split("|")[2]
    w = db_ops.get_workout(int(workout_id))
    if not w or w["type"] == "CARDIO":
        await cq.answer("Редактирование кардио пока не поддерживается.", show_alert=True)
        return

    exs = db_ops.get_exercises_for_workout(int(workout_id))
    exercises = [(str(ex["id"]), f"{ex['grp']} — {ex['name']}") for ex in exs]
    await state.set_state(Flow.history_edit_select_ex)
    await state.update_data(editing_workout_id=workout_id)
    await safe_edit(cq, "Выбери упражнение для редактирования", kb_history_edit_select_ex(exercises))


@router.callback_query(F.data.startswith("hedit|ex|"))
async def cb_hedit_ex(cq: CallbackQuery, state: FSMContext):
    ex_id = cq.data.split("|")[2]
    sets = db_ops.get_sets_for_exercise(int(ex_id))
    if not sets:
        await cq.answer("Нет сетов для редактирования", show_alert=True)
        return
    set_items = [(str(s["id"]), f"Сет {s['set_number']}: {s['weight']}кг × {s['reps']}") for s in sets]
    await state.set_state(Flow.history_edit_select_set)
    await state.update_data(hedit_ex_id=ex_id)
    await safe_edit(cq, "Выбери сет для редактирования", kb_history_edit_select_set(set_items, ex_id))


@router.callback_query(F.data.startswith("hedit|back_ex|"))
async def cb_hedit_back_ex(cq: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    workout_id = data.get("editing_workout_id")
    if not workout_id:
        await send_home(cq, state)
        return
    exs = db_ops.get_exercises_for_workout(int(workout_id))
    exercises = [(str(ex["id"]), f"{ex['grp']} — {ex['name']}") for ex in exs]
    await state.set_state(Flow.history_edit_select_ex)
    await safe_edit(cq, "Выбери упражнение для редактирования", kb_history_edit_select_ex(exercises))


@router.callback_query(F.data.startswith("hedit|set|"))
async def cb_hedit_set(cq: CallbackQuery, state: FSMContext):
    set_id = cq.data.split("|")[2]
    s = db_ops.get_set(int(set_id))
    await state.set_state(Flow.history_edit_set_input)
    await state.update_data(hedit_set_id=set_id)
    await safe_edit(
        cq,
        f"Текущее значение сета {s['set_number']}: {s['weight']}кг × {s['reps']} повт.\n\nВведи новое значение (формат: 140x12):",
        None,
    )


@router.message(Flow.history_edit_set_input)
async def msg_hedit_set_input(msg: Message, state: FSMContext):
    data = await state.get_data()
    set_id = int(data["hedit_set_id"])
    ex_id = data.get("hedit_ex_id")

    try:
        entry = parse_set(msg.text.strip())
    except ValueError as e:
        await msg.answer(str(e))
        return

    db_ops.update_set(set_id, entry.weight, entry.reps)

    # Return to set list for this exercise
    sets = db_ops.get_sets_for_exercise(int(ex_id))
    set_items = [(str(s["id"]), f"Сет {s['set_number']}: {s['weight']}кг × {s['reps']}") for s in sets]
    await state.set_state(Flow.history_edit_select_set)
    await msg.answer("✅ Сет обновлён!\n\nВыбери сет для редактирования", reply_markup=kb_history_edit_select_set(set_items, str(ex_id)))


# ─────────────────────────────────────────────────────────────────────────────
# Screen 6 — STATS
# ─────────────────────────────────────────────────────────────────────────────

@router.callback_query(F.data == "stats|open")
async def cb_stats_open(cq: CallbackQuery, state: FSMContext):
    await safe_edit(cq, "Статистика", kb_stats())


@router.callback_query(F.data == "stats|week")
async def cb_stats_week(cq: CallbackQuery, state: FSMContext):
    user_id = cq.from_user.id
    since = date.today() - timedelta(days=7)
    total, by_type = db_ops.stats_period(user_id, since)
    a = by_type.get("DAY_A", 0)
    b = by_type.get("DAY_B", 0)
    c = by_type.get("DAY_C", 0)
    text = f"📆 Неделя: {total} тренировок (A {a} / B {b} / C {c})"
    await safe_edit(cq, text, kb_stats())


@router.callback_query(F.data == "stats|month")
async def cb_stats_month(cq: CallbackQuery, state: FSMContext):
    user_id = cq.from_user.id
    since = date.today() - timedelta(days=30)
    total, by_type = db_ops.stats_period(user_id, since)
    a = by_type.get("DAY_A", 0)
    b = by_type.get("DAY_B", 0)
    c = by_type.get("DAY_C", 0)
    text = f"📅 Месяц: {total} тренировок (A {a} / B {b} / C {c})"
    await safe_edit(cq, text, kb_stats())


@router.callback_query(F.data == "stats|freq")
async def cb_stats_freq(cq: CallbackQuery, state: FSMContext):
    user_id = cq.from_user.id
    total, avg = db_ops.stats_frequency(user_id, weeks=4)
    text = f"🔥 4 недели: {total} тренировок — в среднем {avg}/нед"
    await safe_edit(cq, text, kb_stats())
