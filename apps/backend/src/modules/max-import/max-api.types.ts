/** Official MAX Bot API types — platform-api2.max.ru */

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

export interface MaxChat {
  chatId: number;
  type?: 'dialog' | 'chat' | 'channel';
  title?: string;
  link?: string;
}

export interface MaxImagePayload {
  url?: string;
  token?: string;
  width?: number;
  height?: number;
}

export interface MaxFilePayload {
  url?: string;
  token?: string;
  filename?: string;
  size?: number;
  mimeType?: string;
}

export interface MaxVideoPayload {
  url?: string;
  token?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface MaxAttachment {
  type: 'image' | 'video' | 'audio' | 'file' | 'inline_keyboard' | 'location' | 'sticker';
  payload?: MaxImagePayload | MaxFilePayload | MaxVideoPayload;
}

export interface MaxMessageBody {
  mid: string;
  text?: string;
  attachments?: MaxAttachment[];
}

export interface MaxRecipient {
  chatId?: number;
  userId?: number;
}

export interface MaxMessage {
  sender?: MaxUser;
  recipient: MaxRecipient;
  timestamp: number; // Unix ms
  body: MaxMessageBody;
}

export interface MaxMessageCreatedUpdate {
  updateType: 'message_created';
  timestamp: number;
  message: MaxMessage;
}

export interface MaxBotAddedUpdate {
  updateType: 'bot_added';
  timestamp: number;
  chatId: number;
  user?: MaxUser;
  chat?: MaxChat;
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

export type MaxUpdate =
  | MaxMessageCreatedUpdate
  | MaxBotAddedUpdate
  | MaxMessageEditedUpdate
  | MaxMessageRemovedUpdate
  | { updateType: string; timestamp: number; [key: string]: unknown };

export interface MaxUpdatesResponse {
  updates: MaxUpdate[];
  marker?: number;
}
