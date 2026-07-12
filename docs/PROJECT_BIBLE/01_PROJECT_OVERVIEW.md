# 01 — Project Overview

## Project
- Name: «АБ Афиша Бухгалтера».
- Purpose: public calendar of professional accounting events with admin panel, MAX import, Telegram/MAX bots, reminders, analytics and legal pages.

## Canonical repository
- Current: `bazhenovnv/ab-partner-calendar-v2`.
- Historical/forbidden for current work: `bazhenovnv/ab-partner-calendar`.
- Working branch: `claude/ab-afisha-architecture-plan-805f5o`.

## Domains and environment
- Production: `https://ab-event.pro`.
- Staging: `https://test.ab-event.pro`.
- Server project path: `/srv/ab-afisha`.
- Current VPS IPv4: `5.129.243.179`.
- Historical removed VPS: `77.232.136.248`.
- Runtime configuration must use domains, not hardcoded server IPs.

## Contacts
- Canonical project email: `info-event@a-b.ru`.
- Company: ООО «АБ ГРУПП».
- ОГРН: `1212300074766`.
- ИНН: `2308283450`.
- Address: 350049, Краснодарский край, г. Краснодар, ул. Красных Партизан, д. 164, помещение 5.

## Stack
- Frontend: Next.js 14 App Router, React, TypeScript, Tailwind/CSS.
- Backend: NestJS, TypeScript, Prisma.
- Database: PostgreSQL.
- Queue/cache: Redis + Bull.
- Bots: Telegram and MAX services.
- Deployment: Docker, Docker Compose, Nginx, Timeweb Cloud.
- Analytics: Yandex Metrika `110270689`.

## Security
Never store production secrets, passwords, tokens, private `.env`, or SSH private keys in GitHub. Repository may contain only examples and documented variable names.