'use client';

import { usePathname } from 'next/navigation';
import CookieBanner from './CookieBanner';

const EXCLUDED_PREFIXES = ['/maintenance', '/admin'];

export default function CookieBannerGate() {
  const pathname = usePathname();
  if (EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return null;
  }
  return <CookieBanner />;
}
