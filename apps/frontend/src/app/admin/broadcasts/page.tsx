'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { adminApi, ApiError, type Broadcast, type Paginated } from '@/lib/admin-api';
import { StatusBadge, fmtDate } from '@/components/admin/BroadcastsShared';

export default function BroadcastsListPage() {
  const [data, setData] = useState<Paginated<Broadcast> | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.get<Paginated<Broadcast>>(`/broadcasts?page=${page}&limit=20`);
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'Необходимо войти в систему' : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Удалить рассылку «${title}»?`)) return;
    try {
      await adminApi.del(`/broadcasts/${id}`);
      void load();
    } catch {
      alert('Не удалось удалить');
    }
  }

  async function handleCancel(id: string) {
    if (!confirm('Отменить рассылку?')) return;
    try {
      await adminApi.post(`/broadcasts/${id}/cancel`);
      void load();
    } catch {
      alert('Не удалось отменить');
    }
  }

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div className="adm-page">
      <div className="adm-page__header">
        <h1 className="adm-page__title">Рассылки</h1>
        <Link href="/admin/broadcasts/new" className="adm-btn adm-btn--primary">
          + Создать
        </Link>
      </div>

      {error && <p className="adm-error">{error}</p>}

      {loading && <p className="adm-muted">Загрузка…</p>}

      {!loading && data && data.items.length === 0 && (
        <p className="adm-muted">Рассылок пока нет. Создайте первую.</p>
      )}

      {!loading && data && data.items.length > 0 && (
        <>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Статус</th>
                  <th>Канал</th>
                  <th>Создана</th>
                  <th>Запланирована</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link href={`/admin/broadcasts/${b.id}`} className="adm-link">
                        {b.title}
                      </Link>
                    </td>
                    <td><StatusBadge status={b.status} /></td>
                    <td>{b.channel}</td>
                    <td>{fmtDate(b.createdAt)}</td>
                    <td>{b.scheduledAt ? fmtDate(b.scheduledAt) : '—'}</td>
                    <td className="adm-table__actions">
                      <Link href={`/admin/broadcasts/${b.id}`} className="adm-btn adm-btn--sm">
                        Открыть
                      </Link>
                      {['SCHEDULED', 'QUEUED', 'SENDING'].includes(b.status) && (
                        <button
                          className="adm-btn adm-btn--sm adm-btn--warn"
                          onClick={() => handleCancel(b.id)}
                          type="button"
                        >
                          Отменить
                        </button>
                      )}
                      {['DRAFT', 'CANCELLED', 'FAILED'].includes(b.status) && (
                        <button
                          className="adm-btn adm-btn--sm adm-btn--danger"
                          onClick={() => handleDelete(b.id, b.title)}
                          type="button"
                        >
                          Удалить
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="adm-pagination">
              <button
                className="adm-btn adm-btn--sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                type="button"
              >
                ← Назад
              </button>
              <span className="adm-muted">стр. {page} / {totalPages}</span>
              <button
                className="adm-btn adm-btn--sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                type="button"
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
