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
    kb_set_input, kb_cardio, kb_program, kb_program_day,
    kb_history, kb_history_entry, kb_delete_confirm, kb_stats,
    kb_history_edit_select_ex, kb_history_edit_select_set,
)
from parser import parse_set
from program import PROGRAM, exercise_buttons
from states import Flow

router = Router()

HISTORY_PAGE_SIZE = 10


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

async def send_home(target, state: FSMContext):
    await state.set_state(Flow.home)
    await state.update_data({})  # clear session data
    if isinstance(target, CallbackQuery):
        await target.message.edit_text("Main menu", reply_markup=kb_home())
        await target.answer()
    else:
        await target.answer("Main menu", reply_markup=kb_home())


async def safe_edit(cq: CallbackQuery, text: str, markup):
    try:
        await cq.message.edit_text(text, reply_markup=markup)
    except Exception:
        await cq.message.answer(text, reply_markup=markup)
    await cq.answer()


def day_label(day: str) -> str:
    return day.replace("DAY_", "Day ")


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
# Screen 1 — NEW WORKOUT
# ─────────────────────────────────────────────────────────────────────────────

@router.callback_query(F.data == "new|open")
async def cb_new_open(cq: CallbackQuery, state: FSMContext):
    await state.set_state(Flow.new_workout)
    await safe_edit(cq, "Choose workout", kb_new_workout())


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
    await safe_edit(cq, f"{day_label(day)} — choose exercise", kb_day_menu(day, buttons))


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
    text = f"{label} — set {k}/{target}\nFormat: 140x12"
    await safe_edit(cq, text, kb_set_input(day))


@router.callback_query(F.data.startswith("day|save|"))
async def cb_day_save(cq: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    workout_id = data.get("workout_id")
    # workout already persisted, just go home
    await state.set_state(Flow.home)
    await safe_edit(cq, "✅ Workout saved!\n\nMain menu", kb_home())


@router.callback_query(F.data.startswith("day|cancel|"))
async def cb_day_cancel(cq: CallbackQuery, state: FSMContext):
    day = cq.data.split("|")[2]
    await safe_edit(cq, "Cancel workout? Data will not be saved.", kb_cancel_confirm(day))


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
    buttons = exercise_buttons(day)
    await state.set_state(Flow.day_menu)
    await safe_edit(cq, f"{day_label(day)} — choose exercise", kb_day_menu(day, buttons))


# ─────────────────────────────────────────────────────────────────────────────
# Screen 3Set — SET INPUT (text messages)
# ─────────────────────────────────────────────────────────────────────────────

@router.message(Flow.set_input)
async def msg_set_input(msg: Message, state: FSMContext):
    data = await state.get_data()
    day = data["day"]
    ex_db_id = data["current_ex_db_id"]
    ex_idx = data["current_ex_idx"]
    ex_info = PROGRAM[day][ex_idx]

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

    lines = [f"{label} — set {k}/{target}", f"Entered: {entry.weight}kg × {entry.reps} reps"]
    if sets:
        lines.append("\nRecorded sets:")
        for s in sets:
            lines.append(f"  Set {s['set_number']}: {s['weight']}kg × {s['reps']}")

    await msg.answer("\n".join(lines), reply_markup=kb_set_input(day))


@router.callback_query(F.data.startswith("set|save|"))
async def cb_set_save(cq: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    day = data["day"]
    ex_db_id = data["current_ex_db_id"]
    ex_idx = data["current_ex_idx"]
    pending = data.get("pending_set_text")

    if not pending:
        await cq.answer("Enter a set first in format 140x12", show_alert=True)
        return

    entry = parse_set(pending)
    sets = db_ops.get_sets_for_exercise(ex_db_id)
    db_ops.add_set(ex_db_id, len(sets) + 1, entry.weight, entry.reps)
    await state.update_data(pending_set_text=None)

    ex_info = PROGRAM[day][ex_idx]
    sets_updated = db_ops.get_sets_for_exercise(ex_db_id)
    k = len(sets_updated) + 1
    target = ex_info["target_sets"]
    label = f"{ex_info['group']} — {ex_info['name']}"

    lines = [f"✅ Set saved!\n\n{label} — set {k}/{target}"]
    lines.append("\nRecorded sets:")
    for s in sets_updated:
        lines.append(f"  Set {s['set_number']}: {s['weight']}kg × {s['reps']}")

    await safe_edit(cq, "\n".join(lines), kb_set_input(day))


@router.callback_query(F.data.startswith("set|next|"))
async def cb_set_next(cq: CallbackQuery, state: FSMContext):
    # Just clear pending, prompt again
    data = await state.get_data()
    day = data["day"]
    ex_db_id = data["current_ex_db_id"]
    ex_idx = data["current_ex_idx"]
    await state.update_data(pending_set_text=None)

    ex_info = PROGRAM[day][ex_idx]
    sets = db_ops.get_sets_for_exercise(ex_db_id)
    k = len(sets) + 1
    target = ex_info["target_sets"]
    label = f"{ex_info['group']} — {ex_info['name']}"
    await safe_edit(cq, f"{label} — set {k}/{target}\nFormat: 140x12", kb_set_input(day))


@router.callback_query(F.data.startswith("set|edit_last|"))
async def cb_set_edit_last(cq: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    day = data["day"]
    ex_db_id = data["current_ex_db_id"]
    sets = db_ops.get_sets_for_exercise(ex_db_id)
    if not sets:
        await cq.answer("No recorded sets", show_alert=True)
        return
    last = sets[-1]
    await state.update_data(editing_set_id=last["id"])
    await safe_edit(
        cq,
        f"Edit set {last['set_number']}: {last['weight']}kg × {last['reps']} reps.\nEnter new value:",
        kb_set_input(day),
    )
    # Switch to a sub-state: we'll handle the next message as an edit
    await state.update_data(mode="edit_last")


@router.callback_query(F.data.startswith("set|delete_last|"))
async def cb_set_delete_last(cq: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    day = data["day"]
    ex_db_id = data["current_ex_db_id"]
    ex_idx = data["current_ex_idx"]
    sets = db_ops.get_sets_for_exercise(ex_db_id)
    if not sets:
        await cq.answer("No recorded sets", show_alert=True)
        return
    db_ops.delete_set(sets[-1]["id"])

    ex_info = PROGRAM[day][ex_idx]
    sets_updated = db_ops.get_sets_for_exercise(ex_db_id)
    k = len(sets_updated) + 1
    target = ex_info["target_sets"]
    label = f"{ex_info['group']} — {ex_info['name']}"
    lines = [f"🗑 Last set deleted.\n\n{label} — set {k}/{target}"]
    if sets_updated:
        lines.append("\nRecorded sets:")
        for s in sets_updated:
            lines.append(f"  Set {s['set_number']}: {s['weight']}kg × {s['reps']}")
    await safe_edit(cq, "\n".join(lines), kb_set_input(day))


@router.callback_query(F.data.startswith("set|finish_ex|"))
async def cb_set_finish_ex(cq: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    day = data["day"]
    workout_id = data["workout_id"]
    buttons = exercise_buttons(day)
    await state.set_state(Flow.day_menu)
    await state.update_data(pending_set_text=None, current_ex_idx=None, current_ex_db_id=None)
    await safe_edit(cq, f"{day_label(day)} — choose exercise", kb_day_menu(day, buttons))


@router.callback_query(F.data.startswith("set|back_to_day|"))
async def cb_set_back_to_day(cq: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    day = data["day"]
    buttons = exercise_buttons(day)
    await state.set_state(Flow.day_menu)
    await safe_edit(cq, f"{day_label(day)} — choose exercise", kb_day_menu(day, buttons))


@router.callback_query(F.data.startswith("set|cancel|"))
async def cb_set_cancel(cq: CallbackQuery, state: FSMContext):
    day = cq.data.split("|")[2]
    await safe_edit(cq, "Cancel workout? Data will not be saved.", kb_cancel_confirm(day))


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
        "Cardio — enter in one line\nExample: Running 30 min",
        kb_cardio(),
    )


@router.message(Flow.cardio_input)
async def msg_cardio_input(msg: Message, state: FSMContext):
    data = await state.get_data()
    workout_id = data["workout_id"]
    db_ops.add_cardio(workout_id, msg.text.strip())
    await state.set_state(Flow.home)
    await msg.answer("✅ Cardio saved!\n\nMain menu", reply_markup=kb_home())


# ─────────────────────────────────────────────────────────────────────────────
# Screen 4 — PROGRAM
# ─────────────────────────────────────────────────────────────────────────────

@router.callback_query(F.data == "prog|open")
async def cb_prog_open(cq: CallbackQuery, state: FSMContext):
    await state.set_state(Flow.home)
    await safe_edit(cq, "Program — choose day", kb_program())


@router.callback_query(F.data.startswith("prog|day|"))
async def cb_prog_day(cq: CallbackQuery, state: FSMContext):
    day = cq.data.split("|")[2]
    exs = PROGRAM[day]
    lines = [f"📋 {day_label(day)}\n"]
    for i, ex in enumerate(exs, 1):
        lines.append(f"{i}. {ex['group']} — {ex['name']} ({ex['target_sets']} sets)")
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
        await safe_edit(cq, "History is empty.", kb_history([], False))
        return
    items = [(str(w["id"]), format_history_title(w)) for w in workouts]
    await safe_edit(cq, "History — choose entry", kb_history(items, has_more))


@router.callback_query(F.data == "hist|more")
async def cb_hist_more(cq: CallbackQuery, state: FSMContext):
    user_id = cq.from_user.id
    data = await state.get_data()
    offset = data.get("hist_offset", 0) + HISTORY_PAGE_SIZE
    await state.update_data(hist_offset=offset)
    workouts, has_more = db_ops.get_history(user_id, offset=offset, limit=HISTORY_PAGE_SIZE)
    items = [(str(w["id"]), format_history_title(w)) for w in workouts]
    await safe_edit(cq, "History — choose entry", kb_history(items, has_more))


@router.callback_query(F.data.startswith("hist|item|"))
async def cb_hist_item(cq: CallbackQuery, state: FSMContext):
    workout_id = cq.data.split("|")[2]
    await state.set_state(Flow.history_entry_actions)
    await state.update_data(viewing_workout_id=workout_id)

    w = db_ops.get_workout(int(workout_id))
    if not w:
        await cq.answer("Entry not found", show_alert=True)
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
                lines.append(f"  Set {s['set_number']}: {s['weight']}kg × {s['reps']}")

    await safe_edit(cq, "\n".join(lines), kb_history_entry(workout_id))


@router.callback_query(F.data.startswith("entry|delete|"))
async def cb_entry_delete(cq: CallbackQuery, state: FSMContext):
    workout_id = cq.data.split("|")[2]
    await safe_edit(cq, "Delete entry? Data cannot be recovered.", kb_delete_confirm(workout_id))


@router.callback_query(F.data.startswith("del|yes|"))
async def cb_del_yes(cq: CallbackQuery, state: FSMContext):
    workout_id = cq.data.split("|")[2]
    db_ops.delete_workout(int(workout_id))
    user_id = cq.from_user.id
    workouts, has_more = db_ops.get_history(user_id, offset=0, limit=HISTORY_PAGE_SIZE)
    items = [(str(w["id"]), format_history_title(w)) for w in workouts]
    await state.set_state(Flow.history_menu)
    await safe_edit(cq, "🗑 Entry deleted.\n\nHistory — choose entry", kb_history(items, has_more))


@router.callback_query(F.data.startswith("del|no|"))
async def cb_del_no(cq: CallbackQuery, state: FSMContext):
    workout_id = cq.data.split("|")[2]
    w = db_ops.get_workout(int(workout_id))
    lines = [format_history_title(w)] if w else ["Entry"]
    await safe_edit(cq, "\n".join(lines), kb_history_entry(workout_id))


# ── History Edit ──────────────────────────────────────────────────────────────

@router.callback_query(F.data.startswith("entry|edit|"))
async def cb_entry_edit(cq: CallbackQuery, state: FSMContext):
    workout_id = cq.data.split("|")[2]
    w = db_ops.get_workout(int(workout_id))
    if not w or w["type"] == "CARDIO":
        await cq.answer("Cardio editing is not supported yet.", show_alert=True)
        return

    exs = db_ops.get_exercises_for_workout(int(workout_id))
    exercises = [(str(ex["id"]), f"{ex['grp']} — {ex['name']}") for ex in exs]
    await state.set_state(Flow.history_edit_select_ex)
    await state.update_data(editing_workout_id=workout_id)
    await safe_edit(cq, "Choose exercise to edit", kb_history_edit_select_ex(exercises))


@router.callback_query(F.data.startswith("hedit|ex|"))
async def cb_hedit_ex(cq: CallbackQuery, state: FSMContext):
    ex_id = cq.data.split("|")[2]
    sets = db_ops.get_sets_for_exercise(int(ex_id))
    if not sets:
        await cq.answer("No sets to edit", show_alert=True)
        return
    set_items = [(str(s["id"]), f"Set {s['set_number']}: {s['weight']}kg × {s['reps']}") for s in sets]
    await state.set_state(Flow.history_edit_select_set)
    await state.update_data(hedit_ex_id=ex_id)
    await safe_edit(cq, "Choose set to edit", kb_history_edit_select_set(set_items, ex_id))


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
    await safe_edit(cq, "Choose exercise to edit", kb_history_edit_select_ex(exercises))


@router.callback_query(F.data.startswith("hedit|set|"))
async def cb_hedit_set(cq: CallbackQuery, state: FSMContext):
    set_id = cq.data.split("|")[2]
    s = db_ops.get_set(int(set_id))
    await state.set_state(Flow.history_edit_set_input)
    await state.update_data(hedit_set_id=set_id)
    await safe_edit(
        cq,
        f"Current value of set {s['set_number']}: {s['weight']}kg × {s['reps']} reps.\n\nEnter new value (format: 140x12):",
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
    set_items = [(str(s["id"]), f"Set {s['set_number']}: {s['weight']}kg × {s['reps']}") for s in sets]
    await state.set_state(Flow.history_edit_select_set)
    await msg.answer("✅ Set updated!\n\nChoose set to edit", reply_markup=kb_history_edit_select_set(set_items, str(ex_id)))


# ─────────────────────────────────────────────────────────────────────────────
# Screen 6 — STATS
# ─────────────────────────────────────────────────────────────────────────────

@router.callback_query(F.data == "stats|open")
async def cb_stats_open(cq: CallbackQuery, state: FSMContext):
    await safe_edit(cq, "Statistics", kb_stats())


@router.callback_query(F.data == "stats|week")
async def cb_stats_week(cq: CallbackQuery, state: FSMContext):
    user_id = cq.from_user.id
    since = date.today() - timedelta(days=7)
    total, by_type = db_ops.stats_period(user_id, since)
    a = by_type.get("DAY_A", 0)
    b = by_type.get("DAY_B", 0)
    c = by_type.get("DAY_C", 0)
    text = f"📆 Week: {total} workouts (A {a} / B {b} / C {c})"
    await safe_edit(cq, text, kb_stats())


@router.callback_query(F.data == "stats|month")
async def cb_stats_month(cq: CallbackQuery, state: FSMContext):
    user_id = cq.from_user.id
    since = date.today() - timedelta(days=30)
    total, by_type = db_ops.stats_period(user_id, since)
    a = by_type.get("DAY_A", 0)
    b = by_type.get("DAY_B", 0)
    c = by_type.get("DAY_C", 0)
    text = f"📅 Month: {total} workouts (A {a} / B {b} / C {c})"
    await safe_edit(cq, text, kb_stats())


@router.callback_query(F.data == "stats|freq")
async def cb_stats_freq(cq: CallbackQuery, state: FSMContext):
    user_id = cq.from_user.id
    total, avg = db_ops.stats_frequency(user_id, weeks=4)
    text = f"🔥 4 weeks: {total} workouts — avg {avg}/week"
    await safe_edit(cq, text, kb_stats())
