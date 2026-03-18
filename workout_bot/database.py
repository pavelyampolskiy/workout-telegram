# database.py
import sqlite3
import os
from datetime import datetime, timedelta, date
from contextlib import contextmanager

def _get_db_path():
    # Явно заданный путь (например в Railway Variables) имеет приоритет
    explicit = os.getenv("DB_PATH", "").strip()
    if explicit:
        return explicit
    mount = os.getenv("RAILWAY_VOLUME_MOUNT_PATH", "").rstrip("/")
    if mount:
        return os.path.join(mount, "workouts.db")
    return "workouts.db"


DB_PATH = _get_db_path()


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

            CREATE TABLE IF NOT EXISTS custom_days (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                key TEXT NOT NULL,
                label TEXT NOT NULL,
                sort_order INTEGER NOT NULL DEFAULT 0,
                UNIQUE(user_id, key)
            );

            CREATE TABLE IF NOT EXISTS supplements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                dosage TEXT NOT NULL,
                intake_time TEXT NOT NULL,
                duration_days INTEGER,
                is_preset INTEGER NOT NULL DEFAULT 0,
                category TEXT NOT NULL DEFAULT 'custom',
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """)
        # Migration: ensure workout_sets.weight is REAL (decimal weights like 145.7)
        try:
            info = conn.execute("PRAGMA table_info(workout_sets)").fetchall()
            weight_col = next((r for r in info if r[1] == "weight"), None)
            if weight_col and str(weight_col[2]).upper() not in ("REAL", "DOUBLE", "FLOAT"):
                conn.execute("""
                    CREATE TABLE workout_sets_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        workout_exercise_id INTEGER NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
                        set_number INTEGER NOT NULL,
                        weight REAL NOT NULL,
                        reps INTEGER NOT NULL,
                        ts TEXT NOT NULL
                    )
                """)
                conn.execute("""
                    INSERT INTO workout_sets_new (id, workout_exercise_id, set_number, weight, reps, ts)
                    SELECT id, workout_exercise_id, set_number, CAST(weight AS REAL), reps, ts FROM workout_sets
                """)
                conn.execute("DROP TABLE workout_sets")
                conn.execute("ALTER TABLE workout_sets_new RENAME TO workout_sets")
        except Exception:
            pass
        # Migration: user_program table for per-user program templates
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_program (
                user_id INTEGER NOT NULL,
                day_key TEXT NOT NULL,
                sort_order INTEGER NOT NULL,
                grp TEXT NOT NULL,
                name TEXT NOT NULL,
                target_sets INTEGER NOT NULL
            )
        """)
        # Migration: exercise renames so Progress keeps history (old_name -> new_name)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS exercise_aliases (
                user_id INTEGER NOT NULL,
                from_name TEXT NOT NULL,
                to_name TEXT NOT NULL
            )
        """)


# ── Custom Days ──────────────────────────────────────────────────────────────

def get_custom_days(user_id: int):
    with db() as conn:
        rows = conn.execute(
            "SELECT id, key, label, sort_order FROM custom_days WHERE user_id=? ORDER BY sort_order",
            (user_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def create_custom_day(user_id: int, key: str, label: str, sort_order: int) -> int:
    with db() as conn:
        cur = conn.execute(
            "INSERT INTO custom_days (user_id, key, label, sort_order) VALUES (?,?,?,?)",
            (user_id, key, label, sort_order),
        )
    return cur.lastrowid


def rename_custom_day(day_id: int, label: str):
    with db() as conn:
        conn.execute("UPDATE custom_days SET label=? WHERE id=?", (label, day_id))


def delete_custom_day(day_id: int):
    with db() as conn:
        conn.execute("DELETE FROM custom_days WHERE id=?", (day_id,))


# ── User Program (template per day) ─────────────────────────────────────────

def get_user_program(user_id: int, day_key: str):
    """Return list of { grp, name, target_sets } for the day, ordered by sort_order."""
    with db() as conn:
        rows = conn.execute(
            "SELECT grp, name, target_sets FROM user_program WHERE user_id=? AND day_key=? ORDER BY sort_order",
            (user_id, day_key),
        ).fetchall()
    return [dict(r) for r in rows]


def _record_exercise_rename(conn, user_id: int, day_key: str, old_list: list, new_list: list):
    """When saving program, record renames (same index, different name) so Progress can show history."""
    for i in range(min(len(old_list), len(new_list))):
        old_name = (old_list[i].get("name") or "").strip()
        new_name = (new_list[i].get("name") or "").strip()
        if old_name and new_name and old_name != new_name:
            existing = conn.execute(
                "SELECT 1 FROM exercise_aliases WHERE user_id=? AND from_name=? AND to_name=?",
                (user_id, old_name, new_name),
            ).fetchone()
            if not existing:
                conn.execute(
                    "INSERT INTO exercise_aliases (user_id, from_name, to_name) VALUES (?,?,?)",
                    (user_id, old_name, new_name),
                )


def add_exercise_alias(user_id: int, from_name: str, to_name: str) -> bool:
    """Manually link an old exercise name to the current one so progress is merged. Returns True if added."""
    from_name = (from_name or "").strip()
    to_name = (to_name or "").strip()
    if not from_name or not to_name or from_name == to_name:
        return False
    with db() as conn:
        existing = conn.execute(
            "SELECT 1 FROM exercise_aliases WHERE user_id=? AND from_name=? AND to_name=?",
            (user_id, from_name, to_name),
        ).fetchone()
        if existing:
            return False
        conn.execute(
            "INSERT INTO exercise_aliases (user_id, from_name, to_name) VALUES (?,?,?)",
            (user_id, from_name, to_name),
        )
    return True


def _resolve_exercise_names(conn, user_id: int, current_name: str) -> list:
    """Return [current_name] + all previous names that were renamed to this (transitively)."""
    names = {current_name}
    while True:
        added = set()
        for to_name in list(names):
            rows = conn.execute(
                "SELECT from_name FROM exercise_aliases WHERE user_id=? AND to_name=?",
                (user_id, to_name),
            ).fetchall()
            for r in rows:
                added.add(r["from_name"])
        if not added - names:
            break
        names |= added
    return list(names)


def save_user_program(user_id: int, day_key: str, exercises: list):
    """Replace all exercises for (user_id, day_key) with the given list. Each item: { grp, name, target_sets }."""
    with db() as conn:
        old_list = conn.execute(
            "SELECT grp, name, target_sets FROM user_program WHERE user_id=? AND day_key=? ORDER BY sort_order",
            (user_id, day_key),
        ).fetchall()
        old_list = [dict(r) for r in old_list]
        _record_exercise_rename(conn, user_id, day_key, old_list, exercises)
        conn.execute("DELETE FROM user_program WHERE user_id=? AND day_key=?", (user_id, day_key))
        for i, ex in enumerate(exercises):
            conn.execute(
                "INSERT INTO user_program (user_id, day_key, sort_order, grp, name, target_sets) VALUES (?,?,?,?,?,?)",
                (user_id, day_key, i, ex.get("grp") or ex.get("group"), ex.get("name"), ex.get("target_sets", 3)),
            )


def count_finished_workouts_for_day(user_id: int, day_key: str) -> int:
    with db() as conn:
        row = conn.execute(
            "SELECT COUNT(*) as cnt FROM workouts WHERE user_id=? AND type=? AND finished_at IS NOT NULL",
            (user_id, day_key),
        ).fetchone()
    return row["cnt"] if row else 0


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
            (ex_id, set_number, float(weight), reps, datetime.utcnow().isoformat()),
        )
        return cur.lastrowid


def get_sets_for_exercise(ex_id: int):
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM workout_sets WHERE workout_exercise_id=? ORDER BY set_number",
            (ex_id,),
        ).fetchall()
        return [
            {"id": r["id"], "set_number": r["set_number"], "weight": float(r["weight"]), "reps": r["reps"]}
            for r in rows
        ]


def delete_set(set_id: int):
    with db() as conn:
        conn.execute("DELETE FROM workout_sets WHERE id=?", (set_id,))


def update_set(set_id: int, weight: float, reps: int):
    with db() as conn:
        conn.execute(
            "UPDATE workout_sets SET weight=?, reps=? WHERE id=?",
            (float(weight), reps, set_id),
        )


def get_set(set_id: int):
    with db() as conn:
        r = conn.execute("SELECT * FROM workout_sets WHERE id=?", (set_id,)).fetchone()
        if r is None:
            return None
        return {**dict(r), "weight": float(r["weight"])}


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
        rows = conn.execute(
            "SELECT * FROM workout_sets WHERE workout_exercise_id=? ORDER BY set_number",
            (row["id"],),
        ).fetchall()
        sets = [
            {"weight": float(r["weight"]), "reps": r["reps"]}
            for r in rows
        ]
        return row["date"], sets


# ── Progress ──────────────────────────────────────────────────────────────────

def get_exercise_progress(user_id: int, exercise_name: str, limit: int = 6):
    """Return progress (date, max_weight) per workout for the given exercise name only."""
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


def update_workout_note(workout_id: int, text: str):
    with db() as conn:
        existing = conn.execute(
            "SELECT id FROM workout_notes WHERE workout_id=?", (workout_id,)
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE workout_notes SET text=? WHERE workout_id=?",
                (text, workout_id),
            )
        else:
            conn.execute(
                "INSERT INTO workout_notes (workout_id, text) VALUES (?,?)",
                (workout_id, text),
            )


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


def get_workout_dates(user_id: int, since: date, end: date = None):
    """Return list of date strings (YYYY-MM-DD), one per finished workout (duplicates = multiple workouts that day)."""
    with db() as conn:
        if end is not None:
            rows = conn.execute(
                "SELECT date FROM workouts WHERE user_id=? AND date>=? AND date<=? AND finished_at IS NOT NULL ORDER BY date",
                (user_id, since.isoformat(), end.isoformat()),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT date FROM workouts WHERE user_id=? AND date>=? AND finished_at IS NOT NULL ORDER BY date",
                (user_id, since.isoformat()),
            ).fetchall()
    return [r["date"] for r in rows]


def get_frequency_months(user_id: int):
    """Return list of (year, month) for months that have at least one finished workout, newest first."""
    with db() as conn:
        rows = conn.execute(
            """
            SELECT DISTINCT CAST(strftime('%Y', date) AS INTEGER) AS year,
                   CAST(strftime('%m', date) AS INTEGER) AS month
            FROM workouts
            WHERE user_id = ? AND finished_at IS NOT NULL
            ORDER BY year DESC, month DESC
            """,
            (user_id,),
        ).fetchall()
    return [(r["year"], r["month"]) for r in rows]


def get_cardio_count(user_id: int) -> int:
    with db() as conn:
        result = conn.execute(
            "SELECT COUNT(*) as cnt FROM workouts WHERE user_id=? AND type='CARDIO' AND finished_at IS NOT NULL",
            (user_id,),
        ).fetchone()
    return result["cnt"] if result else 0


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


def get_weekly_streak(user_id: int) -> dict:
    """Return current and max consecutive-week training streaks."""
    with db() as conn:
        rows = conn.execute(
            """SELECT DISTINCT date FROM workouts
               WHERE user_id=? AND finished_at IS NOT NULL
               ORDER BY date""",
            (user_id,),
        ).fetchall()

    if not rows:
        return {"current": 0, "max": 0}

    weeks_set: set[tuple[int, int]] = set()
    for row in rows:
        d = date.fromisoformat(row["date"])
        iso = d.isocalendar()
        weeks_set.add((iso[0], iso[1]))

    sorted_weeks = sorted(weeks_set)

    max_streak = 1
    cur_streak = 1
    for i in range(1, len(sorted_weeks)):
        prev_y, prev_w = sorted_weeks[i - 1]
        cur_y, cur_w = sorted_weeks[i]

        prev_date = date.fromisocalendar(prev_y, prev_w, 1)
        cur_date = date.fromisocalendar(cur_y, cur_w, 1)

        if (cur_date - prev_date).days == 7:
            cur_streak += 1
        else:
            cur_streak = 1
        max_streak = max(max_streak, cur_streak)

    # Check if current streak is still active (includes this or last week)
    today = date.today()
    this_iso = (today.isocalendar()[0], today.isocalendar()[1])
    last_week = today - timedelta(days=7)
    last_iso = (last_week.isocalendar()[0], last_week.isocalendar()[1])

    if sorted_weeks[-1] not in (this_iso, last_iso):
        cur_streak = 0

    return {"current": cur_streak, "max": max_streak}


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

    if not rows:
        return {}

    day_counts = defaultdict(int)
    for row in rows:
        d = date.fromisoformat(row["date"])
        day_counts[d.weekday()] += 1

    return dict(day_counts)


# Supplements functions
def get_supplements(user_id: int):
    """Get all supplements for user"""
    with db() as conn:
        return conn.execute(
            """
            SELECT id, name, dosage, intake_time, duration_days, is_preset, category, is_active, created_at
            FROM supplements 
            WHERE user_id = ? 
            ORDER BY is_active DESC, created_at DESC
            """,
            (user_id,),
        ).fetchall()


def get_active_supplements(user_id: int):
    """Get only active supplements for widget display"""
    with db() as conn:
        return conn.execute(
            """
            SELECT name FROM supplements 
            WHERE user_id = ? AND is_active = 1
            ORDER BY created_at DESC
            LIMIT 3
            """,
            (user_id,),
        ).fetchall()


def create_supplement(user_id: int, name: str, dosage: str, intake_time: str, 
                     duration_days: int = None, is_preset: bool = False, 
                     category: str = 'custom'):
    """Create new supplement"""
    with db() as conn:
        cursor = conn.execute(
            """
            INSERT INTO supplements (user_id, name, dosage, intake_time, duration_days, is_preset, category)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, name, dosage, intake_time, duration_days, int(is_preset), category),
        )
        return cursor.lastrowid


def update_supplement(supplement_id: int, **kwargs):
    """Update supplement fields"""
    if not kwargs:
        return
    
    fields = []
    values = []
    for key, value in kwargs.items():
        if key in ['name', 'dosage', 'intake_time', 'duration_days', 'is_active']:
            fields.append(f"{key} = ?")
            values.append(value)
    
    if not fields:
        return
    
    values.append(supplement_id)
    
    with db() as conn:
        conn.execute(
            f"UPDATE supplements SET {', '.join(fields)} WHERE id = ?",
            values,
        )


def delete_supplement(supplement_id: int):
    """Delete supplement"""
    with db() as conn:
        conn.execute("DELETE FROM supplements WHERE id = ?", (supplement_id,))


def get_preset_supplements():
    """Get preset supplements list"""
    return [
        {"name": "Protein", "dosage": "30g", "intake_time": "After workout"},
        {"name": "Creatine", "dosage": "5g", "intake_time": "Any time"},
        {"name": "BCAA", "dosage": "10g", "intake_time": "During workout"},
        {"name": "Vitamins", "dosage": "1 tablet", "intake_time": "Morning"},
        {"name": "Omega-3", "dosage": "1000mg", "intake_time": "With meal"},
        {"name": "Pre-workout", "dosage": "1 scoop", "intake_time": "30 min before workout"},
    ]
