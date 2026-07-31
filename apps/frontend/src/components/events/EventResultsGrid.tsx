'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import type { PublicEvent } from '@/types/event';
import { EventCard } from './EventCard';
import styles from './event-results-grid.module.css';

interface EventResultsGridProps {
  events: PublicEvent[];
  centerBetweenRows: boolean;
  onCenterComplete: () => void;
}

export function EventResultsGrid({
  events,
  centerBetweenRows,
  onCenterComplete,
}: EventResultsGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!centerBetweenRows) return;

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const grid = gridRef.current;
        if (!grid) {
          onCenterComplete();
          return;
        }

        const cards = Array.from(grid.children).filter(
          (child): child is HTMLElement => child instanceof HTMLElement,
        );

        if (cards.length > 3) {
          const firstRowTop = cards[0]?.offsetTop ?? 0;
          const secondRowFirst = cards.find((card) => card.offsetTop > firstRowTop + 1);

          if (secondRowFirst) {
            const firstRowBottom = Math.max(
              ...cards
                .filter((card) => Math.abs(card.offsetTop - firstRowTop) <= 1)
                .map((card) => card.offsetTop + card.offsetHeight),
            );
            const rowsMiddle = (firstRowBottom + secondRowFirst.offsetTop) / 2;
            const gridTop = grid.getBoundingClientRect().top + window.scrollY;
            const targetTop = Math.max(0, gridTop + rowsMiddle - window.innerHeight / 2);
            const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            window.scrollTo({
              top: targetTop,
              behavior: reduceMotion ? 'auto' : 'smooth',
            });
          }
        }

        onCenterComplete();
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [centerBetweenRows, onCenterComplete]);

  return (
    <div
      ref={gridRef}
      className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-[53px]"
    >
      {events.map((event, index) => (
        <div
          key={event.id}
          className={styles.cardReveal}
          style={{ '--event-card-delay': `${index * 0.5}s` } as CSSProperties}
        >
          <EventCard event={event} />
        </div>
      ))}
    </div>
  );
}
