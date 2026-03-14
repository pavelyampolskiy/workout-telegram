# api.py
import asyncio
import pathlib
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from datetime import date, timedelta
from typing import Optional

import database as db_ops
from program import PROGRAM

app = FastAPI(title="Workout API")

DIST_DIR = pathlib.Path(__file__).resolve().parent.parent / "webapp" / "dist"

# Bot instance (set by bot.py on startup)
_bot = None

def set_bot_instance(bot):
    global _bot
    _bot = bot

def get_bot():
    return _bot

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Program ───────────────────────────────────────────────────────────────────

@app.get("/api/program")
def get_program():
    return PROGRAM


# ── Custom Days ───────────────────────────────────────────────────────────────

DEFAULT_DAYS = [
    {"key": "DAY_A", "label": "Day A"},
    {"key": "DAY_B", "label": "Day B"},
    {"key": "DAY_C", "label": "Day C"},
]


def _seed_default_days(user_id: int):
    """Insert default days for a user who has none yet."""
    for i, d in enumerate(DEFAULT_DAYS):
        db_ops.create_custom_day(user_id, d["key"], d["label"], i)


@app.get("/api/days")
def get_days(user_id: int):
    days = db_ops.get_custom_days(user_id)
    if not days:
        _seed_default_days(user_id)
        days = db_ops.get_custom_days(user_id)
    return days


class DayCreate(BaseModel):
    user_id: int
    label: str


@app.post("/api/days")
def create_day(body: DayCreate):
    existing = db_ops.get_custom_days(body.user_id)
    sort_order = max((d["sort_order"] for d in existing), default=-1) + 1
    seq = sort_order + 1
    key = f"CUSTOM_{seq}"
    while any(d["key"] == key for d in existing):
        seq += 1
        key = f"CUSTOM_{seq}"
    day_id = db_ops.create_custom_day(body.user_id, key, body.label, sort_order)
    return {"id": day_id, "key": key, "label": body.label, "sort_order": sort_order}


class DayRename(BaseModel):
    label: str


@app.put("/api/days/{day_id}")
def rename_day(day_id: int, body: DayRename):
    db_ops.rename_custom_day(day_id, body.label)
    return {"ok": True}


@app.delete("/api/days/{day_id}")
def delete_day(day_id: int):
    db_ops.delete_custom_day(day_id)
    return {"ok": True}


# ── Workouts ──────────────────────────────────────────────────────────────────

class WorkoutBody(BaseModel):
    user_id: int
    type: str


@app.post("/api/workouts")
def create_workout(body: WorkoutBody):
    wid = db_ops.create_workout(body.user_id, body.type)
    return {"id": wid}


@app.patch("/api/workouts/{workout_id}/finish")
def finish_workout(workout_id: int):
    db_ops.delete_empty_exercises(workout_id)
    db_ops.finish_workout(workout_id)
    return {"ok": True}


class RatingBody(BaseModel):
    rating: int


@app.patch("/api/workouts/{workout_id}/rating")
def save_rating(workout_id: int, body: RatingBody):
    if not (1 <= body.rating <= 5):
        raise HTTPException(status_code=422, detail="rating must be 1–5")
    db_ops.save_rating(workout_id, body.rating)
    return {"ok": True}


@app.get("/api/workouts/unfinished")
def get_unfinished_workout(user_id: int):
    """Get the most recent unfinished workout for a user."""
    w = db_ops.get_unfinished_workout(user_id)
    if not w:
        return {"workout": None}
    wtype = w["type"]
    label = wtype.replace("DAY_", "Day ")
    days = db_ops.get_custom_days(user_id)
    for d in days:
        if d["key"] == wtype:
            label = d["label"]
            break
    return {
        "workout": {
            "id": w["id"],
            "type": wtype,
            "label": label,
            "date": w["date"],
            "created_at": w["created_at"],
        }
    }


@app.delete("/api/workouts/{workout_id}")
def delete_workout(workout_id: int):
    db_ops.delete_workout(workout_id)
    return {"ok": True}


@app.get("/api/workouts/{workout_id}")
def get_workout(workout_id: int):
    w = db_ops.get_workout(workout_id)
    if not w:
        raise HTTPException(status_code=404, detail="Not found")
    exs = db_ops.get_exercises_for_workout(workout_id)
    exercises = []
    for ex in exs:
        sets = db_ops.get_sets_for_exercise(ex["id"])
        if not sets:
            continue
        volume = sum(s["weight"] * s["reps"] for s in sets)
        exercises.append({
            "id": ex["id"],
            "grp": ex["grp"],
            "name": ex["name"],
            "target_sets": ex["target_sets"],
            "volume": volume,
            "sets": [
                {"id": s["id"], "set_number": s["set_number"], "weight": s["weight"], "reps": s["reps"]}
                for s in sets
            ],
        })
    cardio = db_ops.get_cardio(workout_id)
    note = db_ops.get_workout_note(workout_id)
    
    # Get previous workout of same type for comparison
    prev_exercises = {}
    prev_workout = db_ops.get_previous_workout(w["user_id"], w["type"], workout_id)
    if prev_workout:
        prev_exs = db_ops.get_exercises_for_workout(prev_workout["id"])
        for pex in prev_exs:
            psets = db_ops.get_sets_for_exercise(pex["id"])
            prev_volume = sum(s["weight"] * s["reps"] for s in psets)
            prev_exercises[pex["name"]] = prev_volume
    
    return {
        "id": w["id"],
        "user_id": w["user_id"],
        "date": w["date"],
        "type": w["type"],
        "rating": w["rating"],
        "exercises": exercises,
        "prev_exercises": prev_exercises,
        "cardio": cardio["text"] if cardio else None,
        "note": note["text"] if note else None,
    }


@app.get("/api/history")
def get_history(user_id: int, offset: int = 0, limit: int = 10, type: str = None):
    rows, has_more = db_ops.get_history(user_id, offset, limit, workout_type=type)
    return {
        "items": [{"id": r["id"], "date": r["date"], "type": r["type"], "started_at": r["started_at"], "total_sets": r["total_sets"], "total_volume": r["total_volume"], "duration_min": r["duration_min"]} for r in rows],
        "has_more": has_more,
    }


@app.delete("/api/history")
def delete_all_history(user_id: int):
    db_ops.delete_all_workouts(user_id)
    return {"ok": True}


# ── Exercises ─────────────────────────────────────────────────────────────────

class ExerciseBody(BaseModel):
    grp: str
    name: str
    target_sets: int


@app.post("/api/workouts/{workout_id}/exercises")
def create_exercise(workout_id: int, body: ExerciseBody):
    eid = db_ops.create_exercise(workout_id, body.grp, body.name, body.target_sets)
    return {"id": eid}


@app.delete("/api/exercises/{ex_id}")
def delete_exercise(ex_id: int):
    db_ops.delete_exercise(ex_id)
    return {"ok": True}


@app.get("/api/exercises/search")
def search_exercises(user_id: int, q: str = None, limit: int = 20):
    """Get exercise names from user's history for autocomplete."""
    items = db_ops.get_exercise_names_for_user(user_id, query=q or "", limit=limit)
    return {"exercises": items}


@app.get("/api/exercises/{ex_id}/last")
def get_last_exercise(ex_id: int, user_id: int, exclude_wid: int):
    ex = db_ops.get_exercise(ex_id)
    if not ex:
        raise HTTPException(status_code=404, detail="Not found")
    last_date, last_sets = db_ops.get_last_exercise_sets(user_id, ex["name"], exclude_wid)
    if not last_date:
        return {"date": None, "sets": []}
    return {
        "date": last_date,
        "sets": [{"weight": s["weight"], "reps": s["reps"]} for s in last_sets],
    }


# ── Sets ──────────────────────────────────────────────────────────────────────

class SetBody(BaseModel):
    weight: float
    reps: int


@app.get("/api/exercises/{ex_id}/sets")
def get_sets(ex_id: int):
    sets = db_ops.get_sets_for_exercise(ex_id)
    return [
        {"id": s["id"], "set_number": s["set_number"], "weight": s["weight"], "reps": s["reps"]}
        for s in sets
    ]


@app.post("/api/exercises/{ex_id}/sets")
def add_set(ex_id: int, body: SetBody):
    sets = db_ops.get_sets_for_exercise(ex_id)
    sid = db_ops.add_set(ex_id, len(sets) + 1, body.weight, body.reps)
    return {"id": sid}


@app.put("/api/sets/{set_id}")
def update_set(set_id: int, body: SetBody):
    db_ops.update_set(set_id, body.weight, body.reps)
    return {"ok": True}


@app.delete("/api/sets/{set_id}")
def delete_set(set_id: int):
    db_ops.delete_set(set_id)
    return {"ok": True}


# ── Cardio ────────────────────────────────────────────────────────────────────

class TextBody(BaseModel):
    text: str


@app.post("/api/workouts/{workout_id}/cardio")
def add_cardio(workout_id: int, body: TextBody):
    cid = db_ops.add_cardio(workout_id, body.text)
    return {"id": cid}


@app.put("/api/workouts/{workout_id}/cardio")
def update_cardio(workout_id: int, body: TextBody):
    db_ops.update_cardio(workout_id, body.text)
    return {"ok": True}


# ── Notes ─────────────────────────────────────────────────────────────────────

@app.post("/api/workouts/{workout_id}/note")
def add_note(workout_id: int, body: TextBody):
    nid = db_ops.add_workout_note(workout_id, body.text)
    return {"id": nid}


@app.put("/api/workouts/{workout_id}/note")
def update_note(workout_id: int, body: TextBody):
    db_ops.update_workout_note(workout_id, body.text)
    return {"ok": True}


# ── Stats ─────────────────────────────────────────────────────────────────────

@app.get("/api/stats")
def get_stats(user_id: int, days: int = 7):
    since = date.today() - timedelta(days=days)
    total, by_type = db_ops.stats_period(user_id, since)
    return {"total": total, "by_type": by_type}


@app.get("/api/stats/frequency")
def get_frequency(user_id: int, weeks: int = 4):
    total, avg = db_ops.stats_frequency(user_id, weeks)
    return {"total": total, "avg": avg, "weeks": weeks}


# ── Progress ──────────────────────────────────────────────────────────────────

@app.get("/api/progress")
def get_progress(user_id: int, exercise_name: str, limit: int = 8):
    rows = db_ops.get_exercise_progress(user_id, exercise_name, limit)
    return [{"date": r["date"], "max_weight": r["max_weight"]} for r in rows]


# ── Achievements ─────────────────────────────────────────────────────────────

ACHIEVEMENTS = [
    {"id": "workouts_25", "name": "Rookie", "desc": "Complete 25 workouts", "icon": "crown", "threshold": 25},
    {"id": "workouts_50", "name": "Regular", "desc": "Complete 50 workouts", "icon": "crown", "threshold": 50},
    {"id": "workouts_100", "name": "Legend", "desc": "Complete 100 workouts", "icon": "crown", "threshold": 100},
    {"id": "workouts_250", "name": "Elite", "desc": "Complete 250 workouts", "icon": "crown", "threshold": 250},
    {"id": "volume_10k", "name": "10K Club", "desc": "Lift 10,000 kg total", "icon": "trophy", "threshold": 10000, "type": "volume"},
    {"id": "volume_50k", "name": "50K Club", "desc": "Lift 50,000 kg total", "icon": "trophy", "threshold": 50000, "type": "volume"},
    {"id": "volume_100k", "name": "100K Club", "desc": "Lift 100,000 kg total", "icon": "trophy", "threshold": 100000, "type": "volume"},
    {"id": "volume_250k", "name": "Quarter Ton", "desc": "Lift 250,000 kg total", "icon": "trophy", "threshold": 250000, "type": "volume"},
    {"id": "volume_500k", "name": "Half Million", "desc": "Lift 500,000 kg total", "icon": "trophy", "threshold": 500000, "type": "volume"},
    {"id": "streak_6", "name": "Beast Mode", "desc": "6 workouts this week", "icon": "bolt", "threshold": 6, "type": "weekly"},
    {"id": "cardio_25", "name": "Cardio Starter", "desc": "Complete 25 cardio sessions", "icon": "zap", "threshold": 25, "type": "cardio"},
    {"id": "cardio_50", "name": "Cardio Fan", "desc": "Complete 50 cardio sessions", "icon": "zap", "threshold": 50, "type": "cardio"},
    {"id": "cardio_100", "name": "Marathon Mind", "desc": "Complete 100 cardio sessions", "icon": "zap", "threshold": 100, "type": "cardio"},
    {"id": "volume_1m", "name": "Millionaire", "desc": "Lift 1,000,000 kg total", "icon": "trophy", "threshold": 1000000, "type": "volume"},
    {"id": "streak_52w", "name": "365 Club", "desc": "Train every week for a year", "icon": "bolt", "threshold": 52, "type": "weekly_streak"},
]

@app.get("/api/achievements")
def get_achievements(user_id: int):
    total, _ = db_ops.stats_frequency(user_id, 52)
    total_volume = db_ops.get_total_volume(user_id)
    week_stats = db_ops.stats_period(user_id, date.today() - timedelta(days=7))
    week_count = week_stats[0] if week_stats else 0
    cardio_count = db_ops.get_cardio_count(user_id)
    weekly_streak = db_ops.get_weekly_streak(user_id)
    
    unlocked = []
    locked = []
    
    for ach in ACHIEVEMENTS:
        ach_type = ach.get("type", "workouts")
        threshold = ach["threshold"]
        
        if ach_type == "volume":
            earned = total_volume >= threshold
            progress = min(total_volume / threshold, 1.0)
        elif ach_type == "weekly":
            earned = week_count >= threshold
            progress = min(week_count / threshold, 1.0)
        elif ach_type == "cardio":
            earned = cardio_count >= threshold
            progress = min(cardio_count / threshold, 1.0)
        elif ach_type == "weekly_streak":
            earned = weekly_streak["max"] >= threshold
            progress = min(weekly_streak["max"] / threshold, 1.0)
        else:
            earned = total >= threshold
            progress = min(total / threshold, 1.0)
        
        item = {**ach, "earned": earned, "progress": round(progress, 2)}
        if earned:
            unlocked.append(item)
        else:
            locked.append(item)
    
    return {"unlocked": unlocked, "locked": locked, "total_workouts": total, "total_volume": total_volume}


# ── Rest Timer Notifications ─────────────────────────────────────────────────

# Store pending notifications (in-memory, resets on restart)
_pending_notifications = {}

class RestTimerBody(BaseModel):
    user_id: int
    delay_seconds: int
    exercise_name: Optional[str] = None

async def send_rest_notification(user_id: int, exercise_name: Optional[str]):
    """Background task to send notification after delay"""
    bot = get_bot()
    if not bot:
        return
    
    try:
        if exercise_name:
            text = f"⏱ Rest timer finished!\n\nTime to continue with {exercise_name} 💪"
        else:
            text = "⏱ Rest timer finished!\n\nTime for your next set 💪"
        
        await bot.send_message(chat_id=user_id, text=text)
    except Exception as e:
        print(f"Failed to send notification to {user_id}: {e}")

@app.post("/api/rest-timer/start")
async def start_rest_timer(body: RestTimerBody, background_tasks: BackgroundTasks):
    """Schedule a notification to be sent after delay_seconds"""
    user_id = body.user_id
    delay = body.delay_seconds
    
    # Cancel any existing timer for this user
    if user_id in _pending_notifications:
        task = _pending_notifications[user_id]
        task.cancel()
    
    async def delayed_notification():
        await asyncio.sleep(delay)
        await send_rest_notification(user_id, body.exercise_name)
        _pending_notifications.pop(user_id, None)
    
    # Create and store the task
    task = asyncio.create_task(delayed_notification())
    _pending_notifications[user_id] = task
    
    return {"status": "scheduled", "delay": delay}

@app.post("/api/rest-timer/cancel")
async def cancel_rest_timer(user_id: int):
    """Cancel a pending notification"""
    if user_id in _pending_notifications:
        task = _pending_notifications.pop(user_id)
        task.cancel()
        return {"status": "cancelled"}
    return {"status": "not_found"}


# ── Smart Reminders ──────────────────────────────────────────────────────────

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

@app.get("/api/smart-reminder")
def get_smart_reminder(user_id: int):
    """Get a smart reminder based on user's workout patterns"""
    patterns = db_ops.get_workout_patterns(user_id, weeks=8)
    day_counts = patterns["day_counts"]
    total = patterns["total"]
    
    # Need at least 4 workouts to detect patterns
    if total < 4:
        return {"reminder": None, "reason": "not_enough_data"}
    
    today = date.today().weekday()  # 0=Monday
    
    # Find user's most common workout days
    threshold = total / 8  # Average per day over 8 weeks
    common_days = [(i, count) for i, count in enumerate(day_counts) if count >= threshold]
    common_days.sort(key=lambda x: x[1], reverse=True)
    
    if not common_days:
        return {"reminder": None, "reason": "no_pattern"}
    
    # Check if today is a common workout day
    today_count = day_counts[today]
    is_workout_day = today_count >= threshold
    
    # Check last strength workout date (exclude cardio)
    hist = db_ops.get_history(user_id, 0, 10)  # Get more to find strength workout
    last_workout_date = None
    days_since = None
    for w in hist:
        if w["type"] in ("DAY_A", "DAY_B", "DAY_C"):
            last_workout_date = w["date"]
            last_date = date.fromisoformat(last_workout_date)
            days_since = (date.today() - last_date).days
            break
    
    # Generate reminder message
    reminder = None
    
    if is_workout_day and (days_since is None or days_since >= 1):
        # Today is a typical workout day
        day_name = DAY_NAMES[today]
        reminder = f"You usually train on {day_name}s. Ready to go? 💪"
    elif days_since and days_since >= 3:
        # Haven't trained in a while
        next_common = None
        for i in range(1, 8):
            check_day = (today + i) % 7
            if day_counts[check_day] >= threshold:
                next_common = check_day
                break
        
        if next_common is not None:
            if next_common == (today + 1) % 7:
                reminder = f"Tomorrow is your usual {DAY_NAMES[next_common]} workout!"
            else:
                reminder = f"Your next typical workout day is {DAY_NAMES[next_common]}."
        else:
            reminder = f"It's been {days_since} days since your last workout."
    
    return {
        "reminder": reminder,
        "is_workout_day": is_workout_day,
        "days_since_last": days_since,
        "common_days": [DAY_NAMES[d[0]] for d in common_days[:3]],
    }


# ── Serve frontend SPA ────────────────────────────────────────────────────────

if DIST_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="static")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        # Resolve path and ensure it stays under DIST_DIR (prevent path traversal)
        try:
            file = (DIST_DIR / full_path).resolve()
            if not str(file).startswith(str(DIST_DIR.resolve())):
                return FileResponse(DIST_DIR / "index.html")
        except (OSError, RuntimeError):
            return FileResponse(DIST_DIR / "index.html")
        if file.is_file():
            return FileResponse(file)
        return FileResponse(DIST_DIR / "index.html")
