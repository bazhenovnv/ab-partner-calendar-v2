# Project contact email

Current approved contact email:

```env
PUBLIC_CONTACT_EMAIL=ab-event.pro@yandex.ru
NEXT_PUBLIC_CONTACT_EMAIL=ab-event.pro@yandex.ru
```

Use this email in:

- footer contacts;
- legal documents;
- admin site settings;
- contact blocks;
- technical/maintenance page if contact email is shown.

Frontend behavior for visible email links:

1. On click, copy `ab-event.pro@yandex.ru` to clipboard via Clipboard API.
2. Open the user's mail client with `mailto:ab-event.pro@yandex.ru`.
3. Show a toast: `Email скопирован`.
4. If clipboard access is blocked, still open `mailto:` and show fallback toast: `Откройте почту или скопируйте адрес вручную`.
5. The element must be keyboard-accessible and have a clear `aria-label`.

Do not hardcode the email in multiple places. Read it from site settings or env/config and expose it to the frontend safely.
