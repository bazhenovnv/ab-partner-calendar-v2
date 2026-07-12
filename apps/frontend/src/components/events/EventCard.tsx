import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatEventDateParts, formatFormat, formatPrice } from '@/lib/format';
import type { PublicEvent } from '@/types/event';

const CARD_BLUR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIyNSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMEQyMzQ0IiBmaWxsLW9wYWNpdHk9IjAuMDUiLz48L3N2Zz4=';

interface EventCardProps {
  event: PublicEvent;
  className?: string;
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  LIVE: { label: 'Идёт сейчас', className: 'bg-live-status text-primary' },
  COMPLETED: { label: 'Завершено', className: 'bg-completed-status text-white' },
  PLANNED: { label: '', className: '' },
};

export function EventCard({ event, className }: EventCardProps) {
  const image = event.images?.[0];
  const imgUrl = image?.eventCardUrl ?? image?.thumbnailUrl ?? image?.originalUrl;
  const cityLabel = event.city?.name ?? event.cityName;
  const dateParts = formatEventDateParts(event.startDate);
  const status = STATUS_LABEL[event.autoStatus];

  return (
    <Link
      href={`/events/${event.id}`}
      className={cn(
        'group block rounded-2xl overflow-hidden bg-white shadow-base',
        'border border-dropdown-border hover:border-primary/20',
        'transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] active:shadow-base',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2',
        className,
      )}
      aria-label={`Перейти к мероприятию: ${event.title}`}
    >
      <div className="relative aspect-[16/9] bg-primary/5 overflow-hidden">
        {imgUrl ? (
          <Image
            src={imgUrl}
            alt={event.title}
            fill
            loading="lazy"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            placeholder="blur"
            blurDataURL={CARD_BLUR_PLACEHOLDER}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-primary/20 text-4xl font-bold">АБ</span>
          </div>
        )}

        {/* Status badge — top left */}
        {status.label && (
          <span
            className={cn(
              'absolute top-3 left-3 text-xs font-gilroy font-medium px-2 py-1 rounded-full',
              status.className,
            )}
          >
            {status.label}
          </span>
        )}

        {/* Date badge — bottom left overlay */}
        <div className="absolute bottom-3 left-3 bg-white rounded-xl shadow-sm flex flex-col items-center justify-center w-[56px] py-1.5 leading-none">
          <span className="font-montserrat font-bold text-primary text-2xl leading-none">{dateParts.day}</span>
          <span className="font-montserrat font-bold text-primary text-[11px] leading-none mt-0.5 lowercase">{dateParts.month}</span>
        </div>
      </div>

      <div className="p-4 tablet:p-5 flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5">
          {event.directions.slice(0, 2).map((d) => (
            <span
              key={d.direction.slug}
              className="text-xs text-mint bg-primary/5 px-2 py-0.5 rounded-full"
            >
              {d.direction.name}
            </span>
          ))}
          <span className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            event.format === 'ONLINE'
              ? 'bg-mint/10 text-selected-day'
              : 'bg-primary/8 text-primary/70',
          )}>
            {formatFormat(event.format)}
          </span>
          {cityLabel && event.format === 'OFFLINE' && (
            <span className="text-xs bg-primary/5 text-primary/60 px-2 py-0.5 rounded-full">{cityLabel}</span>
          )}
        </div>

        <h3 className="font-montserrat font-semibold text-primary text-sm tablet:text-base leading-snug line-clamp-2 group-hover:text-selected-day transition-colors">
          {event.title}
        </h3>

        {event.shortDescription && (
          <p className="text-sm text-primary/60 line-clamp-2 leading-relaxed">
            {event.shortDescription}
          </p>
        )}

        <div className="mt-auto pt-2 flex items-center justify-between border-t border-dropdown-border">
          <span className={cn(
            'text-xs font-semibold',
            event.priceType === 'FREE' ? 'text-selected-day' : 'text-primary/70',
          )}>
            {formatPrice(event.priceType, event.priceText)}
          </span>
          <span className="text-xs font-semibold text-selected-day group-hover:underline">
            Подробнее →
          </span>
        </div>
      </div>
    </Link>
  );
}
