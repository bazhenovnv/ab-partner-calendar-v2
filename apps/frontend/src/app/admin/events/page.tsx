'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { adminApi, ApiError, type AdminEvent, type AdminEventsResponse, type EventStatus } from '@/lib/admin-api';

const STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: 'Черновик',
  PUBLISHED: 'Опубликовано',
  HIDDEN: 'Скрыто',
  ARCHIVE: 'Архив',
  NEEDS_ATTENTION: 'Требует внимания',
  DELETED: 'Удалено',
};

const STATUS_BADGE: Record<EventStatus, string> = {
  DRAFT: 'adm-badge adm-badge--gray',
  PUBLISHED: 'adm-badge adm-badge--green',
  HIDDEN: 'adm-badge adm-badge--orange',
  ARCHIVE: 'adm-badge adm-badge--gray',
  NEEDS_ATTENTION: 'adm-badge adm-badge--red',
  DELETED: 'adm-badge adm-badge--red',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function EventsListPage() {
  const [data, setData] = useState<AdminEventsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [format, setFormat] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attentionCount, setAttentionCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (format) params.set('format', format);
      if (city) params.set('city', city);
      const res = await adminApi.get<AdminEventsResponse>(`/events/admin?${params}`);
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'Необходимо войти в систему' : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, format, city]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    adminApi.get<{ events: unknown[] }>('/events/admin/needs-attention')
      .then((res) => setAttentionCount(res.events.length))
      .catch(() => undefined);
  }, []);

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPage(1);
    void load();
  }

  async function handleArchive(id: string, title: string) {
    if (!confirm(`Архивировать мероприятие «${title}»?`)) return;
    try {
      await adminApi.patch(`/events/admin/${id}/archive`, {});
      void load();
    } catch {
      alert('Не удалось архивировать');
    }
  }

  async function handlePublish(id: string) {
    try {
      await adminApi.patch(`/events/admin/${id}/publish`, {});
      void load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Не удалось опубликовать');
    }
  }

  const LIMIT = 20;
  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  return (
    <div className="adm-page">
      <div className="adm-page__header">
        <h1 className="adm-page__title">Мероприятия</h1>
        <Link href="/admin/events/new" className="adm-btn adm-btn--primary">
          + Создать
        </Link>
      </div>

      {/* Quick-filter tabs */}
      <div className="adm-tabs" role="tablist" aria-label="Фильтр мероприятий">
        <button
          role="tab"
          type="button"
          aria-selected={status !== 'NEEDS_ATTENTION'}
          className={`adm-tab${status !== 'NEEDS_ATTENTION' ? ' adm-tab--active' : ''}`}
          onClick={() => { setStatus(''); setPage(1); }}
        >
          Все мероприятия
        </button>
        <button
          role="tab"
          type="button"
          aria-selected={status === 'NEEDS_ATTENTION'}
          className={`adm-tab${status === 'NEEDS_ATTENTION' ? ' adm-tab--active' : ''}`}
          onClick={() => { setStatus('NEEDS_ATTENTION'); setPage(1); }}
        >
          Требует внимания
          {attentionCount > 0 && (
            <span className="adm-tab__badge">{attentionCount}</span>
          )}
        </button>
      </div>

      <form className="adm-toolbar" onSubmit={handleSearch}>
        <div className="adm-toolbar__group">
          <input
            className="adm-input adm-input--sm"
            placeholder="Поиск по названию…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="adm-toolbar__group">
          <select
            className="adm-select"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">Все статусы</option>
            {(Object.keys(STATUS_LABELS) as EventStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div className="adm-toolbar__group">
          <select
            className="adm-select"
            value={format}
            onChange={(e) => { setFormat(e.target.value); setPage(1); }}
          >
            <option value="">Все форматы</option>
            <option value="ONLINE">Онлайн</option>
            <option value="OFFLINE">Офлайн</option>
          </select>
        </div>
        <div className="adm-toolbar__group">
          <input
            className="adm-input adm-input--sm"
            placeholder="Город…"
            value={city}
            onChange={(e) => { setCity(e.target.value); setPage(1); }}
          />
        </div>
        <button type="submit" className="adm-btn adm-btn--secondary adm-btn--sm">Найти</button>
      </form>

      {error && <p className="adm-error">{error}</p>}
      {loading && <p className="adm-muted">Загрузка…</p>}

      {!loading && data && data.events.length === 0 && (
        <p className="adm-muted">Мероприятий не найдено.</p>
      )}

      {!loading && data && data.events.length > 0 && (
        <>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Статус</th>
                  <th>Формат</th>
                  <th>Дата</th>
                  <th>Город</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((ev) => (
                  <tr key={ev.id}>
                    <td>
                      <Link href={`/admin/events/${ev.id}`} className="adm-link">
                        {ev.title}
                      </Link>
                      {ev.mainEvent && (
                        <span className="adm-badge adm-badge--blue" style={{ marginLeft: '0.4rem' }}>Главное</span>
                      )}
                    </td>
                    <td>
                      <span className={STATUS_BADGE[ev.status]}>{STATUS_LABELS[ev.status]}</span>
                    </td>
                    <td>{ev.format === 'ONLINE' ? 'Онлайн' : 'Офлайн'}</td>
                    <td>{fmtDate(ev.startDate)}</td>
                    <td>{ev.city?.name ?? ev.cityName ?? '—'}</td>
                    <td className="adm-table__actions">
                      <Link href={`/admin/events/${ev.id}`} className="adm-btn adm-btn--sm">
                        Изменить
                      </Link>
                      {ev.status === 'DRAFT' && (
                        <button
                          className="adm-btn adm-btn--sm adm-btn--primary"
                          onClick={() => handlePublish(ev.id)}
                          type="button"
                        >
                          Опубликовать
                        </button>
                      )}
                      {!['ARCHIVE', 'DELETED'].includes(ev.status) && (
                        <button
                          className="adm-btn adm-btn--sm adm-btn--warn"
                          onClick={() => handleArchive(ev.id, ev.title)}
                          type="button"
                        >
                          Архив
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
