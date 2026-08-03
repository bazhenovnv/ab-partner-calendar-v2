/**
 * Official MAX Bot API types — platform-api2.max.ru
 *
 * RAW types reflect the exact snake_case fields sent by MAX.
 * Normalized (internal) types use camelCase for TypeScript ergonomics.
 * Always parse raw payloads through normalizeMaxUpdate() at the system boundary.
 */

// ─── Raw (snake_case) — what MAX actually sends ──────────────────────────────

export interface RawMaxUser {
  user_id: number;
  name?: string;
  username?: string;
}

export interface RawMaxAttachmentPayload {
  url?: string;
  token?: string;
  width?: number;
  height?: number;
  duration?: number;
  filename?: string;
  size?: number;
  mime_type?: string;
}

export interface RawMaxAttachment {
  type: 'image' | 'video' | 'audio' | 'file' | 'inline_keyboard' | 'location' | 'sticker';
  payload?: RawMaxAttachmentPayload;
}

export interface RawMaxMarkupItem {
  type: string;
  url?: string;
}

export interface RawMaxMessageBody {
  mid: string;
  text?: string;
  attachments?: RawMaxAttachment[];
  markup?: RawMaxMarkupItem[];
}

export interface RawMaxRecipient {
  chat_id?: number;
  user_id?: number;
}

export interface RawMaxMessage {
  sender?: RawMaxUser;
  recipient: RawMaxRecipient;
  timestamp: number;
  body: RawMaxMessageBody;
}

/** Raw bot_added update from MAX webhook / GET /updates */
export interface RawMaxBotAddedUpdate {
  update_type: 'bot_added';
  timestamp: number;
  chat_id: number;
  is_channel?: boolean;
  user?: RawMaxUser;
}

/** Raw message_created update from MAX webhook / GET /updates */
export interface RawMaxMessageCreatedUpdate {
  update_type: 'message_created';
  timestamp: number;
  message: RawMaxMessage;
}

/** Raw message_edited update */
export interface RawMaxMessageEditedUpdate {
  update_type: 'message_edited';
  timestamp: number;
  message: RawMaxMessage;
}

/** Raw message_removed update */
export interface RawMaxMessageRemovedUpdate {
  update_type: 'message_removed';
  timestamp: number;
  message_id: string;
  chat_id: number;
  user_id?: number;
}

export interface RawMaxCallback {
  callback_id: string;
  payload?: string;
  timestamp?: number;
  user?: RawMaxUser;
}

export interface RawMaxMessageCallbackUpdate {
  update_type: 'message_callback';
  timestamp: number;
  callback: RawMaxCallback;
  message?: RawMaxMessage;
  user?: RawMaxUser;
}

export interface RawMaxBotStartedUpdate {
  update_type: 'bot_started';
  timestamp: number;
  chat_id?: number;
  payload?: string;
  user: RawMaxUser;
}

export type RawMaxUpdate =
  | RawMaxBotAddedUpdate
  | RawMaxMessageCreatedUpdate
  | RawMaxMessageEditedUpdate
  | RawMaxMessageRemovedUpdate
  | RawMaxMessageCallbackUpdate
  | RawMaxBotStartedUpdate
  | { update_type: string; timestamp: number; [key: string]: unknown };

export interface RawMaxUpdatesResponse {
  updates: RawMaxUpdate[];
  marker?: number;
}

// ─── Normalized (camelCase) — internal representation after the boundary ─────

export type MaxUpdateType =
  | 'message_created'
  | 'message_callback'
  | 'message_edited'
  | 'message_removed'
  | 'bot_added'
  | 'bot_removed'
  | 'user_added'
  | 'user_removed'
  | 'bot_started'
  | 'bot_stopped'
  | 'chat_title_changed'
  | 'message_construction_request'
  | 'message_constructed'
  | 'message_chat_created';

export interface MaxUser {
  userId: number;
  name?: string;
  username?: string;
}

export interface MaxAttachmentPayload {
  url?: string;
  token?: string;
  width?: number;
  height?: number;
  duration?: number;
  filename?: string;
  size?: number;
  mimeType?: string;
}

export interface MaxAttachment {
  type: 'image' | 'video' | 'audio' | 'file' | 'inline_keyboard' | 'location' | 'sticker';
  payload?: MaxAttachmentPayload;
}

export interface MaxMarkupItem {
  type: string;
  url?: string;
}

export interface MaxMessageBody {
  mid: string;
  text?: string;
  attachments?: MaxAttachment[];
  markup?: MaxMarkupItem[];
}

export interface MaxRecipient {
  chatId?: number;
  userId?: number;
}

export interface MaxMessage {
  sender?: MaxUser;
  recipient: MaxRecipient;
  timestamp: number;
  body: MaxMessageBody;
}

export interface MaxBotAddedUpdate {
  updateType: 'bot_added';
  timestamp: number;
  chatId: number;
  isChannel?: boolean;
  user?: MaxUser;
}

export interface MaxMessageCreatedUpdate {
  updateType: 'message_created';
  timestamp: number;
  message: MaxMessage;
}

export interface MaxMessageEditedUpdate {
  updateType: 'message_edited';
  timestamp: number;
  message: MaxMessage;
}

export interface MaxMessageRemovedUpdate {
  updateType: 'message_removed';
  timestamp: number;
  messageId: string;
  chatId: number;
  userId?: number;
}

export interface MaxCallback {
  callbackId: string;
  payload?: string;
  timestamp?: number;
  user?: MaxUser;
}

export interface MaxMessageCallbackUpdate {
  updateType: 'message_callback';
  timestamp: number;
  callback: MaxCallback;
  message?: MaxMessage;
  user?: MaxUser;
}

export interface MaxBotStartedUpdate {
  updateType: 'bot_started';
  timestamp: number;
  chatId?: number;
  payload?: string;
  user: MaxUser;
}

export type MaxUpdate =
  | MaxBotAddedUpdate
  | MaxMessageCreatedUpdate
  | MaxMessageEditedUpdate
  | MaxMessageRemovedUpdate
  | MaxMessageCallbackUpdate
  | MaxBotStartedUpdate
  | { updateType: string; timestamp: number; [key: string]: unknown };

// ─── Normalization boundary ───────────────────────────────────────────────────

function normalizeUser(raw: RawMaxUser | undefined): MaxUser | undefined {
  if (!raw) return undefined;
  return { userId: raw.user_id, name: raw.name, username: raw.username };
}

function normalizeAttachmentPayload(raw: RawMaxAttachmentPayload | undefined): MaxAttachmentPayload | undefined {
  if (!raw) return undefined;
  return {
    url: raw.url,
    token: raw.token,
    width: raw.width,
    height: raw.height,
    duration: raw.duration,
    filename: raw.filename,
    size: raw.size,
    mimeType: raw.mime_type,
  };
}

function normalizeAttachment(raw: RawMaxAttachment): MaxAttachment {
  return { type: raw.type, payload: normalizeAttachmentPayload(raw.payload) };
}

function normalizeMessage(raw: RawMaxMessage): MaxMessage {
  return {
    sender: normalizeUser(raw.sender),
    recipient: {
      chatId: raw.recipient.chat_id,
      userId: raw.recipient.user_id,
    },
    timestamp: raw.timestamp,
    body: {
      mid: raw.body.mid,
      text: raw.body.text,
      attachments: raw.body.attachments?.map(normalizeAttachment),
      markup: raw.body.markup?.map((m) => ({
        type: m.type,
        url: m.url,
      })),
    }
  };
}

/**
 * Single normalization boundary for all raw MAX payloads.
 * Call this once on every incoming payload before passing to service logic.
 * Rejects payloads missing update_type.
 */
export function normalizeMaxUpdate(raw: unknown): MaxUpdate | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const updateType = r['update_type'];
  if (typeof updateType !== 'string') return null;
  const timestamp = typeof r['timestamp'] === 'number' ? r['timestamp'] : 0;

  if (updateType === 'bot_added') {
    return {
      updateType: 'bot_added',
      timestamp,
      chatId: r['chat_id'] as number,
      isChannel: r['is_channel'] as boolean | undefined,
      user: normalizeUser(r['user'] as RawMaxUser | undefined),
    };
  }

  if (updateType === 'message_created' || updateType === 'message_edited') {
    const rawMsg = r['message'] as RawMaxMessage | undefined;
    if (!rawMsg) return null;
    return {
      updateType: updateType as 'message_created' | 'message_edited',
      timestamp,
      message: normalizeMessage(rawMsg),
    };
  }

  if (updateType === 'message_removed') {
    return {
      updateType: 'message_removed',
      timestamp,
      messageId: r['message_id'] as string,
      chatId: r['chat_id'] as number,
      userId: r['user_id'] as number | undefined,
    };
  }

  if (updateType === 'message_callback') {
    const rawCallback = r['callback'] as RawMaxCallback | undefined;
    if (!rawCallback || typeof rawCallback.callback_id !== 'string') return null;
    const rawMessage = r['message'] as RawMaxMessage | undefined;
    return {
      updateType: 'message_callback',
      timestamp,
      callback: {
        callbackId: rawCallback.callback_id,
        payload: rawCallback.payload,
        timestamp: rawCallback.timestamp,
        user: normalizeUser(rawCallback.user),
      },
      message: rawMessage ? normalizeMessage(rawMessage) : undefined,
      user: normalizeUser(r['user'] as RawMaxUser | undefined),
    };
  }

  if (updateType === 'bot_started') {
    const user = normalizeUser(r['user'] as RawMaxUser | undefined);
    if (!user) return null;
    return {
      updateType: 'bot_started',
      timestamp,
      chatId: r['chat_id'] as number | undefined,
      payload: r['payload'] as string | undefined,
      user,
    };
  }

  // Unknown type — pass through with normalized updateType key
  return { updateType, timestamp };
}
