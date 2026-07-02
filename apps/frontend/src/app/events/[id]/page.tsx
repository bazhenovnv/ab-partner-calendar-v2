import type { Metadata } from 'next';
import Image from 'next/image';

const HERO_BLUR =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTAwIiBoZWlnaHQ9IjUwNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMEQyMzQ0IiBmaWxsLW9wYWNpdHk9IjAuMDgiLz48L3N2Zz4=';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchEventById } from '@/lib/api';
import { formatEventDate, formatFormat, formatPrice } from '@/lib/format';
import { EventActions } from '@/components/events/EventActions';
import { PublicShell } from '@/components/layout/PublicShell';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ab-event.pro';

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

  return (
    <PublicShell>
      <article className="max-w-[900px] mx-auto px-4 tablet:px-8 py-8 tablet:py-12">
        <nav aria-label="Навигация" className="mb-6">
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

        {heroUrl && (
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-8 shadow-base">
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

        <div className="flex flex-wrap gap-2 mb-4">
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

        <h1 className="font-montserrat font-bold text-primary text-2xl tablet:text-3xl desktop:text-4xl leading-tight mb-4">
          {event.title}
        </h1>

        <dl className="grid grid-cols-1 mobile:grid-cols-2 gap-x-8 gap-y-3 mb-6 text-sm">
          <div className="flex flex-col gap-0.5">
            <dt className="text-primary/40 text-xs uppercase tracking-wide font-medium">Дата</dt>
            <dd className="text-primary font-semibold">
              {formatEventDate(event.startDate, event.endDate)}
              {event.startTime && (
                <span className="font-normal text-primary/70 ml-1">· {event.startTime} МСК</span>
              )}
            </dd>
          </div>

          <div className="flex flex-col gap-0.5">
            <dt className="text-primary/40 text-xs uppercase tracking-wide font-medium">Формат</dt>
            <dd className="text-primary">
              {formatFormat(event.format)}
              {cityLabel && event.format === 'OFFLINE' && (
                <span className="text-primary/60 ml-1">· {cityLabel}</span>
              )}
            </dd>
          </div>

          {event.venue && (
            <div className="flex flex-col gap-0.5">
              <dt className="text-primary/40 text-xs uppercase tracking-wide font-medium">Место</dt>
              <dd className="text-primary">
                {event.venue}
                {event.address && <span className="text-primary/60">, {event.address}</span>}
              </dd>
            </div>
          )}

          <div className="flex flex-col gap-0.5">
            <dt className="text-primary/40 text-xs uppercase tracking-wide font-medium">Стоимость</dt>
            <dd className={event.priceType === 'FREE' ? 'text-selected-day font-semibold' : 'text-primary'}>
              {formatPrice(event.priceType, event.priceText)}
            </dd>
          </div>

          {event.speaker && (
            <div className="flex flex-col gap-0.5">
              <dt className="text-primary/40 text-xs uppercase tracking-wide font-medium">Спикер</dt>
              <dd className="text-primary">{event.speaker}</dd>
            </div>
          )}
        </dl>

        <EventActions event={event} />

        {(event.shortDescription || event.fullDescription) && (
          <div className="mt-8 pt-8 border-t border-dropdown-border">
            {event.fullDescription ? (
              <div
                className="prose prose-slate max-w-none text-primary/80 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: event.fullDescription }}
              />
            ) : (
              <p className="text-primary/80 leading-relaxed text-base">{event.shortDescription}</p>
            )}
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
