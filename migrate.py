import asyncio
from db import engine
from sqlalchemy import text

SQL = """
CREATE TABLE IF NOT EXISTS workouts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  workout_date DATE NOT NULL,
  duration_min INT NOT NULL,
  gym_text TEXT,
  cardio_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, workout_date DESC);
"""

async def main():
    async with engine.begin() as conn:
        await conn.execute(text(SQL))

if __name__ == "__main__":
    asyncio.run(main())
