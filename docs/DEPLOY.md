# Руководство по первому развёртыванию (Deploy Guide)

Документ описывает полный процесс первого развёртывания проекта АБ Афиша на VPS Timeweb Cloud.

---

## 1. Требования к серверу

| Параметр | Минимум | Рекомендуется |
|----------|---------|---------------|
| ОС | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| CPU | 2 vCPU | 4 vCPU |
| RAM | 2 GB | 4 GB |
| Disk | 20 GB SSD | 40 GB SSD |
| Открытые порты | 22, 80, 443 | 22, 80, 443 |

---

## 2. Подготовка сервера Timeweb Cloud

### 2.1 Подключение

```bash
ssh root@<IP-адрес-сервера>
```

### 2.2 Обновление системы

```bash
apt update && apt upgrade -y
```

### 2.3 Установка Docker и Docker Compose plugin

```bash
# Удалить старые версии (если есть)
apt remove -y docker docker.io docker-engine containerd runc 2>/dev/null || true

# Добавить официальный репозиторий Docker
apt install -y ca-certificates curl gnupg lsb-release
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Проверить установку
docker --version
docker compose version
```

### 2.4 Установка certbot

```bash
apt install -y certbot
```

---

## 3. Настройка DNS

В панели управления DNS-провайдером создать A-записи:

| Имя | Тип | Значение | TTL |
|-----|-----|----------|-----|
| `@` (корень) | A | `<IP-адрес-сервера>` | 3600 |
| `www` | A | `<IP-адрес-сервера>` | 3600 |
| `test` | A | `<IP-адрес-сервера>` | 3600 |

> После изменения DNS подождать до 24 часов для полного распространения.
> Проверить: `dig ab-event.pro +short` — должен вернуть IP сервера.

---

## 4. Выпуск SSL-сертификата

Сертификат необходим для `ab-event.pro` и `www.ab-event.pro`.
`test.ab-event.pro` работает по **HTTP** — сертификат для него не требуется на текущем этапе (см. раздел "Примечание по test.ab-event.pro").

```bash
# Убедиться, что порт 80 свободен (nginx/apache не запущен)
ss -tlnp | grep :80

# Выпустить сертификат
certbot certonly --standalone \
  -d ab-event.pro \
  -d www.ab-event.pro \
  --agree-tos \
  --email <email-администратора>

# Проверить наличие файлов сертификата
ls /etc/letsencrypt/live/ab-event.pro/
# Должны быть: fullchain.pem, privkey.pem
```

### Примечание по test.ab-event.pro

`test.ab-event.pro` намеренно обслуживается только по HTTP до получения отдельного сертификата.
Для перехода на HTTPS:

```bash
certbot certonly --standalone -d test.ab-event.pro
# После получения — раскомментировать 443-блок в infra/nginx/conf.d/prod.conf
```

---

## 5. Клонирование репозитория

```bash
mkdir -p /srv/ab-afisha && cd /srv/ab-afisha
git clone https://github.com/bazhenovnv/ab-partner-calendar-v2.git .
```

---

## 6. Создание .env

```bash
cp .env.example .env
nano .env
```

### Генерация секретов

```bash
# Для POSTGRES_PASSWORD, REDIS_PASSWORD
openssl rand -hex 24

# Для JWT_SECRET, BOT_INTERNAL_TOKEN
openssl rand -hex 32
```

### Обязательные переменные

```dotenv
# ── База данных ────────────────────────────────────────────────────────────────
POSTGRES_PASSWORD=<сгенерировать: openssl rand -hex 24>

# ── Redis ─────────────────────────────────────────────────────────────────────
REDIS_PASSWORD=<сгенерировать: openssl rand -hex 24>

# ── Auth ──────────────────────────────────────────────────────────────────────
JWT_SECRET=<сгенерировать: openssl rand -hex 32>

# ── Боты ──────────────────────────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN=<токен из @BotFather>
MAX_BOT_TOKEN=<токен MAX-бота>
ADMIN_TELEGRAM_CHAT_ID=<chat_id для уведомлений администратора>
BOT_INTERNAL_TOKEN=<сгенерировать: openssl rand -hex 32>

# ── Аналитика ─────────────────────────────────────────────────────────────────
YANDEX_METRIKA_ID=110270689

# ── Приложение ────────────────────────────────────────────────────────────────
APP_VERSION=latest
NEXT_PUBLIC_CONTACT_EMAIL=info-event@a-b.ru

# ── Seed (первый запуск — сменить пароль сразу после входа) ──────────────────
SEED_ADMIN_EMAIL=admin@ab-event.pro
SEED_ADMIN_PASSWORD=<временный пароль — сменить сразу после первого входа>
```

> **Запрещено**: использовать значения по умолчанию из `.env.example` в production.
> `SESSION_SECRET` в `.env` не добавлять — переменная в коде не используется.

---

## 7. Сборка Docker-образов

Выполнять из корня `/srv/ab-afisha/` (build context — весь репозиторий):

```bash
docker build -f apps/backend/Dockerfile  -t ab-afisha/backend:latest  .
docker build -f apps/frontend/Dockerfile -t ab-afisha/frontend:latest .
docker build -f apps/bots/Dockerfile     -t ab-afisha/bots:latest     .
```

> `docker-compose.prod.yml` ссылается на готовые образы через `image:` — секций `build:` в нём нет.
> Команда `docker compose build` для этого стека **не применима**.

---

## 8. Запуск стека

```bash
cd /srv/ab-afisha
docker compose -f docker-compose.prod.yml up -d
```

### Ожидание healthcheck

```bash
# Подождать 30–60 секунд, затем проверить статус
docker compose -f docker-compose.prod.yml ps
```

Все сервисы должны показывать `healthy` или `running`:

```
NAME        STATUS
postgres    healthy
redis       healthy
backend     healthy
frontend    running
bots        running
nginx       running
```

### Просмотр логов backend при проблемах

```bash
docker compose -f docker-compose.prod.yml logs backend --tail=80
```

Ожидаемые строки при успешном старте:

```
[entrypoint] Running prisma migrate deploy...
[entrypoint] Starting application...
Backend running on port 3001
```

---

## 9. Инициализация БД (только при первом deploy)

### 9.1 Запуск seed

```bash
docker compose -f docker-compose.prod.yml exec backend \
  pnpm exec prisma db seed
```

Ожидаемый вывод: `Seeding database...` без ошибок.

Seed создаёт:
- admin-пользователя
- направления мероприятий
- footer-проекты
- legal-документы
- тестовые данные

### 9.2 Проверка создания admin

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U ab_afisha -d ab_afisha \
  -c 'SELECT email, role FROM "User" WHERE role = '"'"'ADMIN'"'"';'
```

Ожидаемый результат:

```
        email         |  role
----------------------+-------
 admin@ab-event.pro   | ADMIN
(1 row)
```

Если `(0 rows)` — seed не был выполнен или завершился с ошибкой. Повторить шаг 9.1.

---

## 10. Смена admin-пароля

> **Обязательно** выполнить сразу после первого входа.

1. Открыть `https://ab-event.pro/admin`
2. Войти с данными из `.env` (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`)
3. Перейти в раздел «Настройки» → «Сменить пароль»
4. Задать новый сильный пароль

---

## 11. Smoke test

Выполнить после запуска для проверки работоспособности.

### 11.1 Backend health

```bash
curl -s https://ab-event.pro/api/health
```

Ожидается:
```json
{"status":"ok","services":{"api":"ok","database":"ok"}}
```

### 11.2 Главная страница

```bash
curl -sI https://ab-event.pro/ | grep -E "HTTP/2|content-security-policy"
```

Ожидается: `HTTP/2 200` и `content-security-policy` в заголовках.

### 11.3 Афиша

```bash
curl -sI https://ab-event.pro/events | grep "HTTP"
```

Ожидается: `HTTP/2 200`

### 11.4 Карточка мероприятия

> Выполнять только если есть хотя бы одно опубликованное мероприятие.

```bash
# Получить id первого события
curl -s "https://ab-event.pro/api/events/public?limit=1&page=1"

# Проверить карточку (подставить реальный id)
curl -sI "https://ab-event.pro/events/<event-id>" | grep "HTTP"
```

Ожидается: `HTTP/2 200`

### 11.5 Правовые страницы

```bash
curl -sI "https://ab-event.pro/legal/privacy-policy" | grep "HTTP"
```

Ожидается: `HTTP/2 200`

### 11.6 robots.txt

```bash
curl -s https://ab-event.pro/robots.txt
```

Ожидается: строка `Disallow: /admin`

### 11.7 sitemap.xml

```bash
curl -s https://ab-event.pro/sitemap.xml | head -3
```

Ожидается: `<?xml version="1.0"...`

### 11.8 Страница техработ

```bash
curl -sI https://ab-event.pro/maintenance | grep "HTTP"
```

Ожидается: `HTTP/2 200`

### 11.9 Security headers

```bash
curl -sI https://ab-event.pro/ | grep -E "strict-transport-security|x-frame-options|x-content-type-options"
```

Ожидается: все три заголовка присутствуют.

### 11.10 Admin login API

```bash
curl -s -X POST https://ab-event.pro/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ab-event.pro","password":"<пароль>"}' \
  | grep access_token
```

Ожидается: `"access_token":"eyJ..."`

### 11.11 Staging (HTTP)

```bash
curl -sI http://test.ab-event.pro/ | grep "HTTP"
```

Ожидается: `HTTP/1.1 200`

### 11.12 Telegram-бот

Отправить `/start` в Telegram-бот. Ожидается приветственное сообщение с кнопками.

### 11.13 MAX-бот

Отправить `/start` в MAX-бот. Ожидается приветственное сообщение с кнопками.
