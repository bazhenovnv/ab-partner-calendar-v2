import { NextRequest, NextResponse } from 'next/server';

const BYPASS_PREFIXES = ['/admin', '/maintenance', '/legal', '/_next', '/api', '/favicon.ico'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Bypass maintenance only for the staging domain, never for production.
  // Requires BOTH the env flag (set in docker-compose.staging.yml) AND
  // the correct hostname, so a misconfigured container cannot accidentally
  // disable maintenance on ab-event.pro.
  const host = request.headers.get('host') ?? request.nextUrl.hostname;
  const isStagingHost = host === 'test.ab-event.pro' || host.startsWith('test.ab-event.pro:');
  if (process.env.MAINTENANCE_BYPASS === 'true' && isStagingHost) {
    return NextResponse.next();
  }

  try {
    const backendUrl = process.env.BACKEND_URL ?? 'http://backend:3001';
    // Edge Runtime does not support Next.js Data Cache; plain fetch is used.
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
