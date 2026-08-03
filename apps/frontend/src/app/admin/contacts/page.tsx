'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi, ApiError } from '@/lib/admin-api';

interface BotContact {
  id: string;
  channel: 'TELEGRAM' | 'MAX';
  externalId: string;
  username: string | null;
  firstName: string | null;
  phone: string | null;
  phoneVerifiedAt: string | null;
  allowMarketingMessages: boolean;
  allowServiceNotifications: boolean;
  legalAcceptedAt: string;
  broadcastConsentAcceptedAt: string | null;
  lastActivityAt: string;
  subscribedAt: string;
  createdAt: string;
}

interface ContactsResponse {
  items: BotContact[];
  total: number;
  page: number;
  limit: number;
  summary: {
    telegram: number;
    max: number;
    marketingAllowed: number;
    withPhone: number;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Moscow',
  }).format(new Date(value));
}

export default function BotContactsPage() {
  const [data, setData] = useState<ContactsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminApi.get<ContactsResponse>(`/bots/contacts?page=${page}&limit=50`);
      setData(response);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError && requestError.status === 401
          ? 'Необходимо войти в систему.'
          : 'Не удалось загрузить контакты пользователей.',
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function exportCsv() {
    setExporting(true);
    setError('');
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_BASE}/bots/contacts/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'ab-afisha-bot-contacts.csv';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Не удалось выгрузить контакты в CSV.');
    } finally {
      setExporting(false);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="adm-page">
      <div className="adm-page__header">
        <div>
          <h1 className="adm-page__title">Контакты пользователей ботов</h1>
          <p className="adm-muted">
            В список входят только пользователи, которые нажали «Принять» и подтвердили юридические документы.
          </p>
        </div>
        <button
          className="adm-btn adm-btn--primary"
          type="button"
          onClick={exportCsv}
          disabled={exporting || !data?.total}
        >
          {exporting ? 'Формируем…' : 'Выгрузить CSV'}
        </button>
      </div>

      {error && <p className="adm-error">{error}</p>}
      {loading && <p className="adm-muted">Загрузка…</p>}

      {!loading && data && (
        <>
          <div className="adm-dashboard-stats">
            <div className="adm-stat">
              <span className="adm-stat__label">Всего принявших</span>
              <strong className="adm-stat__val">{data.total}</strong>
            </div>
            <div className="adm-stat">
              <span className="adm-stat__label">Telegram</span>
              <strong className="adm-stat__val">{data.summary.telegram}</strong>
            </div>
            <div className="adm-stat">
              <span className="adm-stat__label">MAX</span>
              <strong className="adm-stat__val">{data.summary.max}</strong>
            </div>
            <div className="adm-stat">
              <span className="adm-stat__label">Доступны для рассылки</span>
              <strong className="adm-stat__val">{data.summary.marketingAllowed}</strong>
            </div>
            <div className="adm-stat">
              <span className="adm-stat__label">С телефоном</span>
              <strong className="adm-stat__val">{data.summary.withPhone}</strong>
            </div>
          </div>

          {data.items.length === 0 ? (
            <p className="adm-muted">Пользователей, принявших документы, пока нет.</p>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Канал</th>
                    <th>Пользователь</th>
                    <th>Телефон</th>
                    <th>Документы приняты</th>
                    <th>Рассылка</th>
                    <th>Последняя активность</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((contact) => (
                    <tr key={contact.id}>
                      <td>{contact.channel === 'TELEGRAM' ? 'Telegram' : 'MAX'}</td>
                      <td>
                        <strong>{contact.firstName || 'Без имени'}</strong>
                        <div className="adm-muted">
                          {contact.username ? `@${contact.username}` : `ID: ${contact.externalId}`}
                        </div>
                      </td>
                      <td>{contact.phone ?? '—'}</td>
                      <td>{formatDate(contact.legalAcceptedAt)}</td>
                      <td>
                        {contact.allowMarketingMessages && contact.broadcastConsentAcceptedAt
                          ? 'Разрешена'
                          : 'Не разрешена'}
                      </td>
                      <td>{formatDate(contact.lastActivityAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="adm-pagination">
              <button
                className="adm-btn adm-btn--sm"
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                ← Назад
              </button>
              <span className="adm-muted">стр. {page} / {totalPages}</span>
              <button
                className="adm-btn adm-btn--sm"
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Вперёд →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
