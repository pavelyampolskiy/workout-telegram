# Настройки Railway для Workout Telegram

Проверьте все пункты в дашборде Railway (Variables, Volumes, Deploy).

---

## 1. Переменные окружения (Variables)

| Переменная | Обязательно | Значение | Зачем |
|------------|-------------|----------|--------|
| `BOT_TOKEN` или `TELEGRAM_BOT_TOKEN` | ✅ Да | Токен бота от @BotFather | Запуск бота |
| `WEBAPP_URL` | ✅ Да | **Полный URL вашего сервиса**, например `https://workout-telegram-production-xxxx.up.railway.app` (без слэша в конце) | Бот открывает Mini App по этой ссылке. Должен совпадать с URL сервиса в Railway. |
| `PORT` | Нет | Railway подставляет сам (обычно `8000` или другой) | Сервер слушает этот порт. |
| `DB_PATH` | Нет* | См. раздел «Том» ниже | Путь к файлу SQLite. По умолчанию — см. том. |

\* Если **не** используете Volume, данные при каждом редеплое будут теряться. Для сохранения данных нужен том и либо он, либо `DB_PATH`.

---

## 2. Том (Volume) — чтобы данные сохранялись

Без тома файл `workouts.db` лежит в контейнере и **удаляется при каждом деплое** — тренировки не сохраняются.

1. В Railway: ваш сервис → **Volumes** → **Add Volume**.
2. Укажите **Mount Path**, например: **`/data`** (один путь на весь проект).
3. Сохраните. Railway сам задаст переменные:
   - `RAILWAY_VOLUME_MOUNT_PATH=/data`
   - `RAILWAY_VOLUME_NAME=...`

- Если задали **`DB_PATH`** в Variables (например `/mnt/data/workout_diary.db`) — используется он. **Mount Path тома должен совпадать с путём к папке в DB_PATH**: для `/mnt/data/workout_diary.db` том должен быть смонтирован в **`/mnt/data`** (в настройках Volume укажите Mount Path = `/mnt/data`).
- Если `DB_PATH` не задан, но том подключён — БД будет `<mount_path>/workouts.db` (например `/data/workouts.db` при Mount Path `/data`).

Если том не используете, данные при редеплое теряются.

---

## 3. Пути и команды (Build & Deploy)

- **Root Directory**: не менять (корень репозитория).
- **Build Command**: по умолчанию Nixpacks использует `nixpacks.toml`:
  - `pip install -r requirements.txt`
  - `cd webapp && npm ci && npm run build`
- **Start Command** (или из Procfile): **`python workout_bot/bot.py`**  
  Рабочая директория при старте — корень репозитория (`/app` в контейнере). Пути ниже считаются от неё.

Проверка путей в коде:

- **API и статика**: статика webapp раздаётся из `webapp/dist` (путь в коде: `.../webapp/dist`). Сборка создаёт именно `webapp/dist`, всё совпадает.
- **БД**: при наличии тома с Mount Path `/data` файл БД — `/data/workouts.db`.

---

## 4. Если сервис падает (Crashed)

1. **Deployments** → последний деплой → **View Logs** — в логах будет текст ошибки (например `Permission denied`, `No such file or directory`).
2. **Путь к БД и том**: каталог в `DB_PATH` должен совпадать с **Mount Path** тома. У вас `DB_PATH=/mnt/data/workout_diary.db` → в настройках Volume должен быть **Mount Path = `/mnt/data`**. Если том смонтирован в `/data`, то либо смените Mount Path на `/mnt/data`, либо задайте `DB_PATH=/data/workout_diary.db`.

## 5. Что проверить, если «не сохраняется»

1. **Добавлен ли Volume** и указан ли Mount Path (например `/data`)?
2. **Есть ли в Variables** `RAILWAY_VOLUME_MOUNT_PATH` после добавления тома (или вручную задан `DB_PATH` в директорию тома)?
3. **`WEBAPP_URL`** — точно тот же URL, что открывается в браузере для вашего сервиса (тот же домен, что у API), без лишнего слэша в конце?
4. После изменений переменных или тома — **сделать Redeploy** сервиса.

---

## 6. Краткий чеклист

- [ ] `BOT_TOKEN` или `TELEGRAM_BOT_TOKEN` задан
- [ ] `WEBAPP_URL` = полный URL сервиса (как в Railway), без `/` в конце
- [ ] Создан Volume с Mount Path (например `/data`)
- [ ] После добавления тома выполнен Redeploy

После этого путь к БД корректен и данные должны сохраняться между деплоями.
