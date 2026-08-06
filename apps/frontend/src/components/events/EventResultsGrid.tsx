'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import type { PublicEvent } from '@/types/event';
import { EventCard } from './EventCard';
import styles from './event-results-grid.module.css';

interface EventResultsGridProps {
  events: PublicEvent[];
  scrollAfterDateSelect: boolean;
  onScrollComplete: () => void;
}

const CARD_REVEAL_STEP_MS = 200;
const CARD_REVEAL_DURATION_MS = 320;

export function EventResultsGrid({
  events,
  scrollAfterDateSelect,
  onScrollComplete,
}: EventResultsGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollAfterDateSelect) return;

    const lastCardDelay = Math.max(0, events.length - 1) * CARD_REVEAL_STEP_MS;
    const scrollDelay = lastCardDelay + CARD_REVEAL_DURATION_MS + 50;

    const timer = window.setTimeout(() => {
      const grid = gridRef.current;
      if (!grid) {
        onScrollComplete();
        return;
      }

      const cards = Array.from(grid.children).filter(
        (child): child is HTMLElement => child instanceof HTMLElement,
      );
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (cards.length > 3) {
        const cardRects = cards.map((card) => card.getBoundingClientRect());
        const firstRowTop = Math.min(...cardRects.map((rect) => rect.top));
        const secondRowTop = Math.min(
          ...cardRects
            .filter((rect) => rect.top > firstRowTop + 2)
            .map((rect) => rect.top),
        );

        if (Number.isFinite(secondRowTop)) {
          const secondRowBottom = Math.max(
            ...cardRects
              .filter((rect) => Math.abs(rect.top - secondRowTop) <= 2)
              .map((rect) => rect.bottom),
          );
          const targetTop = Math.max(
            0,
            window.scrollY + secondRowBottom - window.innerHeight,
          );

          window.scrollTo({
            top: targetTop,
            behavior: reduceMotion ? 'auto' : 'smooth',
          });
        }
      } else {
        const target =
          document.querySelector<HTMLElement>('.pub-events-date-heading') ??
          grid;

        target.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'center',
        });
      }

      onScrollComplete();
    }, scrollDelay);

    return () => window.clearTimeout(timer);
  }, [events, onScrollComplete, scrollAfterDateSelect]);

  return (
    <div
      ref={gridRef}
      data-event-results-grid
      className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-[53px]"
    >
      {events.map((event, index) => (
        <div
          key={event.id}
          className={styles.cardReveal}
          data-event-card-reveal
          style={{
            '--event-card-delay': `${index * CARD_REVEAL_STEP_MS}ms`,
          } as CSSProperties}
        >
          <EventCard event={event} />
        </div>
      ))}
    </div>
  );
}
