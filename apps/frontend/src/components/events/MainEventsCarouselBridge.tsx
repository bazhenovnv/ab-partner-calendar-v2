import type { PublicEvent } from '@/types/event';
import { MainEventsBanner } from './MainEventsBanner';

interface MainEventsCarouselBridgeProps {
  events: PublicEvent[];
}

/**
 * The public backend endpoint already returns only published `mainEvent=true`
 * records with usable artwork. The legacy carousel performs an additional
 * source-text `#хит` check, which can hide recovered or manually approved
 * main events. Supply an invisible HTML-comment marker in-memory so the visual
 * component receives every event selected by the backend without changing
 * persisted data or user-visible modal text.
 */
export function MainEventsCarouselBridge({
  events,
}: MainEventsCarouselBridgeProps) {
  const canonicalEvents = events.map((event) => ({
    ...event,
    fullDescription: event.mainEvent
      ? `${event.fullDescription ?? ''}\n<!-- #хит -->`.trim()
      : event.fullDescription,
  }));

  return <MainEventsBanner events={canonicalEvents} />;
}
