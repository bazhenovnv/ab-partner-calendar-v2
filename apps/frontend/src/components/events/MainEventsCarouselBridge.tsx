import type { PublicEvent } from '@/types/event';
import { MainEventsBanner } from './MainEventsBanner';

interface MainEventsCarouselBridgeProps {
  events: PublicEvent[];
}

/**
 * The public backend endpoint already returns only published `mainEvent=true`
 * records with usable artwork. The legacy carousel performs an additional
 * source-text `#хит` check, which can hide recovered or manually approved
 * main events. Supply the canonical marker in-memory so the visual component
 * receives every event selected by the backend without mutating persisted data.
 */
export function MainEventsCarouselBridge({
  events,
}: MainEventsCarouselBridgeProps) {
  const canonicalEvents = events.map((event) => ({
    ...event,
    fullDescription: event.mainEvent
      ? `${event.fullDescription ?? ''}\n#хит`.trim()
      : event.fullDescription,
  }));

  return <MainEventsBanner events={canonicalEvents} />;
}
