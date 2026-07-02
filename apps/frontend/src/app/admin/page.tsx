'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  adminApi,
  ApiError,
  type DashboardData,
  type BroadcastStatus,
} from '@/lib/admin-api';

const BROADCAST_STATUS_LABELS: Record<BroadcastStatus, string> = {
  DRAFT: 'Черновик',
  SCHEDULED: 'Запланирована',
  QUEUED: 'В очереди',
  SENDING: 'Отправляется',
  PAUSED: 'Пауза',
  SENT: 'Отправлена',
  FAILED: 'Ошибка',
  CANCELLED: 'Отменена',
};

const BROADCAST_BADGE: Record<BroadcastStatus, string> = {
  DRAFT: 'adm-badge adm-badge--gray',
  SCHEDULED: 'adm-badge adm-badge--blue',
  QUEUED: 'adm-badge adm-badge--blue',
  SENDING: 'adm-badge adm-badge--blue-pulse',
  PAUSED: 'adm-badge adm-badge--orange',
  SENT: 'adm-badge adm-badge--green',
  FAILED: 'adm-badge adm-badge--red',
  CANCELLED: 'adm-badge adm-badge--gray',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface StatCardProps {
  label: string;
  value: number;
  variant?: 'default' | 'green' | 'blue' | 'red' | 'orange';
}

function StatCard({ label, value, variant = 'default' }: StatCardProps) {
  const valClass =
    variant === 'green'
      ? 'adm-stat__val adm-stat__val--green'
      : variant === 'blue'
        ? 'adm-stat__val adm-stat__val--blue'
        : variant === 'red'
          ? 'adm-stat__val adm-stat__val--red'
          : variant === 'orange'
            ? 'adm-stat__val'
            : 'adm-stat__val';
  return (
    <div className="adm-stat">
      <div className={valClass} style={variant === 'orange' ? { color: '#92400e' } : {}}>
        {value}
      </div>
      <div className="adm-muted" style={{ fontSize: '.8rem' }}>{label}</div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.get<DashboardData>('/admin/dashboard');
      setData(res);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'Необходимо войти в систему'
          : 'Ошибка загрузки данных',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="adm-page">
      <div className="adm-page__header">
        <h1 className="adm-page__title">Дашборд</h1>
        <button
          className="adm-btn adm-btn--secondary adm-btn--sm"
          onClick={() => void load()}
          disabled={loading}
          type="button"
        >
          {loading ? 'Загрузка…' : '↻ Обновить'}
        </button>
      </div>

      {error && <p className="adm-error">{error}</p>}

      {loading && !data && <p className="adm-muted">Загрузка…</p>}

      {data && (
        <>
          {/* ── Статистика ── */}
          <div className="adm-stats">
            <StatCard label="Всего мероприятий" value={data.stats.totalEvents} />
            <StatCard label="Опубликовано" value={data.stats.publishedEvents} variant="green" />
            <StatCard label="Черновики" value={data.stats.draftEvents} />
            <StatCard
              label="Требует внимания"
              value={data.stats.needsAttentionEvents}
              variant={data.stats.needsAttentionEvents > 0 ? 'red' : 'default'}
            />
            <StatCard
              label="Активные рассылки"
              value={data.stats.activeBroadcasts}
              variant={data.stats.activeBroadcasts > 0 ? 'blue' : 'default'}
            />
            <StatCard label="Подписчики ботов" value={data.stats.totalBotUsers} variant="blue" />
            <StatCard label="Ожидающих напоминаний" value={data.stats.pendingReminders} />
            <StatCard
              label="Юр. документы (черновики)"
              value={data.stats.legalDrafts}
              variant={data.stats.legalDrafts > 0 ? 'orange' : 'default'}
            />
          </div>

          {/* ── Быстрые действия ── */}
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '.75rem' }}>
              Быстрые действия
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
              <Link href="/admin/events/new" className="adm-btn adm-btn--primary adm-btn--sm">
                + Создать мероприятие
              </Link>
              <Link href="/admin/broadcasts/new" className="adm-btn adm-btn--secondary adm-btn--sm">
                + Создать рассылку
              </Link>
              <Link href="/admin/legal" className="adm-btn adm-btn--sm">
                Юридические документы
              </Link>
              <Link href="/admin/settings" className="adm-btn adm-btn--sm">
                Настройки
              </Link>
            </div>
          </section>

          {/* ── Требуют внимания ── */}
          {data.needsAttentionList.length > 0 && (
            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#991b1b', marginBottom: '.75rem' }}>
                Требуют внимания ({data.needsAttentionList.length})
              </h2>
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Мероприятие</th>
                      <th>Город</th>
                      <th>Обновлено</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.needsAttentionList.map((ev) => (
                      <tr key={ev.id}>
                        <td>{ev.title}</td>
                        <td>{ev.cityName ?? '—'}</td>
                        <td>{fmtDateTime(ev.updatedAt)}</td>
                        <td className="adm-table__actions">
                          <Link
                            href={`/admin/events/${ev.id}`}
                            className="adm-btn adm-btn--sm adm-btn--warn"
                          >
                            Открыть
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── Ближайшие мероприятия ── */}
          <section style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-primary)', margin: 0 }}>
                Ближайшие мероприятия
              </h2>
              <Link href="/admin/events?status=PUBLISHED" className="adm-link" style={{ fontSize: '.85rem' }}>
                Все мероприятия →
              </Link>
            </div>
            {data.upcomingEvents.length === 0 ? (
              <p className="adm-muted">Нет предстоящих опубликованных мероприятий.</p>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Название</th>
                      <th>Дата</th>
                      <th>Город</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.upcomingEvents.map((ev) => (
                      <tr key={ev.id}>
                        <td>{ev.title}</td>
                        <td>{fmtDate(ev.startDate)}</td>
                        <td>{ev.city?.name ?? ev.cityName ?? '—'}</td>
                        <td className="adm-table__actions">
                          <Link href={`/admin/events/${ev.id}`} className="adm-btn adm-btn--sm">
                            Изменить
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Последние рассылки ── */}
          <section style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-primary)', margin: 0 }}>
                Последние рассылки
              </h2>
              <Link href="/admin/broadcasts" className="adm-link" style={{ fontSize: '.85rem' }}>
                Все рассылки →
              </Link>
            </div>
            {data.recentBroadcasts.length === 0 ? (
              <p className="adm-muted">Рассылок пока нет.</p>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Название</th>
                      <th>Статус</th>
                      <th>Создана</th>
                      <th>Запланирована</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentBroadcasts.map((b) => (
                      <tr key={b.id}>
                        <td>{b.title}</td>
                        <td>
                          <span className={BROADCAST_BADGE[b.status]}>
                            {BROADCAST_STATUS_LABELS[b.status]}
                          </span>
                        </td>
                        <td>{fmtDate(b.createdAt)}</td>
                        <td>{b.scheduledAt ? fmtDateTime(b.scheduledAt) : '—'}</td>
                        <td className="adm-table__actions">
                          <Link href={`/admin/broadcasts/${b.id}`} className="adm-btn adm-btn--sm">
                            Открыть
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
