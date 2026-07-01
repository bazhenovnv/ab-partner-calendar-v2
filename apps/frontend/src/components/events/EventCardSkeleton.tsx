export function EventCardSkeleton() {
  return (
    <div
      className="rounded-2xl overflow-hidden bg-white shadow-base border border-dropdown-border animate-pulse"
      aria-hidden="true"
    >
      <div className="aspect-[16/9] bg-primary/10" />
      <div className="p-4 tablet:p-5 flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="h-5 w-20 bg-primary/10 rounded-full" />
          <div className="h-5 w-16 bg-primary/10 rounded-full" />
        </div>
        <div className="space-y-2">
          <div className="h-5 bg-primary/10 rounded w-full" />
          <div className="h-5 bg-primary/10 rounded w-4/5" />
        </div>
        <div className="h-4 bg-primary/5 rounded w-3/5 mt-1" />
        <div className="pt-2 border-t border-dropdown-border flex gap-3">
          <div className="h-4 bg-primary/10 rounded w-24" />
          <div className="h-4 bg-primary/10 rounded w-12" />
          <div className="h-4 bg-primary/10 rounded w-14 ml-auto" />
        </div>
      </div>
    </div>
  );
}

export function EventGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}
