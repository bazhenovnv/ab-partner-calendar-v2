# Timeweb Cloud deployment notes

Production VPS:

- Provider: Timeweb Cloud
- Production domain: ab-event.pro
- IPv4: 77.232.136.248
- Host: kvnvm-277
- CPU: 2 × 3.3 GHz
- Disk: 50 GB
- Deploy: Docker / Docker Compose

Run on the server:

- Next.js frontend
- NestJS backend
- PostgreSQL
- Redis
- job queue
- Sharp image processing
- Telegram/MAX bots
- MAX/API background import jobs
- Nginx / reverse proxy
- SSL certificate for ab-event.pro

Security rules:

- Do not use root for regular deployments.
- Create a separate deploy user.
- Use SSH keys.
- Disable root login by password after setup.
- Keep only ports 22, 80 and 443 open.
- Store all runtime credentials in server environment files.
- Do not commit production environment files, SSH keys or private credentials to GitHub.
