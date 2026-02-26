import os
import re
import sqlite3
from datetime import date
from typing import Optional

from telegram import Update, ReplyKeyboardMarkup, ReplyKeyboardRemove
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    ConversationHandler,
    MessageHandler,
    filters,
)

# IMPORTANT: Railway will set DB_PATH to /mnt/data/workout_diary.db (persistent volume)
DB_PATH = os.environ.get("DB_PATH", "workout_diary.db")

# Conversation states
(
    DURATION,
    CHOOSE_ENTRY_TYPE,
    GYM_EXERCISE,
    GYM_SETS,
    GYM_REPS,
    GYM_WEIGHT,
    GYM_RPE,
    GYM_NOTE,
    CARDIO_ACTIVITY,
    CARDIO_DURATION,
    CARDIO_DISTANCE,
    CARDIO_NOTE,
    ADD_ANOTHER,
) = range(13)

YES_NO_KB = ReplyKeyboardMarkup([["Yes", "No"]], resize_keyboard=True, one_time_keyboard=True)
TYPE_KB = ReplyKeyboardMarkup([["Gym", "Cardio"], ["Finish"]], resize_keyboard=True, one_time_keyboard=True)


def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with db() as conn:
        conn.executescript(
            """
            PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id INTEGER UNIQUE NOT NULL
            );

            CREATE TABLE IF NOT EXISTS workouts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                workout_date TEXT NOT NULL,
                duration_min INTEGER NOT NULL,
                note TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS gym_sets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workout_id INTEGER NOT NULL,
                exercise TEXT NOT NULL,
                set_no INTEGER NOT NULL,
                reps INTEGER NOT NULL,
                weight_kg REAL NOT NULL,
                rpe REAL,
                note TEXT,
                FOREIGN KEY(workout_id) REFERENCES workouts(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS cardio_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workout_id INTEGER NOT NULL,
                activity TEXT NOT NULL,
                duration_min INTEGER NOT NULL,
                distance_km REAL,
                note TEXT,
                FOREIGN KEY(workout_id) REFERENCES workouts(id) ON DELETE CASCADE
            );
            """
        )


def get_or_create_user_id(telegram_id: int) -> int:
    with db() as conn:
        cur = conn.execute("SELECT id FROM users WHERE telegram_id = ?", (telegram_id,))
        row = cur.fetchone()
        if row:
            return int(row["id"])
        conn.execute("INSERT INTO users (telegram_id) VALUES (?)", (telegram_id,))
        return int(conn.execute("SELECT id FROM users WHERE telegram_id = ?", (telegram_id,)).fetchone()["id"])


def parse_int(text: str) -> Optional[int]:
    text = text.strip()
    if re.fullmatch(r"\d+", text):
        return int(text)
    return None


def parse_float(text: str) -> Optional[float]:
    text = text.strip().replace(",", ".")
    if re.fullmatch(r"\d+(\.\d+)?", text):
        return float(text)
    return None


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text("Workout Diary Bot ✅")


async def help_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await start(update, context)


async def add_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    tg_id = update.effective_user.id
    user_id = get_or_create_user_id(tg_id)

    context.user_data.clear()
    context.user_data["user_id"] = user_id
    context.user_data["workout_date"] = str(date.today())

    await update.message.reply_text(
        f"Adding a workout for {context.user_data['workout_date']}.\n"
        "Enter workout duration in minutes (e.g., 60):",
        reply_markup=ReplyKeyboardRemove(),
    )
    return DURATION


async def duration_step(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    val = parse_int(update.message.text)
    if val is None or val <= 0 or val > 600:
        await update.message.reply_text("Please enter a valid duration in minutes (1–600).")
        return DURATION

    context.user_data["duration_min"] = val

    with db() as conn:
        cur = conn.execute(
            "INSERT INTO workouts (user_id, workout_date, duration_min) VALUES (?, ?, ?)",
            (context.user_data["user_id"], context.user_data["workout_date"], context.user_data["duration_min"]),
        )
        context.user_data["workout_id"] = cur.lastrowid

    await update.message.reply_text("Great. What do you want to add first?", reply_markup=TYPE_KB)
    return CHOOSE_ENTRY_TYPE


async def choose_type_step(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    choice = update.message.text.strip().lower()
    if choice == "gym":
        await update.message.reply_text("Gym entry: enter exercise name (e.g., Bench Press):", reply_markup=ReplyKeyboardRemove())
        return GYM_EXERCISE
    if choice == "cardio":
        await update.message.reply_text("Cardio entry: enter activity (e.g., Running / Bike / Rowing):", reply_markup=ReplyKeyboardRemove())
        return CARDIO_ACTIVITY
    if choice == "finish":
        return await finish_workout(update, context)

    await update.message.reply_text("Choose: Gym / Cardio / Finish", reply_markup=TYPE_KB)
    return CHOOSE_ENTRY_TYPE


# ---- Gym flow ----
async def gym_exercise_step(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    ex = update.message.text.strip()
    if len(ex) < 2:
        await update.message.reply_text("Please enter a valid exercise name.")
        return GYM_EXERCISE
    context.user_data["gym_exercise"] = ex
    await update.message.reply_text("How many sets? (e.g., 3)")
    return GYM_SETS


async def gym_sets_step(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    sets_n = parse_int(update.message.text)
    if sets_n is None or sets_n <= 0 or sets_n > 20:
        await update.message.reply_text("Enter sets count (1–20).")
        return GYM_SETS
    context.user_data["gym_sets_total"] = sets_n
    context.user_data["gym_set_no"] = 1
    await update.message.reply_text("Set 1 reps? (e.g., 8)")
    return GYM_REPS


async def gym_reps_step(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    reps = parse_int(update.message.text)
    if reps is None or reps <= 0 or reps > 200:
        await update.message.reply_text("Enter reps (1–200).")
        return GYM_REPS
    context.user_data["gym_reps"] = reps
    await update.message.reply_text("Weight in kg? (e.g., 60 or 60.5). Use 0 for bodyweight.")
    return GYM_WEIGHT


async def gym_weight_step(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    w = parse_float(update.message.text)
    if w is None or w < 0 or w > 500:
        await update.message.reply_text("Enter weight in kg (0–500).")
        return GYM_WEIGHT
    context.user_data["gym_weight_kg"] = w
    await update.message.reply_text("RPE (optional). Enter a number like 7.5, or type '-' to skip.")
    return GYM_RPE


async def gym_rpe_step(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    t = update.message.text.strip()
    rpe = None
    if t != "-":
        rpe = parse_float(t)
        if rpe is None or rpe < 0 or rpe > 10:
            await update.message.reply_text("RPE must be 0–10, or '-' to skip.")
            return GYM_RPE
    context.user_data["gym_rpe"] = rpe
    await update.message.reply_text("Note (optional). Type '-' to skip.")
    return GYM_NOTE


async def gym_note_step(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    note = update.message.text.strip()
    if note == "-":
        note = None

    workout_id = context.user_data["workout_id"]
    ex = context.user_data["gym_exercise"]
    set_no = context.user_data["gym_set_no"]
    reps = context.user_data["gym_reps"]
    weight = context.user_data["gym_weight_kg"]
    rpe = context.user_data.get("gym_rpe")

    with db() as conn:
        conn.execute(
            """
            INSERT INTO gym_sets (workout_id, exercise, set_no, reps, weight_kg, rpe, note)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (workout_id, ex, set_no, reps, weight, rpe, note),
        )

    total = context.user_data["gym_sets_total"]
    if set_no < total:
        context.user_data["gym_set_no"] = set_no + 1
        await update.message.reply_text(f"Saved set {set_no}/{total} ✅\nSet {set_no+1} reps?")
        return GYM_REPS

    await update.message.reply_text("Gym entry saved ✅\nAdd another entry?", reply_markup=YES_NO_KB)
    return ADD_ANOTHER


# ---- Cardio flow ----
async def cardio_activity_step(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    act = update.message.text.strip()
    if len(act) < 2:
        await update.message.reply_text("Please enter a valid activity.")
        return CARDIO_ACTIVITY
    context.user_data["cardio_activity"] = act
    await update.message.reply_text("Duration in minutes? (e.g., 30)")
    return CARDIO_DURATION


async def cardio_duration_step(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    val = parse_int(update.message.text)
    if val is None or val <= 0 or val > 600:
        await update.message.reply_text("Enter duration in minutes (1–600).")
        return CARDIO_DURATION
    context.user_data["cardio_duration_min"] = val
    await update.message.reply_text("Distance in km (optional). Enter a number like 5.2, or '-' to skip.")
    return CARDIO_DISTANCE


async def cardio_distance_step(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    t = update.message.text.strip()
    dist = None
    if t != "-":
        dist = parse_float(t)
        if dist is None or dist < 0 or dist > 200:
            await update.message.reply_text("Distance must be 0–200 km, or '-' to skip.")
            return CARDIO_DISTANCE
    context.user_data["cardio_distance_km"] = dist
    await update.message.reply_text("Note (optional). Type '-' to skip.")
    return CARDIO_NOTE


async def cardio_note_step(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    note = update.message.text.strip()
    if note == "-":
        note = None

    with db() as conn:
        conn.execute(
            """
            INSERT INTO cardio_entries (workout_id, activity, duration_min, distance_km, note)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                context.user_data["workout_id"],
                context.user_data["cardio_activity"],
                context.user_data["cardio_duration_min"],
                context.user_data.get("cardio_distance_km"),
                note,
            ),
        )

    await update.message.reply_text("Cardio entry saved ✅\nAdd another entry?", reply_markup=YES_NO_KB)
    return ADD_ANOTHER


# ---- Add another / finish ----
async def add_another_step(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    ans = update.message.text.strip().lower()
    if ans == "yes":
        await update.message.reply_text("Choose what to add next:", reply_markup=TYPE_KB)
        return CHOOSE_ENTRY_TYPE
    if ans == "no":
        return await finish_workout(update, context)

    await update.message.reply_text("Please tap Yes or No.", reply_markup=YES_NO_KB)
    return ADD_ANOTHER


async def finish_workout(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    workout_id = context.user_data.get("workout_id")
    if not workout_id:
        await update.message.reply_text("No active workout to finish.")
        return ConversationHandler.END

    with db() as conn:
        w = conn.execute("SELECT workout_date, duration_min FROM workouts WHERE id = ?", (workout_id,)).fetchone()
        gym_count = conn.execute("SELECT COUNT(*) AS c FROM gym_sets WHERE workout_id = ?", (workout_id,)).fetchone()["c"]
        cardio_count = conn.execute("SELECT COUNT(*) AS c FROM cardio_entries WHERE workout_id = ?", (workout_id,)).fetchone()["c"]

    await update.message.reply_text(
        f"Workout saved ✅\n"
        f"Date: {w['workout_date']}\n"
        f"Duration: {w['duration_min']} min\n"
        f"Gym sets logged: {gym_count}\n"
        f"Cardio entries logged: {cardio_count}",
        reply_markup=ReplyKeyboardRemove(),
    )
    context.user_data.clear()
    return ConversationHandler.END


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data.clear()
    await update.message.reply_text("Cancelled.", reply_markup=ReplyKeyboardRemove())
    return ConversationHandler.END


async def last_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    tg_id = update.effective_user.id
    user_id = get_or_create_user_id(tg_id)

    with db() as conn:
        workouts = conn.execute(
            """
            SELECT id, workout_date, duration_min
            FROM workouts
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT 10
            """,
            (user_id,),
        ).fetchall()

        if not workouts:
            await update.message.reply_text("No workouts logged yet. Use /add.")
            return

        lines = []
        for w in workouts:
            wid = w["id"]
            gym_sets = conn.execute("SELECT COUNT(*) AS c FROM gym_sets WHERE workout_id = ?", (wid,)).fetchone()["c"]
            cardio_entries = conn.execute("SELECT COUNT(*) AS c FROM cardio_entries WHERE workout_id = ?", (wid,)).fetchone()["c"]
            lines.append(f"• {w['workout_date']} — {w['duration_min']} min | gym sets: {gym_sets} | cardio: {cardio_entries}")

    await update.message.reply_text("Last workouts:\n" + "\n".join(lines))


async def exercise_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not context.args:
        await update.message.reply_text("Usage: /exercise Bench Press")
        return

    name = " ".join(context.args).strip()
    tg_id = update.effective_user.id
    user_id = get_or_create_user_id(tg_id)

    with db() as conn:
        rows = conn.execute(
            """
            SELECT w.workout_date, g.set_no, g.reps, g.weight_kg, g.rpe
            FROM gym_sets g
            JOIN workouts w ON w.id = g.workout_id
            WHERE w.user_id = ? AND LOWER(g.exercise) = LOWER(?)
            ORDER BY w.workout_date DESC, g.set_no ASC
            LIMIT 60
            """,
            (user_id, name),
        ).fetchall()

    if not rows:
        await update.message.reply_text(f"No history found for: {name}")
        return

    out = [f"History for: {name}"]
    current_date = None
    for r in rows:
        d = r["workout_date"]
        if d != current_date:
            current_date = d
            out.append(f"\n{d}:")
        rpe = "" if r["rpe"] is None else f" @RPE {r['rpe']}"
        out.append(f"  set {r['set_no']}: {r['reps']} x {r['weight_kg']} kg{rpe}")

    await update.message.reply_text("\n".join(out))


def main() -> None:
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        raise RuntimeError("Set TELEGRAM_BOT_TOKEN environment variable in Railway.")

    init_db()

    app = Application.builder().token(token).build()

    add_conv = ConversationHandler(
        entry_points=[CommandHandler("add", add_cmd)],
        states={
            DURATION: [MessageHandler(filters.TEXT & ~filters.COMMAND, duration_step)],
            CHOOSE_ENTRY_TYPE: [MessageHandler(filters.TEXT & ~filters.COMMAND, choose_type_step)],

            # Gym
            GYM_EXERCISE: [MessageHandler(filters.TEXT & ~filters.COMMAND, gym_exercise_step)],
            GYM_SETS: [MessageHandler(filters.TEXT & ~filters.COMMAND, gym_sets_step)],
            GYM_REPS: [MessageHandler(filters.TEXT & ~filters.COMMAND, gym_reps_step)],
            GYM_WEIGHT: [MessageHandler(filters.TEXT & ~filters.COMMAND, gym_weight_step)],
            GYM_RPE: [MessageHandler(filters.TEXT & ~filters.COMMAND, gym_rpe_step)],
            GYM_NOTE: [MessageHandler(filters.TEXT & ~filters.COMMAND, gym_note_step)],

            # Cardio
            CARDIO_ACTIVITY: [MessageHandler(filters.TEXT & ~filters.COMMAND, cardio_activity_step)],
            CARDIO_DURATION: [MessageHandler(filters.TEXT & ~filters.COMMAND, cardio_duration_step)],
            CARDIO_DISTANCE: [MessageHandler(filters.TEXT & ~filters.COMMAND, cardio_distance_step)],
            CARDIO_NOTE: [MessageHandler(filters.TEXT & ~filters.COMMAND, cardio_note_step)],

            ADD_ANOTHER: [MessageHandler(filters.TEXT & ~filters.COMMAND, add_another_step)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_cmd))
    app.add_handler(add_conv)
    app.add_handler(CommandHandler("last", last_cmd))
    app.add_handler(CommandHandler("exercise", exercise_cmd))

    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
