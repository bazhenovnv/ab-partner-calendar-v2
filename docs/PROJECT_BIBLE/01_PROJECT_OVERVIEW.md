# 01 — Project Overview

## Project
- Name: «АБ Афиша Бухгалтера».
- Purpose: public calendar of professional accounting events with admin panel, MAX import, Telegram/MAX bots, reminders, analytics and legal pages.

## Canonical repository
- Current: `bazhenovnv/ab-partner-calendar-v2`.
- Historical/forbidden for current work: `bazhenovnv/ab-partner-calendar`.
- Canonical integration branch: `main`.
- New work is performed in short-lived feature branches created from current `main` and merged back only after acceptance.
- Verified design-phase baseline: commit `b6c333a`, tag `release-20260723`.
- Historical removed branch tips are preserved by tags matching `archive-20260723-*`.

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

## Current phase
- Documentation stabilization precedes UI code changes.
- The active product scope after documentation stabilization is the public homepage design remediation described by `12_DESIGN_AUDIT_2026-07.md`.
- Acceptance evidence is recorded in `09B_RELEASE_ACCEPTANCE_CHECKLIST.md`.

## Security
Never store production secrets, passwords, tokens, private `.env`, or SSH private keys in GitHub. Repository may contain only examples and documented variable names.
