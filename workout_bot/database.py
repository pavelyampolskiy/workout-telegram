# database.py
import sqlite3
import os
from datetime import datetime, timedelta, date
from contextlib import contextmanager

DB_PATH = os.getenv("DB_PATH", "workouts.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS workouts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                type TEXT NOT NULL  -- DAY_A / DAY_B / DAY_C / CARDIO
            );

            CREATE TABLE IF NOT EXISTS workout_exercises (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
                grp TEXT NOT NULL,
                name TEXT NOT NULL,
                target_sets INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS workout_sets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workout_exercise_id INTEGER NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
                set_number INTEGER NOT NULL,
                weight REAL NOT NULL,
                reps INTEGER NOT NULL,
                ts TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS cardio_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
                text TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS workout_notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
                text TEXT NOT NULL
            );
        """)


# ── Workouts ─────────────────────────────────────────────────────────────────

def create_workout(user_id: int, workout_type: str) -> int:
    with db() as conn:
        cur = conn.execute(
            "INSERT INTO workouts (user_id, date, type) VALUES (?, ?, ?)",
            (user_id, date.today().isoformat(), workout_type),
        )
        return cur.lastrowid


def delete_workout(workout_id: int):
    with db() as conn:
        conn.execute("DELETE FROM workouts WHERE id=?", (workout_id,))


def get_workout(workout_id: int):
    with db() as conn:
        return conn.execute("SELECT * FROM workouts WHERE id=?", (workout_id,)).fetchone()


def get_history(user_id: int, offset: int = 0, limit: int = 10):
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM workouts WHERE user_id=? ORDER BY date DESC, id DESC LIMIT ? OFFSET ?",
            (user_id, limit + 1, offset),
        ).fetchall()
    has_more = len(rows) > limit
    return rows[:limit], has_more


# ── Exercises ─────────────────────────────────────────────────────────────────

def create_exercise(workout_id: int, grp: str, name: str, target_sets: int) -> int:
    with db() as conn:
        cur = conn.execute(
            "INSERT INTO workout_exercises (workout_id, grp, name, target_sets) VALUES (?,?,?,?)",
            (workout_id, grp, name, target_sets),
        )
        return cur.lastrowid


def get_exercises_for_workout(workout_id: int):
    with db() as conn:
        return conn.execute(
            "SELECT * FROM workout_exercises WHERE workout_id=?", (workout_id,)
        ).fetchall()


def get_exercise(ex_id: int):
    with db() as conn:
        return conn.execute("SELECT * FROM workout_exercises WHERE id=?", (ex_id,)).fetchone()


# ── Sets ──────────────────────────────────────────────────────────────────────

def add_set(ex_id: int, set_number: int, weight: float, reps: int) -> int:
    with db() as conn:
        cur = conn.execute(
            "INSERT INTO workout_sets (workout_exercise_id, set_number, weight, reps, ts) VALUES (?,?,?,?,?)",
            (ex_id, set_number, weight, reps, datetime.utcnow().isoformat()),
        )
        return cur.lastrowid


def get_sets_for_exercise(ex_id: int):
    with db() as conn:
        return conn.execute(
            "SELECT * FROM workout_sets WHERE workout_exercise_id=? ORDER BY set_number",
            (ex_id,),
        ).fetchall()


def delete_set(set_id: int):
    with db() as conn:
        conn.execute("DELETE FROM workout_sets WHERE id=?", (set_id,))


def update_set(set_id: int, weight: float, reps: int):
    with db() as conn:
        conn.execute(
            "UPDATE workout_sets SET weight=?, reps=? WHERE id=?",
            (weight, reps, set_id),
        )


def get_set(set_id: int):
    with db() as conn:
        return conn.execute("SELECT * FROM workout_sets WHERE id=?", (set_id,)).fetchone()


# ── Cardio ────────────────────────────────────────────────────────────────────

def add_cardio(workout_id: int, text: str) -> int:
    with db() as conn:
        cur = conn.execute(
            "INSERT INTO cardio_entries (workout_id, text) VALUES (?,?)",
            (workout_id, text),
        )
        return cur.lastrowid


def get_cardio(workout_id: int):
    with db() as conn:
        return conn.execute(
            "SELECT * FROM cardio_entries WHERE workout_id=?", (workout_id,)
        ).fetchone()


def update_cardio(workout_id: int, text: str):
    with db() as conn:
        conn.execute(
            "UPDATE cardio_entries SET text=? WHERE workout_id=?",
            (text, workout_id),
        )


# ── Notes ─────────────────────────────────────────────────────────────────────

def add_workout_note(workout_id: int, text: str) -> int:
    with db() as conn:
        cur = conn.execute(
            "INSERT INTO workout_notes (workout_id, text) VALUES (?,?)",
            (workout_id, text),
        )
        return cur.lastrowid


def get_workout_note(workout_id: int):
    with db() as conn:
        return conn.execute(
            "SELECT * FROM workout_notes WHERE workout_id=?", (workout_id,)
        ).fetchone()


# ── Stats ─────────────────────────────────────────────────────────────────────

def stats_period(user_id: int, since: date):
    with db() as conn:
        rows = conn.execute(
            "SELECT type, COUNT(*) as cnt FROM workouts WHERE user_id=? AND date>=? GROUP BY type",
            (user_id, since.isoformat()),
        ).fetchall()
    total = sum(r["cnt"] for r in rows)
    by_type = {r["type"]: r["cnt"] for r in rows}
    return total, by_type


def stats_frequency(user_id: int, weeks: int = 4):
    since = date.today() - timedelta(weeks=weeks)
    with db() as conn:
        total = conn.execute(
            "SELECT COUNT(*) as cnt FROM workouts WHERE user_id=? AND date>=?",
            (user_id, since.isoformat()),
        ).fetchone()["cnt"]
    avg = round(total / weeks, 1)
    return total, avg
