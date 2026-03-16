# Workout Telegram — единый проект

Единственный репозиторий приложения «Workout» в Telegram: бот + бэкенд + Mini App (webapp).

- **workout_bot/** — Python-бот (aiogram), API, БД. Кнопка в чате открывает webapp.
- **webapp/** — React-приложение (Vite): главный экран, тренировки, подходы, таймер отдыха, кардио, история, статистика, достижения.

Деплой: один сервис (например, Railway).

- **Переменные**: `BOT_TOKEN` (или `TELEGRAM_BOT_TOKEN`), `WEBAPP_URL` — полный URL сервиса (например `https://xxx.up.railway.app`, без слэша в конце).
- **Сохранение данных**: нужен Volume с Mount Path (например `/data`). Код сам кладёт БД в `<mount_path>/workouts.db`. Подробно: **[RAILWAY.md](RAILWAY.md)**.

Сборка: `cd webapp && npm ci && npm run build`. Статика отдаётся из `webapp/dist`.

**Автодеплой:** после каждого коммита деплой запускается сам (post-commit хук). Один раз установите хук: `./scripts/install-deploy-hook.sh`. Дальше при каждом `git commit` скрипт соберёт webapp, при необходимости закоммитит dist и отправит в `main`; Railway задеплоит по пушу. Ручной запуск по желанию: `./deploy.sh` или `./deploy.sh "Сообщение коммита"`.

### Дизайн-система (webapp)

Токены и стили собраны в одном месте: **`webapp/src/design-tokens.js`**.

- **Палитра**: `TEXT_PRIMARY` … `TEXT_FADED` (Tailwind-классы), `ACCENT_COLOR` (hex).
- **Карточки**: `CARD_BTN_STYLE`, `PRIMARY_CARD_STYLE`, `DARK_CARD_STYLE`, `SECONDARY_CARD_STYLE`.
- **Типографика**: `PAGE_HEADING_STYLE`. Шрифты: Bebas Neue (заголовки), Georgia (текст) — в `tailwind.config.js` и `index.css`.

Импорт через `shared.js`: `import { CARD_BTN_STYLE, TEXT_PRIMARY } from '../shared'`. Новые экраны и компоненты лучше брать стили из токенов, чтобы сохранять консистентность.
