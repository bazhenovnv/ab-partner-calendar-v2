# TZ v7 additions

These changes must be applied to the project requirements and implementation.

## Test domain

- Production: `ab-event.pro`.
- Test environment: `test.ab-event.pro`.
- All new features and integrations must be checked on the test environment before production release.

## Monorepo architecture

Required structure:

```text
ab-partner-calendar-v2/
├── apps/
│   ├── frontend/
│   ├── backend/
│   └── bots/
├── packages/
│   ├── shared/
│   └── config/
├── infra/
└── docs/
```

Important separation:

- `apps/bots` is the runtime service for Telegram/MAX bots.
- backend `modules/bots` is the admin/API layer for bot settings, logs, bot users and reminders.
- shared types, DTO, enum and constants must live in `packages/shared`.

## Dropdown chevron animation in filters

Applies to all dropdown filters:

- Region/city;
- Direction;
- Format;
- Status;
- Price, if implemented as dropdown;
- any other filter dropdowns.

Behavior:

1. Closed dropdown: chevron points down.
2. Open dropdown: the same chevron smoothly rotates up.
3. Closing dropdown: chevron smoothly returns down.
4. Selected/unselected filter value does not affect chevron direction.
5. Direction depends only on `open / closed` state.
6. Use one SVG icon, not two separate images.
7. Recommended animation: `rotate(180deg)`, 150-200ms, `ease-out`.
8. State must be tied to `aria-expanded`.
9. Same behavior on 1920, 1440, 1024 and mobile 390.
10. Do not confuse dropdown chevron with checkbox tick. Checkbox tick is only for selected list items.

Acceptance criteria:

- closed dropdown: chevron down;
- open dropdown: chevron up;
- after close: chevron down again;
- no layout jump;
- filter button height does not change;
- mobile 390 behavior matches desktop.

## Calendar header: month and year

The calendar header must always show month and year together.

Format example:

```text
Май 2026
```

Rules:

- month in Russian, capitalized;
- year is always visible as four digits;
- never show only month without year;
- month navigation updates year correctly;
- examples: `Декабрь 2026 -> Январь 2027`, `Январь 2027 -> Декабрь 2026`;
- layout: month left, year next to month, navigation arrows right;
- applies to 1920, 1440, 1024 and mobile 390;
- typography: Montserrat SemiBold, desktop reference 30px; mobile can be smaller but readable.

## Development workflow

Use feature branches and Pull Requests into `main`.

Do not merge if backend typecheck/build is failing.

Required checks before merge:

- `pnpm install`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm build`;
- `prisma generate`;
- Prisma migration check;
- backend build;
- frontend build;
- bots build;
- Docker Compose check where Docker is available;
- backend healthcheck;
- PostgreSQL and Redis connection checks.
