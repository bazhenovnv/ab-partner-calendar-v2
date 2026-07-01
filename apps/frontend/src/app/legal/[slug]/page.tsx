import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SLUG_TO_TYPE, FALLBACK_CONTENT, fetchLegalDoc, LEGAL_LINKS } from '@/lib/legal';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return Object.keys(SLUG_TO_TYPE).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const type = SLUG_TO_TYPE[slug];
  if (!type) return {};
  const fallback = FALLBACK_CONTENT[type];
  return {
    title: fallback.title,
    robots: { index: true, follow: true },
  };
}

export default async function LegalPage({ params }: Props) {
  const { slug } = await params;
  const type = SLUG_TO_TYPE[slug];
  if (!type) notFound();

  const doc = await fetchLegalDoc(type);
  const fallback = FALLBACK_CONTENT[type];
  const title = doc?.title ?? fallback.title;
  const content = doc?.content ?? fallback.content;
  const publishedAt = doc?.publishedAt ?? null;

  return (
    <div className="legal-page">
      <header className="legal-header">
        <Link href="/" className="legal-back" aria-label="На главную">
          ← На главную
        </Link>
      </header>

      <main className="legal-main">
        <article className="legal-article">
          <h1 className="legal-title">{title}</h1>

          {publishedAt && (
            <p className="legal-meta">
              Дата публикации:{' '}
              {new Date(publishedAt).toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          )}

          <div
            className="legal-content"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </article>
      </main>

      <footer className="legal-footer">
        <nav aria-label="Юридические документы">
          <ul className="legal-footer-links">
            {LEGAL_LINKS.map((link) => (
              <li key={link.type}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="legal-footer-copy">
          © {new Date().getFullYear()} ООО «АБ ГРУПП». Все права защищены.
        </p>
      </footer>
    </div>
  );
}
