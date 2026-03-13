# Workout Telegram — единый проект

Единственный репозиторий приложения «Workout» в Telegram: бот + бэкенд + Mini App (webapp).

- **workout_bot/** — Python-бот (aiogram), API, БД. Кнопка в чате открывает webapp.
- **webapp/** — React-приложение (Vite): главный экран, тренировки, подходы, таймер отдыха, кардио, история, статистика, достижения.

Деплой: один сервис (например, Railway).

- **Переменные**: `BOT_TOKEN` (или `TELEGRAM_BOT_TOKEN`), `WEBAPP_URL` — полный URL сервиса (например `https://xxx.up.railway.app`, без слэша в конце).
- **Сохранение данных**: нужен Volume с Mount Path (например `/data`). Код сам кладёт БД в `<mount_path>/workouts.db`. Подробно: **[RAILWAY.md](RAILWAY.md)**.

Сборка: `cd webapp && npm ci && npm run build`. Статика отдаётся из `webapp/dist`.
