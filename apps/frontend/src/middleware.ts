import { NextRequest, NextResponse } from 'next/server';

const BYPASS_PREFIXES = ['/admin', '/maintenance', '/legal', '/_next', '/api', '/favicon.ico'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  try {
    const backendUrl = process.env.BACKEND_URL ?? 'http://backend:3001';
    // Edge Runtime does not support Next.js Data Cache; plain fetch is used.
    // To reduce load, consider adding a CDN or in-process TTL cache in a future stage.
    const res = await fetch(`${backendUrl}/api/admin/site-status`, { cache: 'no-store' });
    if (res.ok) {
      const data = (await res.json()) as { maintenanceEnabled: boolean };
      if (data.maintenanceEnabled) {
        return NextResponse.redirect(new URL('/maintenance', request.url));
      }
    }
  } catch {
    // backend unreachable — allow through
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
