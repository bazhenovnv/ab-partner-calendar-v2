import Link from 'next/link';
import { PublicShell } from '@/components/layout/PublicShell';

export default function EventNotFound() {
  return (
    <PublicShell>
      <div className="max-w-[900px] mx-auto px-4 tablet:px-8 py-20 text-center">
        <p className="font-montserrat font-bold text-primary text-2xl mb-3">
          Мероприятие не найдено
        </p>
        <p className="text-primary/60 text-sm mb-8">
          Возможно, оно было удалено или ещё не опубликовано.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-xl text-sm hover:bg-primary/90 transition-colors"
        >
          На главную
        </Link>
      </div>
    </PublicShell>
  );
}
