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

## Автоматический деплой

При каждом пуше в ветку `main` бот автоматически деплоится на сервер через GitHub Actions.

### Настройка (один раз)

1. **Сервер.** Установите Docker и Docker Compose. Клонируйте репозиторий в `~/workout_bot`, создайте там `.env` с `BOT_TOKEN` и при необходимости `DB_PATH`.
2. **Первый запуск на сервере:**
   ```bash
   cd ~/workout_bot && docker compose up -d --build
   ```
3. **Секреты в GitHub:** репозиторий → Settings → Secrets and variables → Actions → New repository secret:
   - `SSH_HOST` — IP или хост сервера
   - `SSH_USER` — пользователь для SSH (например `root` или `deploy`)
   - `SSH_PRIVATE_KEY` — приватный SSH-ключ (содержимое `id_rsa` или аналог), без пароля

Если репозиторий на сервере лежит не в `~/workout_bot`, отредактируйте в `.github/workflows/deploy.yml` путь в блоке `script:` (строка `cd ~/workout_bot`).

После этого каждый `git push origin main` будет поднимать последнюю версию на сервере и перезапускать контейнер.
