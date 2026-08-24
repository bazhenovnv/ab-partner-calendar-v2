import type { PublicEvent } from '@/types/event';
import { MainEventsBanner } from './MainEventsBanner';

interface MainEventsCarouselBridgeProps {
  events: PublicEvent[];
}

/**
 * The backend endpoint is the source of truth for public main-event selection.
 * MainEventsBanner still contains two legacy assumptions: a source-text #хит
 * marker and originalUrl-first image resolution. Normalize only the in-memory
 * presentation payload here so persisted event data and the carousel geometry
 * remain untouched while the canonical contract is enforced:
 * - every backend-selected main event reaches the banner;
 * - only the dedicated mainEventUrl can become the rendered poster.
 */
export function MainEventsCarouselBridge({
  events,
}: MainEventsCarouselBridgeProps) {
  const canonicalEvents = events
    .filter((event) => Boolean(event.images?.[0]?.mainEventUrl?.trim()))
    .map((event) => ({
      ...event,
      fullDescription: event.mainEvent
        ? `${event.fullDescription ?? ''}\n<!-- #хит -->`.trim()
        : event.fullDescription,
      images: event.images?.map((image, index) =>
        index === 0
          ? {
              ...image,
              // MainEventsBanner resolves originalUrl first. Point that legacy
              // slot at the approved dedicated cover instead of allowing a
              // fallback to the source image.
              originalUrl: image.mainEventUrl?.trim() || null,
            }
          : image,
      ),
    }));

  return <MainEventsBanner events={canonicalEvents} />;
}
