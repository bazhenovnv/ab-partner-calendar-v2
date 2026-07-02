import { PublicShell } from '@/components/layout/PublicShell';

export default function EventLoading() {
  return (
    <PublicShell>
      <article className="max-w-[900px] mx-auto px-4 tablet:px-8 py-8 tablet:py-12 animate-pulse" aria-hidden="true">
        {/* Breadcrumb */}
        <div className="h-4 w-36 bg-primary/10 rounded mb-6" />

        {/* Hero image */}
        <div className="aspect-[16/9] rounded-2xl bg-primary/10 mb-8" />

        {/* Tags */}
        <div className="flex gap-2 mb-4">
          <div className="h-6 w-24 bg-primary/10 rounded-full" />
          <div className="h-6 w-20 bg-primary/10 rounded-full" />
        </div>

        {/* Title */}
        <div className="space-y-3 mb-6">
          <div className="h-8 bg-primary/10 rounded w-full" />
          <div className="h-8 bg-primary/10 rounded w-3/4" />
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="h-3 w-16 bg-primary/8 rounded" />
              <div className="h-5 w-28 bg-primary/10 rounded" />
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-8">
          <div className="h-10 w-44 bg-primary/10 rounded-xl" />
          <div className="h-10 w-36 bg-primary/10 rounded-xl" />
          <div className="h-10 w-10 bg-primary/10 rounded-xl" />
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
