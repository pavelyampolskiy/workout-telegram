# Деплой — что сделать по шагам

Репозиторий и первый коммит уже готовы. Осталось связать с GitHub и настроить сервер.

## 1. Репозиторий на GitHub

1. Зайди на [github.com/new](https://github.com/new).
2. Имя репозитория: `workout_bot` (или любое). **Не** добавляй README — он уже есть.
3. Создай репозиторий.

## 2. Отправь код в GitHub

В терминале в папке проекта:

```bash
cd /Users/test/Desktop/workout_bot
git remote add origin https://github.com/ТВОЙ_ЛОГИН/workout_bot.git
git push -u origin main
```

(подставь свой логин вместо `ТВОЙ_ЛОГИН`)

## 3. Секреты для автодеплоя

В репозитории на GitHub: **Settings → Secrets and variables → Actions → New repository secret.**

Добавь три секрета:

| Имя             | Значение                                      |
|-----------------|-----------------------------------------------|
| `SSH_HOST`      | IP или домен сервера (например `123.45.67.89`) |
| `SSH_USER`      | Пользователь SSH (например `root`)             |
| `SSH_PRIVATE_KEY` | Весь текст приватного ключа (например из `~/.ssh/id_rsa`) |

Ключ должен быть без пароля (passphrase), иначе автодеплой не сможет подключиться.

## 4. Сервер (один раз)

На сервере должны быть установлены **Docker** и **Docker Compose**.

Вариант А — скрипт (подставь свой URL репозитория):

```bash
cd ~
git clone https://github.com/ТВОЙ_ЛОГИН/workout_bot.git
cd workout_bot
echo "BOT_TOKEN=токен_от_BotFather" > .env
docker compose up -d --build
```

Вариант Б — если репозиторий уже склонирован в `~/workout_bot`:

```bash
cd ~/workout_bot
nano .env   # добавь BOT_TOKEN=...
docker compose up -d --build
```

Путь на сервере должен быть именно `~/workout_bot` (или измени его в `.github/workflows/deploy.yml` в строке `cd ~/workout_bot`).

---

После этого каждый **push в main** будет автоматически обновлять и перезапускать бота на сервере.
