# api.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import date, timedelta

import database as db_ops
from program import PROGRAM

app = FastAPI(title="Workout API")

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
    return {
        "workout": {
            "id": w["id"],
            "type": w["type"],
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
    {"id": "first_workout", "name": "First Step", "desc": "Complete your first workout", "icon": "🏋️", "threshold": 1},
    {"id": "workouts_5", "name": "Getting Started", "desc": "Complete 5 workouts", "icon": "💪", "threshold": 5},
    {"id": "workouts_10", "name": "Dedicated", "desc": "Complete 10 workouts", "icon": "🔥", "threshold": 10},
    {"id": "workouts_25", "name": "Committed", "desc": "Complete 25 workouts", "icon": "⭐", "threshold": 25},
    {"id": "workouts_50", "name": "Warrior", "desc": "Complete 50 workouts", "icon": "🏆", "threshold": 50},
    {"id": "workouts_100", "name": "Legend", "desc": "Complete 100 workouts", "icon": "👑", "threshold": 100},
    {"id": "volume_10k", "name": "10K Club", "desc": "Lift 10,000 kg total", "icon": "🎯", "threshold": 10000, "type": "volume"},
    {"id": "volume_50k", "name": "50K Club", "desc": "Lift 50,000 kg total", "icon": "💎", "threshold": 50000, "type": "volume"},
    {"id": "volume_100k", "name": "100K Club", "desc": "Lift 100,000 kg total", "icon": "🚀", "threshold": 100000, "type": "volume"},
    {"id": "streak_3", "name": "On Fire", "desc": "3 workouts this week", "icon": "🔥", "threshold": 3, "type": "weekly"},
    {"id": "streak_5", "name": "Beast Mode", "desc": "5 workouts this week", "icon": "🦁", "threshold": 5, "type": "weekly"},
]

@app.get("/api/achievements")
def get_achievements(user_id: int):
    total, _ = db_ops.stats_frequency(user_id, 52)
    total_volume = db_ops.get_total_volume(user_id)
    week_stats = db_ops.stats_period(user_id, date.today() - timedelta(days=7))
    week_count = week_stats[0] if week_stats else 0
    
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
        else:
            earned = total >= threshold
            progress = min(total / threshold, 1.0)
        
        item = {**ach, "earned": earned, "progress": round(progress, 2)}
        if earned:
            unlocked.append(item)
        else:
            locked.append(item)
    
    return {"unlocked": unlocked, "locked": locked, "total_workouts": total, "total_volume": total_volume}
