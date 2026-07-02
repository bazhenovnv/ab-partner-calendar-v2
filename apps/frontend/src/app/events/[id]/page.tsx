import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchEventById } from '@/lib/api';
import { formatEventDate, formatFormat, formatPrice } from '@/lib/format';
import { EventDetailActions } from '@/components/events/EventDetailActions';
import { PublicShell } from '@/components/layout/PublicShell';

const HERO_BLUR =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTAwIiBoZWlnaHQ9IjUwNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMEQyMzQ0IiBmaWxsLW9wYWNpdHk9IjAuMDgiLz48L3N2Zz4=';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ab-event.pro';

const STATUS_CONFIG = {
  LIVE: { label: 'Идёт сейчас', className: 'bg-live-status text-primary' },
  PLANNED: { label: 'Запланировано', className: 'bg-mint/15 text-selected-day' },
  COMPLETED: { label: 'Завершено', className: 'bg-primary/8 text-primary/50' },
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { id } = await params;
    const event = await fetchEventById(id);
    const image = event.images?.[0];
    const ogImage =
      image?.mainEventUrl ?? image?.eventCardUrl ?? image?.originalUrl ?? undefined;
    const canonical = `${SITE_URL}/events/${id}`;
    return {
      title: event.title,
      description: event.shortDescription ?? undefined,
      alternates: { canonical },
      openGraph: {
        title: event.title,
        description: event.shortDescription ?? undefined,
        url: canonical,
        type: 'article',
        locale: 'ru_RU',
        siteName: 'АБ Афиша Бухгалтера',
        ...(ogImage ? { images: [{ url: ogImage, alt: event.title }] } : {}),
      },
    };
  } catch {
    return { title: 'Мероприятие', robots: { index: false } };
  }
}

export default async function EventPage({ params }: Props) {
  const { id } = await params;

  let event;
  try {
    event = await fetchEventById(id);
  } catch {
    notFound();
  }

  const image = event.images?.[0];
  const heroUrl = image?.originalUrl ?? image?.mainEventUrl ?? image?.eventCardUrl;
  const cityLabel = event.city?.name ?? event.cityName;
  const statusCfg = STATUS_CONFIG[event.autoStatus];

  return (
    <PublicShell>
      <article className="max-w-[900px] mx-auto px-4 tablet:px-8 py-6 tablet:py-12">
        <nav aria-label="Навигация" className="mb-4 tablet:mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-primary/60 hover:text-primary transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Все мероприятия
          </Link>
        </nav>

        {/* Status badge */}
        {statusCfg.label && (
          <div className="mb-3">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${statusCfg.className}`}
            >
              {event.autoStatus === 'LIVE' && (
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" aria-hidden="true" />
              )}
              {statusCfg.label}
            </span>
          </div>
        )}

        {/* Hero image */}
        {heroUrl && (
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-5 shadow-base">
            <Image
              src={heroUrl}
              alt={event.title}
              fill
              priority
              sizes="(max-width: 900px) 100vw, 900px"
              className="object-cover"
              placeholder="blur"
              blurDataURL={HERO_BLUR}
            />
          </div>
        )}

        {/* Direction & tag chips */}
        <div className="flex flex-wrap gap-2 mb-3">
          {event.directions.map((d) => (
            <span
              key={d.direction.slug}
              className="text-xs bg-mint/10 text-selected-day px-3 py-1 rounded-full font-medium"
            >
              {d.direction.name}
            </span>
          ))}
          {event.tags?.map((t) => (
            <span key={t.tag} className="text-xs bg-primary/5 text-primary/60 px-3 py-1 rounded-full">
              {t.tag}
            </span>
          ))}
        </div>

        {/* Title */}
        <h1 className="font-montserrat font-bold text-primary text-2xl tablet:text-3xl desktop:text-4xl leading-tight mb-3">
          {event.title}
        </h1>

        {/* Short description (shown before meta card on mobile) */}
        {event.shortDescription && (
          <p className="text-sm text-primary/70 leading-relaxed mb-5">
            {event.shortDescription}
          </p>
        )}

        {/* Info card */}
        <div className="rounded-2xl border border-dropdown-border bg-white shadow-sm mb-5 overflow-hidden">
          {/* 3-column: date / time / price */}
          <div className="grid grid-cols-3 divide-x divide-dropdown-border">
            {/* Date */}
            <div className="flex flex-col items-center justify-center gap-1 px-3 py-4 text-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="text-mint shrink-0">
                <rect x="2" y="4" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M2 8h16" stroke="currentColor" strokeWidth="1.4" />
                <path d="M6 2v3M14 2v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <span className="text-primary/40 text-[10px] uppercase tracking-wide font-medium leading-none">Дата</span>
              <span className="text-primary font-semibold text-xs leading-snug">
                {formatEventDate(event.startDate, event.endDate)}
              </span>
            </div>

            {/* Time */}
            <div className="flex flex-col items-center justify-center gap-1 px-3 py-4 text-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="text-mint shrink-0">
                <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M10 6v4.5l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-primary/40 text-[10px] uppercase tracking-wide font-medium leading-none">Время</span>
              <span className="text-primary font-semibold text-xs leading-snug">
                {event.startTime ? `${event.startTime} МСК` : '—'}
              </span>
            </div>

            {/* Price */}
            <div className="flex flex-col items-center justify-center gap-1 px-3 py-4 text-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="text-mint shrink-0">
                <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M10 6v1M10 13v1M7.5 11.5c0 .83.67 1.5 2.5 1.5s2.5-.67 2.5-1.5S11.83 10 10 10s-2.5-.67-2.5-1.5S8.17 7 10 7s2.5.67 2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <span className="text-primary/40 text-[10px] uppercase tracking-wide font-medium leading-none">Стоимость</span>
              <span className={`font-semibold text-xs leading-snug ${event.priceType === 'FREE' ? 'text-selected-day' : 'text-primary'}`}>
                {formatPrice(event.priceType, event.priceText)}
              </span>
            </div>
          </div>

          {/* Format row */}
          <div className="flex items-center gap-3 px-4 py-3 border-t border-dropdown-border">
            {event.format === 'ONLINE' ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="text-mint shrink-0">
                <path d="M9 2a7 7 0 1 0 0 14A7 7 0 0 0 9 2Z" stroke="currentColor" strokeWidth="1.4" />
                <path d="M2 9h14M9 2c-2 2-3 4.3-3 7s1 5 3 7M9 2c2 2 3 4.3 3 7s-1 5-3 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="text-mint shrink-0">
                <path d="M9 2C6.24 2 4 4.24 4 7c0 4.25 5 9 5 9s5-4.75 5-9c0-2.76-2.24-5-5-5Z" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="9" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            )}
            <span className="text-sm text-primary font-medium">{formatFormat(event.format)}</span>
            {cityLabel && event.format === 'OFFLINE' && (
              <span className="text-sm text-primary/60">{cityLabel}</span>
            )}
          </div>

          {/* Address row (offline only) */}
          {event.format === 'OFFLINE' && (event.venue || event.address) && (
            <div className="flex items-start gap-3 px-4 py-3 border-t border-dropdown-border">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="text-primary/40 shrink-0 mt-0.5">
                <path d="M9 2C6.24 2 4 4.24 4 7c0 4.25 5 9 5 9s5-4.75 5-9c0-2.76-2.24-5-5-5Z" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="9" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.3" />
              </svg>
              <span className="text-sm text-primary/70 leading-snug">
                {event.venue}
                {event.venue && event.address && <span className="text-primary/50">, </span>}
                {event.address}
              </span>
            </div>
          )}

          {/* Speaker row */}
          {event.speaker && (
            <div className="flex items-center gap-3 px-4 py-3 border-t border-dropdown-border">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="text-primary/40 shrink-0">
                <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.4" />
                <path d="M3 15c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <span className="text-sm text-primary">{event.speaker}</span>
            </div>
          )}
        </div>

        {/* CTA buttons */}
        <EventDetailActions event={event} />

        {/* Full description */}
        {event.fullDescription && (
          <div className="mt-8 pt-8 border-t border-dropdown-border">
            <div
              className="prose prose-slate max-w-none text-primary/80 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: event.fullDescription }}
            />
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-dropdown-border">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-primary/60 hover:text-primary transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Смотреть все мероприятия
          </Link>
        </div>
      </article>
    </PublicShell>
  );
}
