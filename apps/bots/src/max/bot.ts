import { SITE_URL } from '@ab-afisha/shared';

const MSK_OFFSET_MS = 3 * 60 * 60_000;
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://backend:3001';
const API_BASE = `${BACKEND_URL}/api`;
const BOT_TOKEN = process.env.BOT_INTERNAL_TOKEN ?? '';
const BOT_HEADERS = { 'Content-Type': 'application/json', 'X-Bot-Internal-Token': BOT_TOKEN };
const MAX_API = 'https://api.max.ru/v1';

// ── helpers ────────────────────────────────────────────────────────────────

function parseMskDateInput(text: string): Date | null {
  const t = text.trim();
  let match = /^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2}):(\d{2})$/.exec(t);
  if (match) {
    const [, dd, mm, yyyy, hh, min] = match;
    const utcMs = Date.UTC(+yyyy, +mm - 1, +dd, +hh, +min) - MSK_OFFSET_MS;
    const d = new Date(utcMs);
    return isNaN(d.getTime()) ? null : d;
  }
  match = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})$/.exec(t);
  if (match) {
    const [, yyyy, mm, dd, hh, min] = match;
    const utcMs = Date.UTC(+yyyy, +mm - 1, +dd, +hh, +min) - MSK_OFFSET_MS;
    const d = new Date(utcMs);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function formatMsk(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// ── backend API calls ───────────────────────────────────────────────────────

interface BotUserSnapshot {
  id: string;
  legalAcceptedAt: string | null;
  broadcastConsentAcceptedAt: string | null;
  phone: string | null;
  allowMarketingMessages: boolean;
}

async function apiBotUpsert(externalId: string, username?: string | null): Promise<BotUserSnapshot | null> {
  try {
    const res = await fetch(`${API_BASE}/bots/users/upsert`, {
      method: 'POST',
      headers: BOT_HEADERS,
      body: JSON.stringify({ channel: 'MAX', externalId, username }),
    });
    return res.ok ? (res.json() as Promise<BotUserSnapshot>) : null;
  } catch {
    return null;
  }
}

async function apiAcceptLegal(id: string, acceptBroadcastConsent: boolean): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/bots/users/${id}/accept-legal`, {
      method: 'POST',
      headers: BOT_HEADERS,
      body: JSON.stringify({ acceptBroadcastConsent }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function apiSavePhone(id: string, phone: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/bots/users/${id}/phone`, {
      method: 'POST',
      headers: BOT_HEADERS,
      body: JSON.stringify({ phone }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function apiPhoneRequired(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/bots/config`);
    if (!res.ok) return false;
    const data = await res.json() as { phoneRequired: boolean };
    return data.phoneRequired === true;
  } catch {
    return false;
  }
}

type SaveResult = { ok: true } | { ok: false; duplicate: true } | { ok: false; duplicate: false };

async function saveReminder(botUserId: string, eventId: string, remindAt: Date): Promise<SaveResult> {
  try {
    const res = await fetch(`${API_BASE}/reminders`, {
      method: 'POST',
      headers: BOT_HEADERS,
      body: JSON.stringify({
        botUserId,
        eventId,
        remindAt: remindAt.toISOString(),
        timezone: 'Europe/Moscow',
      }),
    });
    if (res.ok) return { ok: true };
    if (res.status === 409) return { ok: false, duplicate: true };
    return { ok: false, duplicate: false };
  } catch {
    return { ok: false, duplicate: false };
  }
}

async function sendMaxMessage(token: string, chatId: string, text: string): Promise<void> {
  try {
    await fetch(`${MAX_API}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (err) {
    console.error('[max-bot] Send error:', err);
  }
}

// ── per-user state machine ──────────────────────────────────────────────────
//
// MAX does not support native keyboard contact-sharing buttons.
// Phone flow fallback: user types their phone number as plain text.

type UserState =
  | { step: 'awaitingLegal'; botUserId: string; pendingEventId?: string; allowMarketing: boolean }
  | { step: 'awaitingPhone'; botUserId: string; pendingEventId?: string }
  | { step: 'awaitingReminderTime'; botUserId: string; eventId: string };

const userState = new Map<string, UserState>();

// ── legal notice ────────────────────────────────────────────────────────────

function legalNoticeText(includeMarketing: boolean): string {
  const lines = [
    'Прежде чем продолжить, ознакомьтесь с документами:',
    '',
    `• Политика конфиденциальности: ${SITE_URL}/legal/privacy`,
    `• Пользовательское соглашение: ${SITE_URL}/legal/terms`,
    `• Согласие на обработку персональных данных: ${SITE_URL}/legal/consent`,
  ];
  if (includeMarketing) {
    lines.push(`• Согласие на информационные рассылки: ${SITE_URL}/legal/broadcast-consent`);
  }
  lines.push('');
  lines.push('Введите «Принимаю», чтобы подтвердить согласие и продолжить.');
  return lines.join('\n');
}

// ── /start handler ──────────────────────────────────────────────────────────

async function handleStart(
  token: string,
  chatId: string,
  externalId: string,
  username: string | undefined,
  payload: string,
) {
  const user = await apiBotUpsert(externalId, username);
  if (!user) {
    await sendMaxMessage(token, chatId, 'Сервис временно недоступен. Пожалуйста, попробуйте позже.');
    return;
  }

  const pendingEventId = payload.startsWith('remind_')
    ? payload.replace('remind_', '').split('_')[0]
    : undefined;

  // Step 1: legal
  if (!user.legalAcceptedAt) {
    userState.set(chatId, {
      step: 'awaitingLegal',
      botUserId: user.id,
      pendingEventId,
      allowMarketing: user.allowMarketingMessages,
    });
    await sendMaxMessage(token, chatId, legalNoticeText(user.allowMarketingMessages));
    return;
  }

  // Step 2: phone
  const phoneRequired = await apiPhoneRequired();
  if (phoneRequired && !user.phone) {
    userState.set(chatId, { step: 'awaitingPhone', botUserId: user.id, pendingEventId });
    await sendMaxMessage(
      token,
      chatId,
      'Для продолжения укажите номер телефона в формате +7XXXXXXXXXX.',
    );
    return;
  }

  // Step 3: proceed
  if (pendingEventId) {
    userState.set(chatId, { step: 'awaitingReminderTime', botUserId: user.id, eventId: pendingEventId });
    await sendMaxMessage(
      token,
      chatId,
      'Введите дату и время напоминания по московскому времени (UTC+3) в формате:\n\nДД.ММ.ГГГГ ЧЧ:ММ\n\nПример: 15.07.2025 09:00',
    );
  } else {
    await sendMaxMessage(
      token,
      chatId,
      `Привет! Я бот АБ Афиши Бухгалтера.\n\nЧтобы получить напоминание, перейди на сайт ${SITE_URL} и нажми «Напомнить» у нужного мероприятия.`,
    );
  }
}

// ── message handler ─────────────────────────────────────────────────────────

async function handleMaxUpdate(token: string, update: any) {
  const message = update.message;
  if (!message) return;

  const chatId: string = String(message.sender?.user_id ?? message.chat_id);
  const externalId = chatId;
  const username: string | undefined = message.sender?.username;
  const text: string = (message.body?.text ?? '').trim();

  if (text.startsWith('/start')) {
    const payload = text.replace('/start', '').trim();
    await handleStart(token, chatId, externalId, username, payload);
    return;
  }

  const state = userState.get(chatId);
  if (!state) return;

  // Legal acceptance
  if (state.step === 'awaitingLegal') {
    if (text.toLowerCase() !== 'принимаю') {
      await sendMaxMessage(token, chatId, 'Введите «Принимаю» для подтверждения согласия.');
      return;
    }
    await apiAcceptLegal(state.botUserId, state.allowMarketing);

    const phoneRequired = await apiPhoneRequired();
    if (phoneRequired) {
      userState.set(chatId, { step: 'awaitingPhone', botUserId: state.botUserId, pendingEventId: state.pendingEventId });
      await sendMaxMessage(token, chatId, 'Введите номер телефона в формате +7XXXXXXXXXX.');
      return;
    }

    userState.delete(chatId);
    if (state.pendingEventId) {
      userState.set(chatId, { step: 'awaitingReminderTime', botUserId: state.botUserId, eventId: state.pendingEventId });
      await sendMaxMessage(token, chatId, 'Введите дату и время напоминания (МСК) в формате ДД.ММ.ГГГГ ЧЧ:ММ\n\nПример: 15.07.2025 09:00');
    } else {
      await sendMaxMessage(token, chatId, `Принято! Теперь вы можете получать напоминания через кнопку «Напомнить» на сайте ${SITE_URL}`);
    }
    return;
  }

  // Phone input
  if (state.step === 'awaitingPhone') {
    const cleaned = text.replace(/[\s\-()]/g, '');
    if (!/^(\+7|7|8)\d{10}$/.test(cleaned)) {
      await sendMaxMessage(token, chatId, 'Не удалось распознать номер. Введите в формате +7XXXXXXXXXX.');
      return;
    }
    const normalised = '+7' + cleaned.slice(-10);
    await apiSavePhone(state.botUserId, normalised);
    userState.delete(chatId);

    if (state.pendingEventId) {
      userState.set(chatId, { step: 'awaitingReminderTime', botUserId: state.botUserId, eventId: state.pendingEventId });
      await sendMaxMessage(token, chatId, 'Спасибо! Введите дату и время напоминания (МСК) в формате ДД.ММ.ГГГГ ЧЧ:ММ\n\nПример: 15.07.2025 09:00');
    } else {
      await sendMaxMessage(token, chatId, `Спасибо! Теперь вы можете получать напоминания через кнопку «Напомнить» на сайте ${SITE_URL}`);
    }
    return;
  }

  // Reminder time input
  if (state.step === 'awaitingReminderTime') {
    const remindAt = parseMskDateInput(text);
    if (!remindAt) {
      await sendMaxMessage(token, chatId, 'Не удалось распознать дату. Введите в формате ДД.ММ.ГГГГ ЧЧ:ММ, например: 15.07.2025 09:00');
      return;
    }
    if (remindAt.getTime() <= Date.now()) {
      await sendMaxMessage(token, chatId, 'Указанное время уже прошло. Введите будущую дату и время.');
      return;
    }
    userState.delete(chatId);
    const result = await saveReminder(state.botUserId, state.eventId, remindAt);
    if (result.ok) {
      await sendMaxMessage(token, chatId, `Готово! Напоминание установлено на ${formatMsk(remindAt)} МСК.`);
    } else if (result.duplicate) {
      await sendMaxMessage(token, chatId, `Напоминание на ${formatMsk(remindAt)} МСК уже установлено для этого мероприятия.`);
    } else {
      await sendMaxMessage(token, chatId, `Не удалось сохранить напоминание. Пожалуйста, попробуйте позже или обратитесь на сайт ${SITE_URL}`);
    }
  }
}

// ── polling loop ────────────────────────────────────────────────────────────

async function pollMaxUpdates(token: string, offset = 0) {
  try {
    const res = await fetch(`${MAX_API}/bots/updates?offset=${offset}&limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.warn('[max-bot] Poll error:', res.status, res.statusText);
    } else {
      const data = await res.json() as any;
      const updates: any[] = data.updates ?? [];
      for (const upd of updates) {
        await handleMaxUpdate(token, upd);
        offset = Math.max(offset, (upd.update_id ?? 0) + 1);
      }
    }
  } catch (err) {
    console.error('[max-bot] Poll failed:', err);
  }
  setTimeout(() => pollMaxUpdates(token, offset), 3000);
}

export function startMaxBot(token: string) {
  console.log('[max-bot] MAX bot initialised (HTTP polling mode)');
  console.log('[max-bot] Note: MAX does not support native contact-sharing buttons.');
  console.log('[max-bot] Phone flow fallback: user types phone number as plain text.');
  pollMaxUpdates(token);
}
