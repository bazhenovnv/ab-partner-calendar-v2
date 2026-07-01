export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'HIDDEN' | 'ARCHIVE' | 'NEEDS_ATTENTION' | 'DELETED';
export type EventAutoStatus = 'PLANNED' | 'LIVE' | 'COMPLETED';
export type EventFormat = 'ONLINE' | 'OFFLINE';
export type PriceType = 'FREE' | 'PAID';
export type ImportSource = 'MAX' | 'API' | 'MANUAL';
export type BotChannel = 'TELEGRAM' | 'MAX';
export type UserRole = 'ADMIN' | 'EDITOR';
export type ReminderStatus = 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';

export interface ReminderItem {
  id: string;
  eventId: string;
  botUserId: string;
  remindAt: string;
  timezone: string;
  status: ReminderStatus;
  sentAt: string | null;
  failedAt: string | null;
  failReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventDirection {
  id: string;
  name: string;
  slug: string;
}

export interface EventCity {
  id: string;
  name: string;
  region: string;
}

export interface EventCardDto {
  id: string;
  title: string;
  shortDescription: string | null;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  autoStatus: EventAutoStatus;
  format: EventFormat;
  city: string | null;
  priceType: PriceType;
  priceText: string | null;
  directions: string[];
  mainEvent: boolean;
  eventCardImageUrl: string | null;
  thumbnailImageUrl: string | null;
}

export interface EventDetailDto extends EventCardDto {
  fullDescription: string | null;
  address: string | null;
  venue: string | null;
  speaker: string | null;
  eventUrl: string | null;
  ticketUrl: string | null;
  ticketSalesEnabled: boolean;
  modalImageUrl: string | null;
  mainEventImageUrl: string | null;
  tags: string[];
}

export interface CalendarDayDto {
  date: string;
  planned: number;
  live: number;
  completed: number;
}

export interface MainEventDto {
  id: string;
  title: string;
  shortDescription: string | null;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  format: EventFormat;
  city: string | null;
  autoStatus: EventAutoStatus;
  mainEventImageUrl: string | null;
  sortOrder: number;
}

export interface QuoteDto {
  id: string;
  text: string;
  author: string | null;
}

export interface FilterOptionsDto {
  directions: Array<{ id: string; name: string; slug: string }>;
  formats: Array<{ value: string; label: string }>;
  statuses: Array<{ value: string; label: string }>;
  cities: string[];
}
