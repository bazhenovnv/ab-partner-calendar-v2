import Link from 'next/link';
import { LEGAL_LINKS } from '@/lib/legal';

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'info-event@a-b.ru';

export function SiteFooter() {
  return (
    <footer className="bg-[#071729] mt-auto" aria-label="Подвал сайта">
      <div className="max-w-[1440px] mx-auto px-4 tablet:px-8 py-6 tablet:py-8">
        <div className="flex flex-col tablet:flex-row tablet:items-center tablet:justify-between gap-4">
          <nav
            aria-label="Юридические документы"
            className="flex flex-wrap gap-x-4 gap-y-2"
          >
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.type}
                href={link.href}
                className="text-mint/70 text-xs hover:text-mint transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-white/40 text-xs hover:text-white/70 transition-colors shrink-0"
          >
            {CONTACT_EMAIL}
          </a>
        </div>
        <p className="mt-4 text-white/25 text-xs">
          © {new Date().getFullYear()} АБ Афиша Бухгалтера
        </p>
      </div>
    </footer>
  );
}
