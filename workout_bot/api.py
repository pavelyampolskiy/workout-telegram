# api.py
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from datetime import date, timedelta

import os

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

import database as db_ops
from auth import get_current_user
from program import PROGRAM

_VALID_TYPES = set(PROGRAM.keys())

app = FastAPI(title="Workout API")

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

_webapp_url = os.getenv("WEBAPP_URL", "")
_origins = [_webapp_url] if _webapp_url else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Ownership helpers ─────────────────────────────────────────────────────────

def _check_workout(workout_id: int, user_id: int):
    owner = db_ops.get_workout_owner(workout_id)
    if owner is None:
        raise HTTPException(status_code=404, detail="Not found")
    if owner != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")


def _check_exercise(ex_id: int, user_id: int):
    owner = db_ops.get_exercise_owner(ex_id)
    if owner is None:
        raise HTTPException(status_code=404, detail="Not found")
    if owner != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")


def _check_set(set_id: int, user_id: int):
    owner = db_ops.get_set_owner(set_id)
    if owner is None:
        raise HTTPException(status_code=404, detail="Not found")
    if owner != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")


# ── Program ───────────────────────────────────────────────────────────────────

@app.get("/api/program")
def get_program():
    return PROGRAM


# ── Workouts ──────────────────────────────────────────────────────────────────

class WorkoutBody(BaseModel):
    type: str

    @field_validator("type")
    @classmethod
    def type_valid(cls, v: str) -> str:
        if v not in _VALID_TYPES:
            raise ValueError(f"type must be one of {sorted(_VALID_TYPES)}")
        return v


@app.post("/api/workouts")
def create_workout(body: WorkoutBody, user_id: int = Depends(get_current_user)):
    wid = db_ops.create_workout(user_id, body.type)
    return {"id": wid}


@app.patch("/api/workouts/{workout_id}/finish")
def finish_workout(workout_id: int, user_id: int = Depends(get_current_user)):
    _check_workout(workout_id, user_id)
    db_ops.finish_workout(workout_id)
    return {"ok": True}


class RatingBody(BaseModel):
    rating: int


@app.patch("/api/workouts/{workout_id}/rating")
def save_rating(workout_id: int, body: RatingBody, user_id: int = Depends(get_current_user)):
    if not (1 <= body.rating <= 5):
        raise HTTPException(status_code=422, detail="rating must be 1–5")
    _check_workout(workout_id, user_id)
    db_ops.save_rating(workout_id, body.rating)
    return {"ok": True}


@app.delete("/api/workouts/{workout_id}")
def delete_workout(workout_id: int, user_id: int = Depends(get_current_user)):
    _check_workout(workout_id, user_id)
    db_ops.delete_workout(workout_id)
    return {"ok": True}


@app.get("/api/workouts/{workout_id}")
def get_workout(workout_id: int, user_id: int = Depends(get_current_user)):
    _check_workout(workout_id, user_id)
    w = db_ops.get_workout(workout_id)
    exercises = db_ops.get_exercises_with_sets(workout_id)
    cardio = db_ops.get_cardio(workout_id)
    note = db_ops.get_workout_note(workout_id)
    return {
        "id": w["id"],
        "user_id": w["user_id"],
        "date": w["date"],
        "type": w["type"],
        "exercises": exercises,
        "cardio": cardio["text"] if cardio else None,
        "note": note["text"] if note else None,
    }


@app.get("/api/history")
def get_history(offset: int = Query(0, ge=0), limit: int = Query(10, ge=1, le=100),
                type: str = None, user_id: int = Depends(get_current_user)):
    rows, has_more = db_ops.get_history(user_id, offset, limit, workout_type=type)
    return {
        "items": [{"id": r["id"], "date": r["date"], "type": r["type"], "started_at": r["started_at"], "total_sets": r["total_sets"], "total_volume": r["total_volume"], "duration_min": r["duration_min"]} for r in rows],
        "has_more": has_more,
    }


@app.delete("/api/history")
def delete_all_history(user_id: int = Depends(get_current_user)):
    db_ops.delete_all_workouts(user_id)
    return {"ok": True}


# ── Exercises ─────────────────────────────────────────────────────────────────

class ExerciseBody(BaseModel):
    grp: str
    name: str
    target_sets: int

    @field_validator("target_sets")
    @classmethod
    def target_sets_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("target_sets must be >= 1")
        return v


@app.post("/api/workouts/{workout_id}/exercises")
def create_exercise(workout_id: int, body: ExerciseBody, user_id: int = Depends(get_current_user)):
    _check_workout(workout_id, user_id)
    eid = db_ops.create_exercise(workout_id, body.grp, body.name, body.target_sets)
    return {"id": eid}


@app.get("/api/exercises/{ex_id}/last")
def get_last_exercise(ex_id: int, exclude_wid: int,
                      user_id: int = Depends(get_current_user)):
    _check_exercise(ex_id, user_id)
    ex = db_ops.get_exercise(ex_id)
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

    @field_validator("weight")
    @classmethod
    def weight_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("weight must be > 0")
        return v

    @field_validator("reps")
    @classmethod
    def reps_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("reps must be >= 1")
        return v


@app.get("/api/exercises/{ex_id}/sets")
def get_sets(ex_id: int, user_id: int = Depends(get_current_user)):
    _check_exercise(ex_id, user_id)
    sets = db_ops.get_sets_for_exercise(ex_id)
    return [
        {"id": s["id"], "set_number": s["set_number"], "weight": s["weight"], "reps": s["reps"]}
        for s in sets
    ]


@app.post("/api/exercises/{ex_id}/sets")
def add_set(ex_id: int, body: SetBody, user_id: int = Depends(get_current_user)):
    _check_exercise(ex_id, user_id)
    next_num = db_ops.count_sets_for_exercise(ex_id) + 1
    sid = db_ops.add_set(ex_id, next_num, body.weight, body.reps)
    return {"id": sid}


@app.put("/api/sets/{set_id}")
def update_set(set_id: int, body: SetBody, user_id: int = Depends(get_current_user)):
    _check_set(set_id, user_id)
    db_ops.update_set(set_id, body.weight, body.reps)
    return {"ok": True}


@app.delete("/api/sets/{set_id}")
def delete_set(set_id: int, user_id: int = Depends(get_current_user)):
    _check_set(set_id, user_id)
    db_ops.delete_set(set_id)
    return {"ok": True}


# ── Cardio ────────────────────────────────────────────────────────────────────

class TextBody(BaseModel):
    text: str

    @field_validator("text")
    @classmethod
    def text_not_empty(cls, v: str) -> str:
        if not v or len(v) > 2000:
            raise ValueError("text must be 1–2000 characters")
        return v


@app.post("/api/workouts/{workout_id}/cardio")
def add_cardio(workout_id: int, body: TextBody, user_id: int = Depends(get_current_user)):
    _check_workout(workout_id, user_id)
    cid = db_ops.add_cardio(workout_id, body.text)
    return {"id": cid}


@app.put("/api/workouts/{workout_id}/cardio")
def update_cardio(workout_id: int, body: TextBody, user_id: int = Depends(get_current_user)):
    _check_workout(workout_id, user_id)
    db_ops.update_cardio(workout_id, body.text)
    return {"ok": True}


# ── Notes ─────────────────────────────────────────────────────────────────────

@app.post("/api/workouts/{workout_id}/note")
def add_note(workout_id: int, body: TextBody, user_id: int = Depends(get_current_user)):
    _check_workout(workout_id, user_id)
    nid = db_ops.add_workout_note(workout_id, body.text)
    return {"id": nid}


# ── Stats ─────────────────────────────────────────────────────────────────────

@app.get("/api/stats")
def get_stats(days: int = Query(7, ge=1, le=365), user_id: int = Depends(get_current_user)):
    since = date.today() - timedelta(days=days)
    total, by_type = db_ops.stats_period(user_id, since)
    return {"total": total, "by_type": by_type}


@app.get("/api/stats/frequency")
def get_frequency(weeks: int = Query(4, ge=1, le=52), user_id: int = Depends(get_current_user)):
    total, avg = db_ops.stats_frequency(user_id, weeks)
    return {"total": total, "avg": avg, "weeks": weeks}


# ── Progress ──────────────────────────────────────────────────────────────────

@app.get("/api/progress")
def get_progress(exercise_name: str, limit: int = Query(8, ge=1, le=50),
                 user_id: int = Depends(get_current_user)):
    rows = db_ops.get_exercise_progress(user_id, exercise_name, limit)
    return [{"date": r["date"], "max_weight": r["max_weight"]} for r in rows]


# ── Serve React frontend (must be last) ───────────────────────────────────────

import os
from fastapi.staticfiles import StaticFiles

_dist = os.path.join(os.path.dirname(__file__), '..', 'webapp', 'dist')
if os.path.exists(_dist):
    app.mount('/', StaticFiles(directory=_dist, html=True), name='spa')
