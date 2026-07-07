import type { Metadata } from 'next';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

interface SiteStatus {
  maintenanceEnabled: boolean;
  title: string;
  description: string;
  imageUrl: string;
}

async function getSiteStatus(): Promise<SiteStatus> {
  try {
    const backendUrl = process.env.BACKEND_URL ?? 'http://backend:3001';
    const res = await fetch(`${backendUrl}/api/admin/site-status`, { cache: 'no-store' });
    if (res.ok) return res.json() as Promise<SiteStatus>;
  } catch {}
  return {
    maintenanceEnabled: true,
    title: 'Технические работы',
    description: 'Мы проводим технические работы для улучшения сервиса. Совсем скоро всё снова будет доступно.',
    imageUrl: '',
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const status = await getSiteStatus();
  return { title: status.title, robots: { index: false, follow: false } };
}

export default async function MaintenancePage() {
  const status = await getSiteStatus();

  return (
    <div className="maint-root">
      <div className="maint-card">
        <div className="maint-img-wrap">
          {status.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={status.imageUrl} alt="" className="maint-custom-img" width={200} height={200} />
          ) : (
            <Image
              src="/maintenance.png"
              alt=""
              width={200}
              height={200}
              className="maint-default-img"
              priority
            />
          )}
        </div>
        <div className="maint-badge">Технические работы</div>
        <h1 className="maint-heading">{status.title}</h1>
        <p className="maint-body">{status.description}</p>
        <div className="maint-divider" aria-hidden="true" />
        <p className="maint-hint">Спасибо за понимание! Мы делаем всё, чтобы сервис стал ещё удобнее для вас.</p>
        <a href="https://t.me/ab_afisha_buh" target="_blank" rel="noopener noreferrer" className="maint-tg-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.1 13.771 4.16 12.87c-.635-.197-.648-.635.136-.937l11.083-4.274c.53-.194.994.13.515.562z" />
          </svg>
          Следить в Telegram
        </a>
      </div>
    </div>
  );
}
