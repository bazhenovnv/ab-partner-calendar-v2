'use client';

import { useEffect } from 'react';
import { ym } from '@/lib/metrika';

interface EventViewTrackerProps {
  eventId: string;
}

export function EventViewTracker({ eventId }: EventViewTrackerProps) {
  useEffect(() => {
    ym.goal('event_view', { event_id: eventId });
  }, [eventId]);

  return null;
}
