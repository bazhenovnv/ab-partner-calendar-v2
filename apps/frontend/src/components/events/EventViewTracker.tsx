'use client';

import { useEffect } from 'react';
import { ym } from '@/lib/metrika';
import { trackEventAction } from '@/lib/internal-analytics';

interface EventViewTrackerProps {
  eventId: string;
}

export function EventViewTracker({ eventId }: EventViewTrackerProps) {
  useEffect(() => {
    ym.goal('event_view', { event_id: eventId });
    trackEventAction(eventId, 'view');
  }, [eventId]);

  return null;
}
