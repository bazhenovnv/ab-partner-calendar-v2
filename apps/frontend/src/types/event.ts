export interface EventImage {
  id?: string;
  eventCardUrl?: string | null;
  thumbnailUrl?: string | null;
  mainEventUrl?: string | null;
  originalUrl?: string | null;
}

export interface EventDirection {
  direction: {
    name: string;
    slug: string;
  };
}

export interface EventCity {
  name: string;
  region: string;
}

export interface EventTag {
  tag: string;
}

export interface PublicEvent {
  id: string;
  title: string;
  shortDescription?: string | null;
  fullDescription?: string | null;
  startDate: string;
  endDate?: string | null;
  startTime?: string | null;
  format: 'ONLINE' | 'OFFLINE';
  city?: EventCity | null;
  cityName?: string | null;
  address?: string | null;
  venue?: string | null;
  eventUrl?: string | null;
  ticketUrl?: string | null;
  ticketSalesEnabled: boolean;
  speaker?: string | null;
  priceType: 'FREE' | 'PAID';
  priceText?: string | null;
  autoStatus: 'PLANNED' | 'LIVE' | 'COMPLETED';
  mainEvent: boolean;
  images: EventImage[];
  directions: EventDirection[];
  tags?: EventTag[];
}

export interface PublicEventsResponse {
  events: PublicEvent[];
  total: number;
  isFallback: boolean;
}

export interface CalendarMarker {
  date: string;
  planned: number;
  live: number;
  completed: number;
}

export interface DirectionOption {
  id: string;
  name: string;
  slug: string;
}

export interface CityOption {
  id: string;
  name: string;
  region: string;
}

export type EventAutoStatus = 'PLANNED' | 'LIVE' | 'COMPLETED';
export type EventFormat = 'ONLINE' | 'OFFLINE';
export type PriceType = 'FREE' | 'PAID';
