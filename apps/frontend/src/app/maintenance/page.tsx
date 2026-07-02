import type { Metadata } from 'next';

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
    description: 'Сайт временно недоступен. Пожалуйста, зайдите позже.',
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
    <div className="maint-page">
      {status.imageUrl && (
        <img src={status.imageUrl} alt="" className="maint-image" />
      )}
      <h1 className="maint-title">{status.title}</h1>
      <p className="maint-description">{status.description}</p>
    </div>
  );
}
