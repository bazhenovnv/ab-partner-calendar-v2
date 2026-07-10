# STAGING SSL SETUP — test.ab-event.pro

**Дата:** 2026-07-10  
**Контекст:** Stage 44A — устранение циклической зависимости nginx ↔ certbot

---

## Проблема (chicken-and-egg)

nginx отказывается стартовать, если путь `ssl_certificate` не существует.  
certbot не может выпустить сертификат без HTTP:80 (который поднимает nginx).  
Результат — бесконечный restart loop.

---

## Решение

`infra/nginx/init-certs.sh` — startup-скрипт, запускаемый вместо `nginx` напрямую.

**Логика:**
1. Если `/etc/letsencrypt/live/test.ab-event.pro/fullchain.pem` **отсутствует** →  
   создаёт временный self-signed сертификат (срок 1 день) по тому же пути.
2. Запускает `nginx -g 'daemon off;'`.
3. nginx стартует с dummy-сертификатом — HTTP:80 работает, ACME challenge проходит.
4. Certbot выпускает реальный сертификат (перезаписывает dummy).
5. `nginx -s reload` — подхватывает реальный сертификат.
6. При последующих перезапусках контейнера реальный сертификат уже существует — скрипт его не трогает.

---

## Изменения в репозитории

| Файл | Изменение |
|------|-----------|
| `infra/nginx/init-certs.sh` | Новый файл — startup-скрипт |
| `docker-compose.prod.yml` | nginx: добавлен `command`, смонтирован скрипт, `/etc/letsencrypt` без `:ro` |
| `infra/nginx/conf.d/prod.conf` | Без изменений — HTTPS-блок для test.ab-event.pro уже есть |

---

## Полный сценарий первого запуска на сервере

### Шаг 1 — git pull

```bash
cd /path/to/project
git pull origin claude/ab-afisha-architecture-plan-805f5o
```

Проверить, что файл скрипта появился:
```bash
ls infra/nginx/init-certs.sh
grep "init-certs" docker-compose.prod.yml
```

### Шаг 2 — Подготовить certbot webroot

```bash
mkdir -p /var/www/certbot
```

### Шаг 3 — Пересоздать nginx-контейнер

```bash
docker compose -f docker-compose.prod.yml up -d --no-deps nginx
```

Проверить, что nginx запустился (а не в restart loop):
```bash
docker compose -f docker-compose.prod.yml ps nginx
# Ожидается: Up (не Restarting)

docker compose -f docker-compose.prod.yml logs nginx --tail=10
# Ожидается: [init-certs] Temporary cert written ...  или  Certificate found ...
#            nginx/1.25.x ...
```

### Шаг 4 — Тест ACME challenge

```bash
echo "acme-ok" > /var/www/certbot/.well-known/acme-challenge/probe
curl -s http://test.ab-event.pro/.well-known/acme-challenge/probe
# Ожидается: acme-ok
rm /var/www/certbot/.well-known/acme-challenge/probe
```

**Если получен 301 или любой другой ответ — остановиться и диагностировать.**

### Шаг 5 — Certbot (только после успешного шага 4)

```bash
certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  -d test.ab-event.pro \
  --non-interactive \
  --agree-tos \
  --email admin@ab-event.pro
# Ожидается: Successfully received certificate.
# Certificate is saved at: /etc/letsencrypt/live/test.ab-event.pro/fullchain.pem
```

### Шаг 6 — Reload nginx (применить реальный сертификат)

```bash
docker compose -f docker-compose.prod.yml exec nginx nginx -t
# Ожидается: test is successful

docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### Шаг 7 — Финальная проверка

```bash
curl -I https://test.ab-event.pro
# Ожидается:
# HTTP/2 200
# strict-transport-security: max-age=3600
# x-frame-options: SAMEORIGIN

curl -I http://test.ab-event.pro
# Ожидается: HTTP/1.1 301 → Location: https://test.ab-event.pro/
```

---

## Автопродление сертификата

```bash
crontab -e
# Добавить:
0 3 * * * certbot renew --quiet && docker compose -f /path/to/project/docker-compose.prod.yml exec nginx nginx -s reload
```

---

## После завершения

- `https://test.ab-event.pro` открывается в браузере
- Header доступен для ручной визуальной проверки
- Сравнить с макетом `project-assets/06_uploaded_images/{D2CF8AB4-3632-427C-B53C-4427C836662D}.png`
