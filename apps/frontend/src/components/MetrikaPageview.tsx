'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { ym } from '@/lib/metrika';

export function MetrikaPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirst = useRef(true);

  useEffect(() => {
    // Skip the very first render — init already fires a pageview on load
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    ym.hit(url);
  }, [pathname, searchParams]);

  return null;
}
