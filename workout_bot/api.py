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

def _program_for_user(user_id: int):
    """Build program dict for user: each day_key -> list of { group, name, target_sets }. Uses user_program if set, else PROGRAM default."""
    days = db_ops.get_custom_days(user_id)
    if not days:
        _seed_default_days(user_id)
        days = db_ops.get_custom_days(user_id)
    out = {}
    for d in days:
        key = d["key"]
        custom = db_ops.get_user_program(user_id, key)
        if custom:
            out[key] = [{"group": r["grp"], "name": r["name"], "target_sets": r["target_sets"]} for r in custom]
        elif key in PROGRAM:
            out[key] = [{"group": x["group"], "name": x["name"], "target_sets": x["target_sets"]} for x in PROGRAM[key]]
        else:
            out[key] = []
    return out


@app.get("/api/program")
def get_program(user_id: int):
    return _program_for_user(user_id)


class ProgramDayBody(BaseModel):
    user_id: int
    exercises: list  # [ { group, name, target_sets }, ... ]


@app.put("/api/program/{day_key}")
def save_program_day(day_key: str, body: ProgramDayBody):
    exercises = []
    for ex in body.exercises:
        item = ex if isinstance(ex, dict) else {}
        grp = item.get("group") or item.get("grp") or "CHEST"
        name = item.get("name") or "Exercise"
        target_sets = int(item.get("target_sets", 3))
        exercises.append({"grp": grp, "name": name, "target_sets": target_sets})
    db_ops.save_user_program(body.user_id, day_key, exercises)
    return {"ok": True}


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
    date: Optional[str] = None


@app.post("/api/workouts")
def create_workout(body: WorkoutBody):
    wid = db_ops.create_workout(body.user_id, body.type, body.date)
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


# ── Day Customizations ──────────────────────────────────────────────────────────

class DayCustomizationBody(BaseModel):
    removed_exercises: list
    added_exercises: list

@app.get("/api/day-customizations/{day_type}")
def get_day_customizations(day_type: str, user_id: int):
    """Get day customizations for a user"""
    removed, added = db_ops.get_day_customization(user_id, day_type)
    return {
        "removed_exercises": removed or [],
        "added_exercises": added or []
    }

@app.post("/api/day-customizations/{day_type}")
def save_day_customizations(day_type: str, body: DayCustomizationBody, user_id: int):
    """Save day customizations for a user"""
    db_ops.save_day_customization(user_id, day_type, body.removed_exercises, body.added_exercises)
    return {"ok": True}

@app.get("/api/program/{day_type}/customized")
def get_customized_program(day_type: str, user_id: int):
    """Get program with customizations applied"""
    # Get base program
    base_program = db_ops.get_user_program(user_id)
    base_exercises = base_program.get(day_type, [])
    
    # Get customizations
    removed, added = db_ops.get_day_customization(user_id, day_type)
    
    # Apply customizations
    if removed or added:
        customized_exercises = db_ops.apply_day_customization(base_exercises, removed or [], added or [])
    else:
        customized_exercises = base_exercises
    
    return {
        "day_type": day_type,
        "exercises": customized_exercises,
        "has_customizations": bool(removed or added)
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
def get_stats(user_id: int, days: int = 7, calendar_week: bool = False):
    today = date.today()
    if calendar_week:
        # Current calendar week (Monday = start of week)
        since = today - timedelta(days=today.weekday())
    else:
        since = today - timedelta(days=days)
    total, by_type = db_ops.stats_period(user_id, since)
    return {"total": total, "by_type": by_type}


@app.get("/api/stats/frequency")
def get_frequency(user_id: int, period: str = "month", year: int = None, month: int = None):
    """period=month: workouts for a calendar month. year/month = that month; else current month."""
    today = date.today()
    if period == "month":
        if year is not None and month is not None:
            since = date(year, month, 1)
            next_first = date(year, month + 1, 1) if month < 12 else date(year + 1, 1, 1)
            end = next_first - timedelta(days=1)
        else:
            since = today.replace(day=1)
            end = today
        dates = db_ops.get_workout_dates(user_id, since, end)
        total = len(dates)
        days_in_range = (end - since).days + 1
        weeks_elapsed = max(0.1, days_in_range / 7.0)
        avg = round(total / weeks_elapsed, 1)
        return {
            "total": total,
            "avg": avg,
            "period": "month",
            "year": since.year,
            "month": since.month,
            "since": since.isoformat(),
            "until": end.isoformat(),
            "dates": dates,
        }
    weeks = 6
    total, avg = db_ops.stats_frequency(user_id, weeks)
    since = today - timedelta(weeks=weeks)
    dates = db_ops.get_workout_dates(user_id, since)
    return {"total": total, "avg": avg, "period": "weeks", "weeks": weeks, "dates": dates}


@app.get("/api/stats/frequency/months")
def get_frequency_months(user_id: int):
    """Return list of {year, month} for months that have at least one workout, newest first."""
    months = db_ops.get_frequency_months(user_id)
    return [{"year": y, "month": m} for y, m in months]


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
    patterns = db_ops.get_workout_patterns(user_id, weeks=2)
    day_counts = patterns["day_counts"]
    total = patterns["total"]
    last_workout_date = patterns["last_workout_date"]
    
    # Need at least 3 workouts to detect patterns (lowered from 4)
    if total < 3:
        return {"reminder": None, "reason": "not_enough_data"}
    
    today = date.today().weekday()  # 0=Monday
    
    # Find user's most common workout days (more lenient threshold)
    threshold = max(1, total // 4)  # At least 1 workout on that day
    common_days = [(i, count) for i, count in enumerate(day_counts) if count >= threshold]
    common_days.sort(key=lambda x: x[1], reverse=True)
    
    if not common_days:
        return {"reminder": None, "reason": "no_pattern"}
    
    # Check if today is a common workout day
    today_count = day_counts.get(today, 0)
    is_workout_day = today_count >= threshold
    
    # Calculate days since last workout
    days_since = None
    if last_workout_date:
        last_date = date.fromisoformat(last_workout_date)
        days_since = (date.today() - last_date).days
    
    # Generate reminder message
    reminder = None
    
    if is_workout_day and (days_since is None or days_since >= 1):
        # Today is a typical workout day
        day_name = DAY_NAMES[today]
        reminder = f"Today is your {day_name} workout day! Get ready! 💪"
    
    return {
        "reminder": reminder,
        "is_workout_day": is_workout_day,
        "days_since_last": days_since,
        "common_days": [DAY_NAMES[d[0]] for d in common_days[:3]],
        "total_workouts": total,
        "last_workout_date": last_workout_date
    }


# ── Daily Workout Reminders ───────────────────────────────────────────────────

# Store reminder tasks
_daily_reminder_tasks = {}

class DailyReminderRequest(BaseModel):
    user_id: int
    time_of_day: str  # "morning" or "evening"

async def send_workout_reminder(user_id: int, time_of_day: str):
    """Send workout reminder to user"""
    try:
        # Get user's smart reminder
        reminder_data = get_smart_reminder(user_id)
        
        if reminder_data.get("reminder") is None:
            return  # No reminder needed
        
        # Different messages for morning/evening
        if time_of_day == "morning":
            message = reminder_data["reminder"]
        else:  # evening
            message = "Don't forget your workout today! Let's go! 🔥"
        
        await bot.send_message(chat_id=user_id, text=message)
        print(f"Sent {time_of_day} workout reminder to {user_id}")
        
    except Exception as e:
        print(f"Failed to send workout reminder to {user_id}: {e}")

class ReminderRequest(BaseModel):
    time_of_day: str

class InactivityRequest(BaseModel):
    pass

class AICoachRequest(BaseModel):
    weeks: int = 4

@app.post("/api/ai-coach/muscle-balance")
async def get_muscle_balance(request: AICoachRequest):
    """Get muscle group balance analysis"""
    import database as db_ops
    
    # For demo, use user_id=1 (should be passed from client in real implementation)
    user_id = 1
    muscle_progress = db_ops.get_muscle_group_progress(user_id, request.weeks)
    
    if not muscle_progress:
        return {"status": "no_data", "message": "Not enough workout data for analysis"}
    
    # Analyze balance and generate recommendations
    progress_rates = {}
    for grp, data in muscle_progress.items():
        if data["progress_percent"] > 10:
            progress_rates[grp] = "fast"
        elif data["progress_percent"] > 5:
            progress_rates[grp] = "moderate"
        else:
            progress_rates[grp] = "slow"
    
    # Find fastest and slowest groups
    if progress_rates:
        fastest = max(progress_rates, key=lambda k: muscle_progress[k]["progress_percent"])
        slowest = min(progress_rates, key=lambda k: muscle_progress[k]["progress_percent"])
        
        # Generate recommendation
        if muscle_progress[fastest]["progress_percent"] > muscle_progress[slowest]["progress_percent"] * 1.5:
            recommendation = f"Your {fastest} progress is {muscle_progress[fastest]['progress_percent']:.1f}% vs {slowest} at {muscle_progress[slowest]['progress_percent']:.1f}% - focus more on {slowest}"
        else:
            recommendation = "Good balance across muscle groups - keep up the consistent work!"
    else:
        recommendation = "Keep training to see muscle group analysis"
    
    return {
        "status": "success",
        "muscle_groups": muscle_progress,
        "progress_rates": progress_rates,
        "recommendation": recommendation
    }

@app.post("/api/ai-coach/plateau-detection")
async def get_plateau_detection(request: AICoachRequest):
    """Detect training plateaus"""
    import database as db_ops
    
    # For demo, use user_id=1 (should be passed from client in real implementation)
    user_id = 1
    plateaus = db_ops.detect_plateaus(user_id, request.weeks)
    
    if not plateaus:
        return {
            "status": "no_plateaus",
            "message": "No plateaus detected - keep up the great work!",
            "plateaus": []
        }
    
    return {
        "status": "plateaus_found",
        "plateaus": plateaus,
        "total_plateaus": len(plateaus)
    }

@app.post("/api/inactivity-reminders")
async def send_inactivity_reminders(request: InactivityRequest):
    """Send reminders to users who haven't worked out in 3-7 days"""
    import database as db_ops
    
    # Get users with 3+ days inactivity
    inactive_users_3_days = db_ops.get_users_with_inactivity(3)
    inactive_users_7_days = db_ops.get_users_with_inactivity(7)
    
    # Create sets to avoid duplicates
    users_3_days = {user["user_id"]: user["days_since"] for user in inactive_users_3_days}
    users_7_days = {user["user_id"]: user["days_since"] for user in inactive_users_7_days}
    
    # Send reminders
    tasks = []
    
    # 3-day reminders
    for user_id, days_since in users_3_days.items():
        if user_id not in users_7_days:  # Only send 3-day message if not already 7-day
            task = asyncio.create_task(send_inactivity_message(user_id, days_since, 3))
            tasks.append(task)
    
    # 7-day reminders
    for user_id, days_since in users_7_days.items():
        task = asyncio.create_task(send_inactivity_message(user_id, days_since, 7))
        tasks.append(task)
    
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)
    
    return {
        "status": "sent", 
        "users_3_days": len(users_3_days) - len(users_7_days),
        "users_7_days": len(users_7_days)
    }

async def send_inactivity_message(user_id: int, days_since: int, threshold: int):
    """Send inactivity reminder message to user"""
    try:
        # Get user's Telegram chat ID
        import database as db_ops
        with db_ops.db() as conn:
            row = conn.execute(
                "SELECT telegram_id FROM users WHERE id = ?",
                (user_id,)
            ).fetchone()
        
        if not row or not row["telegram_id"]:
            return {"status": "no_telegram_id", "user_id": user_id}
        
        chat_id = row["telegram_id"]
        
        # Generate message based on threshold
        if threshold == 3:
            message = f"3 days without workouts - time to get back! 💪"
        else:  # threshold == 7
            message = f"A week without workouts - it's time to return! 🔥"
        
        # Send message via Telegram
        from telegram import Bot
        import os
        
        bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        if not bot_token:
            return {"status": "no_bot_token", "user_id": user_id}
        
        bot = Bot(token=bot_token)
        await bot.send_message(chat_id=chat_id, text=message)
        
        return {"status": "sent", "user_id": user_id, "days_since": days_since}
        
    except Exception as e:
        return {"status": "error", "user_id": user_id, "error": str(e)}

@app.post("/api/send-daily-reminders")
async def send_daily_reminders(request: ReminderRequest):
    """Send workout reminders to all users with workout patterns"""
    time_of_day = request.time_of_day
    # Get all users who have worked out in the last 30 days
    thirty_days_ago = (date.today() - timedelta(days=30)).isoformat()
    
    import database as db_ops
    with db_ops.db() as conn:
        users = conn.execute(
            """
            SELECT DISTINCT user_id FROM workouts 
            WHERE date >= ? AND type IN ('DAY_A', 'DAY_B', 'DAY_C')
            """,
            (thirty_days_ago,)
        ).fetchall()
    
    # Send reminders to all users
    tasks = []
    for user_row in users:
        user_id = user_row["user_id"]
        task = asyncio.create_task(send_workout_reminder(user_id, time_of_day))
        tasks.append(task)
    
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)
    
    return {"status": "sent", "users_count": len(users)}


# ── Supplements API ────────────────────────────────────────────────────────

@app.get("/api/supplements")
async def get_supplements(user_id: int):
    supplements = database.get_supplements(user_id)
    return {
        "items": [
            {
                "id": s["id"],
                "name": s["name"],
                "dosage": s["dosage"],
                "intake_time": s["intake_time"],
                "duration_days": s["duration_days"],
                "is_preset": bool(s["is_preset"]),
                "category": s["category"],
                "is_active": bool(s["is_active"]),
                "created_at": s["created_at"],
            }
            for s in supplements
        ]
    }


@app.get("/api/supplements/active")
async def get_active_supplements(user_id: int):
    import logging, traceback
    try:
        active = database.get_active_supplements(user_id)
        return {"names": [s["name"] for s in active]}
    except Exception as e:
        logging.error("get_active_supplements error: %s\n%s", e, traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/supplements")
async def create_supplement(user_id: int, data: dict):
    try:
        supplement_id = database.create_supplement(
            user_id=user_id,
            name=data["name"],
            dosage=data["dosage"],
            intake_time=data["intake_time"],
            duration_days=data.get("duration_days"),
            is_preset=data.get("is_preset", False),
            category=data.get("category", "custom"),
        )
        return {"id": supplement_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.put("/api/supplements/{supplement_id}")
async def update_supplement(supplement_id: int, data: dict):
    try:
        database.update_supplement(supplement_id, **data)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/api/supplements/{supplement_id}")
async def delete_supplement(supplement_id: int):
    try:
        database.delete_supplement(supplement_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/supplements/preset")
async def get_preset_supplements():
    return {
        "items": database.get_preset_supplements()
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
