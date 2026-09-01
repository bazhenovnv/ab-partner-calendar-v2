import type { PublicEvent } from '@/types/event';
import { MainEventsBanner } from './MainEventsBanner';

const MAIN_EVENTS_WINDOW_SIZE = 5;
const MAIN_EVENTS_VISIBLE_RADIUS = 2;

interface MainEventsCarouselBridgeProps {
  events: PublicEvent[];
}

function alignFirstRollingWindow(events: PublicEvent[]): PublicEvent[] {
  if (events.length < MAIN_EVENTS_WINDOW_SIZE) return events;

  // MainEventsBanner renders offsets -2..+2 around position 0. Rotate only
  // the presentation sequence so those five visual slots initially resolve
  // to source events 1..5. Each next step then becomes 2..6, 3..7, etc.;
  // normalizeIndex inside the banner wraps the tail back to event 1.
  return [
    ...events.slice(MAIN_EVENTS_VISIBLE_RADIUS),
    ...events.slice(0, MAIN_EVENTS_VISIBLE_RADIUS),
  ];
}

/**
 * The backend endpoint is the source of truth for public main-event selection.
 * MainEventsBanner still contains two legacy assumptions: a source-text #хит
 * marker and originalUrl-first image resolution. Normalize only the in-memory
 * presentation payload here so persisted event data and the carousel geometry
 * remain untouched while the canonical contract is enforced:
 * - every backend-selected main event reaches the banner;
 * - only the dedicated mainEventUrl can become the rendered poster;
 * - the initial five-card window follows backend order without pre-wrapping
 *   events from the end of the sequence into the first view.
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

  return <MainEventsBanner events={alignFirstRollingWindow(canonicalEvents)} />;
}
