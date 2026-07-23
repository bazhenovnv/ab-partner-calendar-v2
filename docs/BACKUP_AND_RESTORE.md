# Проверяемые резервные копии и восстановление

Рабочий каталог сервера: `/srv/ab-afisha`.

## Обязательная Compose-конфигурация

На рабочем сервере всегда используются оба файла:

```bash
docker compose \
  -f docker-compose.prod.yml \
  -f docker-compose.staging.yml \
  <command>
```

Staging overlay подключает SSL-конфигурацию `test.ab-event.pro`. Запуск только production-файла при пересоздании Nginx может удалить staging mount.

## Ручной backup

```bash
cd /srv/ab-afisha
chmod +x infra/scripts/backup.sh
sudo ./infra/scripts/backup.sh
```

По умолчанию файлы создаются в `/var/backups/ab-afisha` и хранятся 14 дней:

- `db_<timestamp>.sql.gz` — дамп PostgreSQL;
- `uploads_<timestamp>.tar.gz` — содержимое volume `ab-afisha_uploads`;
- `checksums_<timestamp>.sha256` — SHA-256 обоих архивов.

Параметры:

```bash
BACKUP_DIR=/mnt/backup RETENTION_DAYS=30 sudo -E ./infra/scripts/backup.sh
```

Проверка комплекта:

```bash
cd /var/backups/ab-afisha
sha256sum -c checksums_<timestamp>.sha256
gzip -t db_<timestamp>.sql.gz
tar -tzf uploads_<timestamp>.tar.gz >/dev/null
```

## Ежедневный systemd timer

```bash
cd /srv/ab-afisha
sudo cp infra/systemd/ab-afisha-backup.service /etc/systemd/system/
sudo cp infra/systemd/ab-afisha-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ab-afisha-backup.timer
```

Тестовый запуск:

```bash
sudo systemctl start ab-afisha-backup.service
sudo systemctl status ab-afisha-backup.service --no-pager
sudo journalctl -u ab-afisha-backup.service -n 100 --no-pager
```

Проверка расписания:

```bash
systemctl list-timers --all | grep ab-afisha-backup
```

Таймер запускается ежедневно в 03:15 UTC со случайной задержкой до 15 минут. `Persistent=true` выполняет пропущенный backup после включения сервера.

## Восстановление

Операция разрушительная. Перед запуском проверьте timestamp.

```bash
cd /srv/ab-afisha
chmod +x infra/scripts/restore.sh
```

Только база данных:

```bash
RESTORE_CONFIRM=YES sudo -E ./infra/scripts/restore.sh db <timestamp>
```

Только uploads:

```bash
RESTORE_CONFIRM=YES sudo -E ./infra/scripts/restore.sh uploads <timestamp>
```

Полное восстановление:

```bash
RESTORE_CONFIRM=YES sudo -E ./infra/scripts/restore.sh all <timestamp>
```

Скрипт проверяет checksum-файл, если он существует, останавливает `backend` и `bots`, восстанавливает выбранные данные и запускает сервисы после успешного завершения. При ошибке сервисы записи остаются остановленными, чтобы исключить работу с частично восстановленными данными.

## Проверка после backup, deploy или restore

```bash
docker compose \
  -f docker-compose.prod.yml \
  -f docker-compose.staging.yml \
  ps

curl -fsS https://ab-event.pro/api/health && echo
curl -fsS https://test.ab-event.pro/api/health && echo
```

Оба endpoint должны возвращать `status: ok`, `api: ok` и `database: ok`.
