# README: Деплой АБ Афиша Бухгалтера

## Закреплённый production frontend

Перед любым frontend-деплоем прочитать `PRODUCTION_RELEASE.md` и `infra/deploy/production-frontend.env`.

Единственная утверждённая версия:

- commit: `3e308c5355ad5ebd09c4fd634ba7df965a7bf6ca`;
- image: `ab-afisha/frontend:frontend-release-3e308c5`;
- server root: `/srv/ab-afisha`;
- compose: `/srv/ab-afisha/docker-compose.production.v2.yml`;
- deploy: `/srv/ab-afisha/infra/scripts/deploy-pinned-frontend.sh`;
- cleanup old frontend releases: `/srv/ab-afisha/infra/scripts/cleanup-old-frontend-releases.sh`.

Для frontend запрещено использовать `latest`, произвольный `origin/main`, старый `frontend-release-*`, rollback-образ или старый deploy-скрипт. Команды ниже, использующие общий `APP_VERSION` или `docker-compose.prod.yml`, являются историческими для общей инфраструктуры и не определяют текущий production frontend.

Production: `ab-event.pro` | Staging: `test.ab-event.pro`  
VPS: Timeweb Cloud, IP `77.232.136.248`, host `kvnvm-277`

---

## Локальный запуск (разработка)

```bash
# 1. Установить pnpm >= 9
npm install -g pnpm@9.15.0

# 2. Клонировать и настроить окружение
git clone https://github.com/bazhenovnv/ab-partner-calendar-v2
cd ab-partner-calendar-v2
cp .env.example .env

# 3. Установить зависимости
pnpm install

# 4. Запустить через Docker Compose
docker compose up -d

# 5. Применить миграции и seed
docker compose exec backend sh -c "cd /app/apps/backend && npx prisma migrate dev && npx prisma db seed"

# 6. Открыть
# Frontend:  http://localhost:3000
# Backend API: http://localhost:3001/api
# Swagger:   http://localhost:3001/api/docs
# Healthcheck: http://localhost:3001/api/health
```

---

## Первый деплой на Timeweb Cloud VPS

### 1. Подготовка сервера

```bash
ssh root@77.232.136.248
adduser deploy
usermod -aG sudo,docker deploy
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
```

### 2. SSL (Let's Encrypt)

```bash
apt install -y certbot
certbot certonly --standalone -d ab-event.pro -d www.ab-event.pro
certbot certonly --standalone -d test.ab-event.pro
echo "0 3 * * * certbot renew --quiet --post-hook 'docker compose -f /home/deploy/ab-partner-calendar-v2/docker-compose.prod.yml exec nginx nginx -s reload'" | crontab -
```

### 3. Деплой приложения

```bash
su - deploy
git clone https://github.com/bazhenovnv/ab-partner-calendar-v2
cd ab-partner-calendar-v2
cp .env.example .env
# Заполнить .env: POSTGRES_PASSWORD, REDIS_PASSWORD, JWT_SECRET, TELEGRAM_BOT_TOKEN, MAX_BOT_TOKEN, ADMIN_TELEGRAM_CHAT_ID
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml run --rm backend sh -c \
  "cd /app/apps/backend && npx prisma migrate deploy && npx prisma db seed"
```

### 4. Бэкапы

```bash
echo "0 3 * * * /home/deploy/ab-partner-calendar-v2/infra/scripts/backup.sh >> /var/log/ab-afisha-backup.log 2>&1" | crontab -
```

---

## Обновление общего приложения (не frontend production lock)

```bash
cd /home/deploy/ab-partner-calendar-v2
git pull origin main
docker compose -f docker-compose.prod.yml build
./infra/scripts/deploy.sh
```

Для production frontend эта команда не применяется. Использовать только `infra/scripts/deploy-pinned-frontend.sh`.

---

## Структура проекта

```
apps/
  frontend/   — Next.js 14 (порт 3000)
  backend/    — NestJS (порт 3001)
  bots/       — Telegram + MAX боты (отдельный процесс)
packages/
  shared/     — Общие типы, константы
  config/     — ESLint, Prettier конфиги
infra/
  nginx/      — Nginx конфиги (dev + prod)
  scripts/    — deploy.sh, backup.sh
```

---

## Переменные окружения (обязательные для production)

| Переменная | Описание |
|---|---|
| `POSTGRES_PASSWORD` | Пароль PostgreSQL |
| `REDIS_PASSWORD` | Пароль Redis |
| `JWT_SECRET` | Секрет JWT (мин. 32 символа) |
| `TELEGRAM_BOT_TOKEN` | Токен Telegram-бота |
| `MAX_BOT_TOKEN` | Токен MAX-бота |
| `ADMIN_TELEGRAM_CHAT_ID` | Chat ID для уведомлений |

> Никогда не коммитить `.env` в GitHub!

---

## Порты (production)

- `80` → Nginx (redirect → 443)
- `443` → Nginx → frontend:3000 / backend:3001
- Все остальные порты закрыты firewall-ом
