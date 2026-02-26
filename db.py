import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

def _db_url() -> str:
    url = os.environ["DATABASE_URL"]
    # Railway часто даёт postgres://, SQLAlchemy ждёт postgresql+asyncpg://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url

engine = create_async_engine(_db_url(), future=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)
