'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { ym } from '@/lib/metrika';
import { trackVisit } from '@/lib/internal-analytics';

export function MetrikaPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirst = useRef(true);

  useEffect(() => {
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    trackVisit(url);

    // Yandex Metrika init already fires the first pageview on full load.
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    ym.hit(url);
  }, [pathname, searchParams]);

  return null;
}
