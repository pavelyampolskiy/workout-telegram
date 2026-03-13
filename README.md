# Workout Telegram — единый проект

Единственный репозиторий приложения «Workout» в Telegram: бот + бэкенд + Mini App (webapp).

- **workout_bot/** — Python-бот (aiogram), API, БД. Кнопка в чате открывает webapp.
- **webapp/** — React-приложение (Vite): главный экран, тренировки, подходы, таймер отдыха, кардио, история, статистика, достижения.

Деплой: один сервис (например, Railway). Переменная `WEBAPP_URL` — URL, по которому раздаётся собранный webapp (обычно тот же хост, что и бот).

Сборка webapp при деплое: `cd webapp && npm ci && npm run build`. Статика отдаётся из `webapp/dist`.
