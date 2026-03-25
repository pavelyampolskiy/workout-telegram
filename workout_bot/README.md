# Дневник тренировок — Telegram Bot

Telegram-бот для ведения дневника тренировок по шаблону Day A/B/C + кардио.

## Быстрый старт

1. Создайте бота через [@BotFather](https://t.me/BotFather), получите токен.
2. Установите зависимости:
   ```bash
   pip install -r requirements.txt
   ```
3. Запустите бота:
   ```bash
   BOT_TOKEN=your_token_here python bot.py
   ```

## Структура проекта

| Файл | Назначение |
|------|------------|
| `bot.py` | Точка входа, запуск polling |
| `handlers.py` | Все хэндлеры (FSM-логика) |
| `keyboards.py` | Фабрики InlineKeyboard |
| `states.py` | FSM-состояния (Flow) |
| `program.py` | Шаблоны тренировок Day A/B/C |
| `parser.py` | Парсер ввода сетов (140x12) |
| `database.py` | SQLite CRUD (workouts, sets, cardio, stats) |

## База данных

SQLite (`workouts.db`). Путь можно переопределить через переменную `DB_PATH`.

Схема:
- `workouts` — запись тренировки (id, user_id, date, type)
- `workout_exercises` — упражнения в тренировке
- `workout_sets` — подходы (вес, повторы)
- `cardio_entries` — кардио (текст)

## Формат ввода подходов

Принимаются: `140x12`, `140 x 12`, `140х12` (рус. х), `140*12`

## Переменные окружения

| Переменная | Описание |
|-----------|---------|
| `BOT_TOKEN` | Токен Telegram-бота (обязательно) |
| `DB_PATH` | Путь к файлу SQLite (по умолчанию `workouts.db`) |
