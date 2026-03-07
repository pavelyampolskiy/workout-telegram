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
        # Check exact schema — drop all tables if workouts is missing required columns
        info = conn.execute("PRAGMA table_info(workouts)").fetchall()
        existing = {row[1] for row in info}
        needed = {'id', 'user_id', 'date', 'type'}
        if not needed.issubset(existing):
            conn.execute("DROP TABLE IF EXISTS workout_notes")
            conn.execute("DROP TABLE IF EXISTS cardio_entries")
            conn.execute("DROP TABLE IF EXISTS workout_sets")
            conn.execute("DROP TABLE IF EXISTS workout_exercises")
            conn.execute("DROP TABLE IF EXISTS workouts")
            conn.commit()
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS workouts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                type TEXT NOT NULL
            );
        """)
        # Safe migration: add created_at if missing
        cols = {row[1] for row in conn.execute("PRAGMA table_info(workouts)").fetchall()}
        if 'created_at' not in cols:
            conn.execute("ALTER TABLE workouts ADD COLUMN created_at TEXT")
        if 'finished_at' not in cols:
            conn.execute("ALTER TABLE workouts ADD COLUMN finished_at TEXT")
        if 'rating' not in cols:
            conn.execute("ALTER TABLE workouts ADD COLUMN rating INTEGER")
        # Backfill created_at for old records using earliest set timestamp
        conn.execute("""
            UPDATE workouts SET created_at = (
                SELECT MIN(ws.ts)
                FROM workout_exercises we
                JOIN workout_sets ws ON ws.workout_exercise_id = we.id
                WHERE we.workout_id = workouts.id
            ) WHERE created_at IS NULL
        """)
        conn.executescript("""

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
            "INSERT INTO workouts (user_id, date, type, created_at) VALUES (?, ?, ?, ?)",
            (user_id, date.today().isoformat(), workout_type, datetime.utcnow().isoformat()),
        )
        return cur.lastrowid


def finish_workout(workout_id: int):
    with db() as conn:
        conn.execute(
            "UPDATE workouts SET finished_at=? WHERE id=?",
            (datetime.utcnow().isoformat(), workout_id),
        )


def save_rating(workout_id: int, rating: int):
    with db() as conn:
        conn.execute(
            "UPDATE workouts SET rating=? WHERE id=?",
            (rating, workout_id),
        )


def delete_workout(workout_id: int):
    with db() as conn:
        conn.execute("DELETE FROM workouts WHERE id=?", (workout_id,))


def delete_all_workouts(user_id: int):
    with db() as conn:
        conn.execute("DELETE FROM workouts WHERE user_id=?", (user_id,))


def get_workout(workout_id: int):
    with db() as conn:
        return conn.execute("SELECT * FROM workouts WHERE id=?", (workout_id,)).fetchone()


def get_previous_workout(user_id: int, workout_type: str, exclude_workout_id: int):
    """Get the previous workout of the same type for comparison."""
    with db() as conn:
        return conn.execute(
            """SELECT * FROM workouts 
               WHERE user_id=? AND type=? AND id < ? 
               ORDER BY id DESC LIMIT 1""",
            (user_id, workout_type, exclude_workout_id),
        ).fetchone()


def get_unfinished_workout(user_id: int):
    """Get the most recent unfinished workout for a user."""
    with db() as conn:
        return conn.execute(
            """SELECT * FROM workouts 
               WHERE user_id=? AND finished_at IS NULL 
               ORDER BY id DESC LIMIT 1""",
            (user_id,),
        ).fetchone()


def get_history(user_id: int, offset: int = 0, limit: int = 10, workout_type: str = None):
    type_clause = "AND w.type = ?" if workout_type else ""
    params = [user_id] + ([workout_type] if workout_type else []) + [limit + 1, offset]
    with db() as conn:
        rows = conn.execute(
            f"""
            SELECT w.id, w.date, w.type,
                   COALESCE(w.created_at, MIN(ws.ts)) AS started_at,
                   COUNT(ws.id) AS total_sets,
                   COALESCE(CAST(SUM(ws.weight * ws.reps) AS INTEGER), 0) AS total_volume,
                   CAST((julianday(w.finished_at) - julianday(COALESCE(w.created_at, MIN(ws.ts)))) * 1440 AS INTEGER) AS duration_min
            FROM workouts w
            LEFT JOIN workout_exercises we ON we.workout_id = w.id
            LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id
            WHERE w.user_id = ? {type_clause}
            GROUP BY w.id, w.date, w.type
            ORDER BY w.date DESC, w.id DESC
            LIMIT ? OFFSET ?
            """,
            params,
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


def delete_exercise(ex_id: int):
    with db() as conn:
        conn.execute("DELETE FROM workout_exercises WHERE id=?", (ex_id,))


def delete_empty_exercises(workout_id: int):
    """Remove exercises that have zero sets for a given workout."""
    with db() as conn:
        conn.execute(
            """DELETE FROM workout_exercises
               WHERE workout_id=? AND id NOT IN (
                   SELECT DISTINCT workout_exercise_id FROM workout_sets
               )""",
            (workout_id,),
        )


def get_exercise_names_for_user(user_id: int, query: str = None, limit: int = 20):
    """Get distinct (name, grp) from user's workout history, optionally filtered by query."""
    with db() as conn:
        if query and query.strip():
            q = f"%{query.strip().lower()}%"
            rows = conn.execute(
                """
                SELECT DISTINCT we.name, we.grp
                FROM workout_exercises we
                JOIN workouts w ON w.id = we.workout_id
                WHERE w.user_id = ? AND LOWER(we.name) LIKE ?
                ORDER BY we.name
                LIMIT ?
                """,
                (user_id, q, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT DISTINCT we.name, we.grp
                FROM workout_exercises we
                JOIN workouts w ON w.id = we.workout_id
                WHERE w.user_id = ?
                ORDER BY we.name
                LIMIT ?
                """,
                (user_id, limit),
            ).fetchall()
    return [{"name": r["name"], "grp": r["grp"]} for r in rows]


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


# ── Exercise history ──────────────────────────────────────────────────────────

def get_last_exercise_sets(user_id: int, exercise_name: str, exclude_workout_id: int):
    with db() as conn:
        row = conn.execute(
            """
            SELECT we.id, w.date
            FROM workout_exercises we
            JOIN workouts w ON we.workout_id = w.id
            WHERE w.user_id = ? AND we.name = ? AND w.id != ?
            ORDER BY w.date DESC, w.id DESC
            LIMIT 1
            """,
            (user_id, exercise_name, exclude_workout_id),
        ).fetchone()
        if not row:
            return None, None
        sets = conn.execute(
            "SELECT * FROM workout_sets WHERE workout_exercise_id=? ORDER BY set_number",
            (row["id"],),
        ).fetchall()
        return row["date"], sets


# ── Progress ──────────────────────────────────────────────────────────────────

def get_exercise_progress(user_id: int, exercise_name: str, limit: int = 6):
    with db() as conn:
        rows = conn.execute(
            """
            SELECT w.date, MAX(ws.weight) as max_weight
            FROM workout_sets ws
            JOIN workout_exercises we ON ws.workout_exercise_id = we.id
            JOIN workouts w ON we.workout_id = w.id
            WHERE w.user_id = ? AND we.name = ?
            GROUP BY w.id
            ORDER BY w.date DESC, w.id DESC
            LIMIT ?
            """,
            (user_id, exercise_name, limit),
        ).fetchall()
    return list(reversed(rows))


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


def get_total_volume(user_id: int) -> float:
    with db() as conn:
        result = conn.execute(
            """
            SELECT COALESCE(SUM(ws.weight * ws.reps), 0) as total
            FROM workout_sets ws
            JOIN workout_exercises we ON ws.workout_exercise_id = we.id
            JOIN workouts w ON we.workout_id = w.id
            WHERE w.user_id = ?
            """,
            (user_id,),
        ).fetchone()
    return result["total"] if result else 0


def get_workout_patterns(user_id: int, weeks: int = 8):
    """Analyze which days of the week user typically trains (strength only, no cardio)"""
    since = date.today() - timedelta(weeks=weeks)
    with db() as conn:
        rows = conn.execute(
            """
            SELECT date FROM workouts 
            WHERE user_id = ? AND date >= ? AND type IN ('DAY_A', 'DAY_B', 'DAY_C')
            ORDER BY date DESC
            """,
            (user_id, since.isoformat()),
        ).fetchall()
    
    # Count workouts per day of week (0=Monday, 6=Sunday)
    day_counts = [0] * 7
    for row in rows:
        d = date.fromisoformat(row["date"])
        day_counts[d.weekday()] += 1
    
    return {
        "day_counts": day_counts,
        "total": len(rows),
        "weeks_analyzed": weeks,
    }
