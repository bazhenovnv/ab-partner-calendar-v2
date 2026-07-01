'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, ApiError, type LegalDoc } from '@/lib/admin-api';

const TYPE_LABELS: Record<string, string> = {
  PRIVACY_POLICY: 'Политика конфиденциальности',
  USER_AGREEMENT: 'Пользовательское соглашение',
  PERSONAL_DATA_CONSENT: 'Согласие на обработку ПДн',
  COOKIE_POLICY: 'Политика Cookie и аналитики',
  BROADCAST_CONSENT: 'Согласие на информационные рассылки',
};

const TYPE_SLUGS: Record<string, string> = {
  PRIVACY_POLICY: 'privacy',
  USER_AGREEMENT: 'terms',
  PERSONAL_DATA_CONSENT: 'consent',
  COOKIE_POLICY: 'cookies',
  BROADCAST_CONSENT: 'broadcast-consent',
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function LegalListPage() {
  const [docs, setDocs] = useState<LegalDoc[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.get<LegalDoc[]>('/legal')
      .then(setDocs)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Ошибка загрузки'));
  }, []);

  return (
    <div className="adm-page">
      <div className="adm-page__header">
        <h1 className="adm-page__title">Юридические документы</h1>
      </div>
      <p className="adm-muted">5 документов публичного сайта. Нажмите на документ для редактирования и публикации версий.</p>

      {error && <p className="adm-error">{error}</p>}
      {!docs && !error && <p className="adm-muted">Загрузка…</p>}

      {docs && (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Документ</th>
                <th>Статус</th>
                <th>Опубликован</th>
                <th>Публичная ссылка</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.type}>
                  <td>{TYPE_LABELS[doc.type] ?? doc.type}</td>
                  <td>
                    <span className={`adm-badge adm-badge--${doc.isDraft ? 'gray' : 'green'}`}>
                      {doc.isDraft ? 'Черновик' : 'Опубликован'}
                    </span>
                  </td>
                  <td>{doc.publishedAt ? fmtDate(doc.publishedAt) : '—'}</td>
                  <td>
                    <a
                      href={`/legal/${TYPE_SLUGS[doc.type]}`}
                      className="adm-link"
                      target="_blank"
                      rel="noreferrer"
                    >
                      /legal/{TYPE_SLUGS[doc.type]}
                    </a>
                  </td>
                  <td className="adm-table__actions">
                    <Link href={`/admin/legal/${doc.type}`} className="adm-btn adm-btn--sm">
                      Открыть
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
