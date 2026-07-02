import { PublicShell } from '@/components/layout/PublicShell';
import { EventGridSkeleton } from '@/components/events/EventCardSkeleton';

export default function HomeLoading() {
  return (
    <PublicShell>
      {/* Hero skeleton */}
      <div className="relative w-full bg-primary/10 animate-pulse" aria-hidden="true">
        <div className="aspect-[21/9] max-h-[520px] min-h-[280px] tablet:min-h-[360px]" />
      </div>

      <div className="max-w-[1440px] mx-auto px-4 tablet:px-8 py-8 tablet:py-12">
        <div className="flex flex-col desktop:flex-row gap-8">
          {/* Calendar skeleton */}
          <aside className="desktop:w-[320px] shrink-0">
            <div className="bg-white rounded-2xl shadow-base border border-dropdown-border p-4 tablet:p-5 animate-pulse" aria-hidden="true">
              <div className="flex items-center justify-between mb-4">
                <div className="h-5 w-8 bg-primary/10 rounded" />
                <div className="h-5 w-28 bg-primary/10 rounded" />
                <div className="h-5 w-8 bg-primary/10 rounded" />
              </div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="h-4 bg-primary/5 rounded" />
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-primary/5 rounded-lg" />
                ))}
              </div>
            </div>
          </aside>

          {/* Events grid skeleton */}
          <div className="flex-1 min-w-0">
            <div className="h-8 w-48 bg-primary/10 rounded animate-pulse mb-4" aria-hidden="true" />
            <div className="flex gap-3 mb-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-9 w-28 bg-primary/10 rounded-lg animate-pulse" aria-hidden="true" />
              ))}
            </div>
            <EventGridSkeleton count={6} />
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
