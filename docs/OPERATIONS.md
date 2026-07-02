# Руководство по эксплуатации (Operations Guide)

Документ описывает процедуры обновления, обслуживания и восстановления проекта АБ Афиша в production.

Все команды выполняются на сервере из директории `/srv/ab-afisha/`, если не указано иное.

---

## 1. Обновление приложения

### 1.1 Сделать backup БД перед обновлением

> **Обязательно** перед каждым обновлением, меняющим схему БД.

```bash
mkdir -p /srv/backups
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U ab_afisha ab_afisha \
  > /srv/backups/pre-update-$(date +%Y%m%d-%H%M).sql
echo "Backup created: /srv/backups/pre-update-$(date +%Y%m%d-%H%M).sql"
```

### 1.2 Получить изменения из репозитория

```bash
git pull origin main
```

### 1.3 Пересобрать Docker-образы

Пересобирать только изменённые сервисы. Если неизвестно — пересобрать все:

```bash
docker build -f apps/backend/Dockerfile  -t ab-afisha/backend:latest  .
docker build -f apps/frontend/Dockerfile -t ab-afisha/frontend:latest .
docker build -f apps/bots/Dockerfile     -t ab-afisha/bots:latest     .
```

### 1.4 Перезапустить стек

```bash
docker compose -f docker-compose.prod.yml up -d
```

Docker Compose перезапустит только контейнеры, образ которых изменился.

### 1.5 Проверить состояние после обновления

```bash
docker compose -f docker-compose.prod.yml ps
curl -s https://ab-event.pro/api/health
```

---

## 2. Просмотр логов

```bash
# Логи конкретного сервиса (последние 100 строк, в реальном времени)
docker compose -f docker-compose.prod.yml logs backend  --tail=100 -f
docker compose -f docker-compose.prod.yml logs frontend --tail=100 -f
docker compose -f docker-compose.prod.yml logs bots     --tail=100 -f
docker compose -f docker-compose.prod.yml logs nginx    --tail=100 -f

# Все сервисы сразу
docker compose -f docker-compose.prod.yml logs --tail=50 -f

# Поиск ошибок в логах backend
docker compose -f docker-compose.prod.yml logs backend --tail=500 | grep -iE "ERROR|FAIL|Exception"
```

---

## 3. Перезапуск сервисов

```bash
# Перезапустить один сервис
docker compose -f docker-compose.prod.yml restart backend
docker compose -f docker-compose.prod.yml restart nginx

# Полный перезапуск стека
docker compose -f docker-compose.prod.yml restart

# Hard restart (остановка + запуск)
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

---

## 4. Backup PostgreSQL

### 4.1 Ручной backup

```bash
mkdir -p /srv/backups
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U ab_afisha ab_afisha \
  > /srv/backups/dump-$(date +%Y%m%d-%H%M).sql
```

### 4.2 Автоматический backup через cron

```bash
crontab -e
```

Добавить строку (backup каждую ночь в 03:00):

```
0 3 * * * cd /srv/ab-afisha && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U ab_afisha ab_afisha > /srv/backups/dump-$(date +\%Y\%m\%d-\%H\%M).sql
```

### 4.3 Удаление старых backup-файлов

```bash
# Удалить файлы старше 30 дней
find /srv/backups -name "dump-*.sql" -mtime +30 -delete
```

---

## 5. Restore PostgreSQL

> Выполнять только при необходимости отката данных.
> Restore перезаписывает все данные в БД.

```bash
# 1. Остановить сервисы, которые пишут в БД
docker compose -f docker-compose.prod.yml stop backend bots

# 2. Пересоздать базу данных
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U ab_afisha -c "DROP DATABASE ab_afisha;"
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U ab_afisha -c "CREATE DATABASE ab_afisha OWNER ab_afisha;"

# 3. Восстановить из дампа
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U ab_afisha -d ab_afisha \
  < /srv/backups/dump-YYYYMMDD-HHMM.sql

# 4. Запустить сервисы
docker compose -f docker-compose.prod.yml start backend bots
docker compose -f docker-compose.prod.yml ps
```

---

## 6. Rollback приложения

### 6.1 Откат без изменений схемы БД

Если образы предыдущей версии сохранены под другим тегом:

```bash
docker compose -f docker-compose.prod.yml down

# Переключить тег на предыдущую версию
docker tag ab-afisha/backend:previous  ab-afisha/backend:latest
docker tag ab-afisha/frontend:previous ab-afisha/frontend:latest
docker tag ab-afisha/bots:previous     ab-afisha/bots:latest

docker compose -f docker-compose.prod.yml up -d
```

Или пересобрать из предыдущего коммита:

```bash
git log --oneline -10
git checkout <SHA-предыдущего-коммита>
docker build -f apps/backend/Dockerfile  -t ab-afisha/backend:latest  .
docker build -f apps/frontend/Dockerfile -t ab-afisha/frontend:latest .
docker build -f apps/bots/Dockerfile     -t ab-afisha/bots:latest     .
docker compose -f docker-compose.prod.yml up -d
git checkout main
```

### 6.2 Откат схемы БД

> **Важно**: откат схемы БД возможен только через backup/restore или отдельную обратную миграцию.
>
> **Запрещено** использовать `prisma migrate resolve --rolled-back` как способ отката данных.
> Эта команда только помечает запись в таблице `_prisma_migrations` как отменённую,
> но **не изменяет реальную схему БД** и **не восстанавливает данные**.

**Вариант A — Restore из backup** (предпочтительно):

```bash
# Выполнить шаги из раздела 5
```

**Вариант B — Обратная миграция** (только если backup недоступен):

Написать отдельный SQL-файл, который вручную отменяет изменения схемы
(удаляет добавленные столбцы/таблицы, восстанавливает удалённые).
Применить через:

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U ab_afisha -d ab_afisha < rollback-migration.sql
```

---

## 7. Обновление SSL-сертификата

Сертификаты Let's Encrypt действуют 90 дней. Продление — автоматически через certbot.

### 7.1 Проверить текущий статус и срок действия

```bash
certbot certificates
```

### 7.2 Ручное продление

```bash
# Остановить nginx, чтобы освободить порт 80
docker compose -f docker-compose.prod.yml stop nginx

certbot renew

# Запустить nginx
docker compose -f docker-compose.prod.yml start nginx
```

### 7.3 Автоматическое продление через cron

```bash
crontab -e
```

Добавить (запуск дважды в день — стандартная рекомендация Let's Encrypt):

```
0 0,12 * * * certbot renew --quiet --pre-hook "docker compose -f /srv/ab-afisha/docker-compose.prod.yml stop nginx" --post-hook "docker compose -f /srv/ab-afisha/docker-compose.prod.yml start nginx"
```

---

## 8. Мониторинг

### 8.1 Health check вручную

```bash
curl -s https://ab-event.pro/api/health
```

Ожидается: `{"status":"ok","services":{"api":"ok","database":"ok"}}`

При `"status":"degraded"` — проверить доступность PostgreSQL (раздел 9.5).

### 8.2 Мониторинг через cron

```bash
crontab -e
```

Простая проверка каждые 5 минут (результат в файл):

```
*/5 * * * * curl -sf https://ab-event.pro/api/health >> /var/log/ab-afisha-health.log 2>&1 || echo "$(date): HEALTH CHECK FAILED" >> /var/log/ab-afisha-health.log
```

### 8.3 Ресурсы сервера

```bash
# Использование RAM и CPU контейнерами
docker stats --no-stream

# Место на диске
df -h
du -sh /srv/backups/
du -sh /var/lib/docker/
```

---

## 9. Действия при сбоях

### 9.1 Backend не стартует

```bash
docker compose -f docker-compose.prod.yml logs backend --tail=50
```

Частые причины:
- `DATABASE_URL` некорректен → проверить `POSTGRES_PASSWORD` в `.env`
- `REDIS_*` недоступен → проверить `REDIS_PASSWORD` в `.env`
- Ошибка миграции → см. 9.5

### 9.2 Nginx не стартует

```bash
docker compose -f docker-compose.prod.yml logs nginx --tail=30
```

Частые причины:
- Отсутствует или просрочен SSL-сертификат → проверить `ls /etc/letsencrypt/live/ab-event.pro/`
- Ошибка конфигурации → проверить синтаксис:

```bash
docker compose -f docker-compose.prod.yml exec nginx nginx -t
```

### 9.3 Боты не работают

```bash
docker compose -f docker-compose.prod.yml logs bots --tail=50
```

Частые причины:
- `TELEGRAM_BOT_TOKEN` или `MAX_BOT_TOKEN` не задан или неверен
- `BOT_INTERNAL_TOKEN` не совпадает с backend
- Backend недоступен → проверить `curl -s http://localhost:3001/api/health` внутри bots-контейнера:

```bash
docker compose -f docker-compose.prod.yml exec bots \
  wget -qO- http://backend:3001/api/health
```

### 9.4 Redis недоступен

```bash
docker compose -f docker-compose.prod.yml logs redis --tail=20
docker compose -f docker-compose.prod.yml exec redis \
  redis-cli -a "$REDIS_PASSWORD" ping
```

Ожидается: `PONG`. При сбое — перезапустить redis:

```bash
docker compose -f docker-compose.prod.yml restart redis
```

### 9.5 PostgreSQL недоступен

```bash
docker compose -f docker-compose.prod.yml logs postgres --tail=20
docker compose -f docker-compose.prod.yml exec postgres \
  pg_isready -U ab_afisha
```

Ожидается: `/var/run/postgresql:5432 - accepting connections`. При сбое:

```bash
docker compose -f docker-compose.prod.yml restart postgres
```

Если ошибка `FATAL: data directory ... has wrong ownership` — проверить права на volume:

```bash
docker volume inspect ab-afisha_postgres-data
```

### 9.6 Reminder dispatch не работает

Напоминания отправляются cron-задачей `@Cron(EVERY_MINUTE)` внутри backend.

Диагностика:

```bash
# Проверить логи backend на ошибки отправки
docker compose -f docker-compose.prod.yml logs backend --tail=200 \
  | grep -iE "reminder|dispatch|TELEGRAM|MAX"

# Проверить наличие pending reminders в БД
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U ab_afisha -d ab_afisha \
  -c "SELECT id, status, \"remindAt\", \"botUserId\" FROM \"Reminder\" WHERE status = 'PENDING' LIMIT 10;"
```

Частые причины:
- `TELEGRAM_BOT_TOKEN` или `MAX_BOT_TOKEN` не задан
- `remindAt` в прошлом, но статус не `SENT`/`FAILED` → проверить логи ошибок

### 9.7 Broadcast queue не работает

Рассылки обрабатываются через Bull/Redis очередь.

Диагностика:

```bash
# Логи backend — процессор очереди
docker compose -f docker-compose.prod.yml logs backend --tail=200 \
  | grep -iE "broadcast|queue|bull|processor"

# Статус рассылок в БД
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U ab_afisha -d ab_afisha \
  -c "SELECT id, status, channel, \"scheduledAt\" FROM \"Broadcast\" ORDER BY \"createdAt\" DESC LIMIT 10;"
```

Частые причины:
- Redis недоступен → Bull не может обработать очередь (см. 9.4)
- `TELEGRAM_BOT_TOKEN`/`MAX_BOT_TOKEN` не задан
- Рассылка в статусе `QUEUED` зависла → проверить Redis и перезапустить backend
