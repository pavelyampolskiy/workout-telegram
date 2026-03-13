#!/bin/bash
# Запустить на сервере один раз (после установки Docker и Docker Compose)
set -e
cd ~
if [ ! -d workout_bot ]; then
  git clone https://github.com/YOUR_USERNAME/workout_bot.git
  cd workout_bot
else
  cd workout_bot
  git pull origin main || true
fi
if [ ! -f .env ]; then
  echo "BOT_TOKEN=вставьте_токен_от_BotFather" > .env
  echo "Создан .env — отредактируйте: nano .env"
  exit 0
fi
docker compose up -d --build
echo "Бот запущен. Логи: docker compose logs -f"
