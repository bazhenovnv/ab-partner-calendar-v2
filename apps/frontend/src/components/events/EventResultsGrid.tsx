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

        if (cards.length > 0) {
          const rowTops = Array.from(
            new Set(cards.map((card) => Math.round(card.offsetTop))),
          ).sort((left, right) => left - right);
          const firstRowTop = rowTops[0] ?? 0;
          const secondRowTop = rowTops[1];
          const firstRowCards = cards.filter(
            (card) => Math.abs(card.offsetTop - firstRowTop) <= 1,
          );
          const firstRowBottom = Math.max(
            ...firstRowCards.map((card) => card.offsetTop + card.offsetHeight),
          );

          let visibleAreaTop = firstRowTop;
          let visibleAreaBottom = firstRowBottom;

          if (cards.length > 3 && secondRowTop !== undefined) {
            const secondRowCards = cards.filter(
              (card) => Math.abs(card.offsetTop - secondRowTop) <= 1,
            );
            const secondRowBottom = Math.max(
              ...secondRowCards.map((card) => card.offsetTop + card.offsetHeight),
            );

            visibleAreaBottom = secondRowBottom;
          }

          const visibleAreaMiddle = (visibleAreaTop + visibleAreaBottom) / 2;
          const gridTop = grid.getBoundingClientRect().top + window.scrollY;
          const targetTop = Math.max(
            0,
            gridTop + visibleAreaMiddle - window.innerHeight / 2,
          );
          const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

          window.scrollTo({
            top: targetTop,
            behavior: reduceMotion ? 'auto' : 'smooth',
          });
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
          style={{ '--event-card-delay': `${index * 0.2}s` } as CSSProperties}
        >
          <EventCard event={event} />
        </div>
      ))}
    </div>
  );
}
