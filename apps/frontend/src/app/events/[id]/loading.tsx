import { PublicShell } from '@/components/layout/PublicShell';

export default function EventLoading() {
  return (
    <PublicShell>
      <article className="max-w-[900px] mx-auto px-4 tablet:px-8 py-6 tablet:py-12 animate-pulse" aria-hidden="true">
        {/* Breadcrumb */}
        <div className="h-4 w-36 bg-primary/10 rounded mb-4" />

        {/* Status badge */}
        <div className="h-6 w-28 bg-primary/10 rounded-full mb-3" />

        {/* Hero image */}
        <div className="aspect-[16/9] rounded-2xl bg-primary/10 mb-5" />

        {/* Tags */}
        <div className="flex gap-2 mb-3">
          <div className="h-6 w-24 bg-primary/10 rounded-full" />
          <div className="h-6 w-20 bg-primary/10 rounded-full" />
        </div>

        {/* Title */}
        <div className="space-y-2 mb-3">
          <div className="h-8 bg-primary/10 rounded w-full" />
          <div className="h-8 bg-primary/10 rounded w-3/4" />
        </div>

        {/* Short description */}
        <div className="h-4 bg-primary/8 rounded w-full mb-1" />
        <div className="h-4 bg-primary/8 rounded w-5/6 mb-5" />

        {/* Info card */}
        <div className="rounded-2xl border border-dropdown-border bg-white overflow-hidden mb-5">
          {/* 3-col grid */}
          <div className="grid grid-cols-3 divide-x divide-dropdown-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 px-3 py-4">
                <div className="w-5 h-5 bg-primary/10 rounded-full" />
                <div className="h-3 w-10 bg-primary/8 rounded" />
                <div className="h-4 w-16 bg-primary/10 rounded" />
              </div>
            ))}
          </div>
          {/* Format row */}
          <div className="flex items-center gap-3 px-4 py-3 border-t border-dropdown-border">
            <div className="w-5 h-5 bg-primary/10 rounded-full" />
            <div className="h-4 w-20 bg-primary/10 rounded" />
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col tablet:flex-row gap-3 mb-6">
          <div className="h-12 w-full tablet:w-44 bg-primary/10 rounded-xl" />
          <div className="h-12 w-full tablet:w-36 bg-primary/10 rounded-xl" />
          <div className="h-9 w-full tablet:w-48 bg-primary/5 rounded-xl" />
        </div>

        {/* Description */}
        <div className="pt-8 border-t border-dropdown-border space-y-3">
          <div className="h-4 bg-primary/8 rounded w-full" />
          <div className="h-4 bg-primary/8 rounded w-5/6" />
          <div className="h-4 bg-primary/8 rounded w-4/5" />
          <div className="h-4 bg-primary/8 rounded w-full" />
          <div className="h-4 bg-primary/8 rounded w-2/3" />
        </div>
      </article>
    </PublicShell>
  );
}
