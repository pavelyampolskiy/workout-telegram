# workout_bot — сборка для Railway
FROM python:3.11-slim

WORKDIR /app

# Сначала только зависимости (лучше кэш слоёв)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Код приложения
COPY bot.py database.py handlers.py keyboards.py parser.py program.py states.py webapp_validate.py ./
COPY webapp/index.html ./webapp/index.html

ENV PYTHONUNBUFFERED=1
ENV DB_PATH=/data/workouts.db

EXPOSE 8080
CMD ["python", "-u", "bot.py"]
