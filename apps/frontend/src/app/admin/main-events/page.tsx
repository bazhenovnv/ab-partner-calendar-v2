'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/lib/admin-api';

const VISIBLE_MAIN_EVENTS = 5;

type MainEvent = {
  id: string;
  title: string;
  status: string;
  startDate: string;
  createdAt: string;
  autoStatus: string;
  sortOrder: number;
  cityName: string | null;
  images?: Array<{ thumbnailUrl: string | null; mainEventUrl: string | null }>;
};

function hasDedicatedCover(item: MainEvent) {
  return Boolean(item.images?.[0]?.mainEventUrl?.trim());
}

function isPublicEligible(item: MainEvent) {
  return item.status === 'PUBLISHED' && hasDedicatedCover(item);
}

function selectPublicCarousel(items: MainEvent[]) {
  const eligible = items.filter(isPublicEligible);
  const active = eligible
    .filter((item) => item.autoStatus === 'PLANNED' || item.autoStatus === 'LIVE')
    .sort((a, b) => a.sortOrder - b.sortOrder || new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  // Five cards are visible at once, but every active main event participates in
  // the rolling cycle. Completed events are only a fallback to fill an initial
  // five-card set when there are fewer than five active items.
  if (active.length >= VISIBLE_MAIN_EVENTS) return active;

  const completed = eligible
    .filter((item) => item.autoStatus === 'COMPLETED')
    .sort((a, b) =>
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, VISIBLE_MAIN_EVENTS - active.length);

  return [...active, ...completed];
}

function publicReason(item: MainEvent, selectedIds: Set<string>) {
  if (selectedIds.has(item.id)) return 'Участвует в цикле';
  if (item.status !== 'PUBLISHED') return `Не опубликовано (${item.status})`;
  if (!hasDedicatedCover(item)) return 'Нет обложки mainEventUrl';
  if (item.autoStatus === 'COMPLETED') return 'Завершено — резерв не требуется';
  return 'Не участвует';
}

export default function MainEventsAdminPage() {
  const [items, setItems] = useState<MainEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await adminApi.get<MainEvent[]>('/admin/main-events')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const publicItems = useMemo(() => selectPublicCarousel(items), [items]);
  const publicIds = useMemo(() => new Set(publicItems.map((item) => item.id)), [publicItems]);
  const attentionCount = items.filter((item) => item.status === 'PUBLISHED' && !hasDedicatedCover(item)).length;

  return (
    <div>
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Главные события</h1>
          <p className="adm-muted">
            Публичная карусель показывает 5 событий одновременно и циклически проводит через окно все опубликованные активные события с mainEvent=true и отдельной обложкой mainEventUrl.
          </p>
        </div>
        <button className="adm-btn" onClick={() => void load()} type="button">Обновить</button>
      </div>

      <div className="adm-card" style={{ marginBottom: '1rem' }}>
        <p className="adm-muted">
          Сейчас участвуют в публичном цикле: <strong>{publicItems.length}</strong>. Одновременно видно до {VISIBLE_MAIN_EVENTS}.
          {attentionCount > 0 ? ` Требуют обложку: ${attentionCount}.` : ''}
        </p>
      </div>

      <div className="adm-card">
        {loading ? <p className="adm-muted">Загрузка…</p> : items.length === 0 ? <p className="adm-muted">Главные события не назначены.</p> : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Событие</th>
                  <th>Дата</th>
                  <th>Публикация</th>
                  <th>Состояние</th>
                  <th>Порядок</th>
                  <th>Обложка</th>
                  <th>Публичная карусель</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.title}</td>
                    <td>{new Date(item.startDate).toLocaleDateString('ru-RU')}</td>
                    <td>{item.status}</td>
                    <td>{item.autoStatus}</td>
                    <td>{item.sortOrder}</td>
                    <td>{hasDedicatedCover(item) ? 'Есть' : 'Нет'}</td>
                    <td>{publicReason(item, publicIds)}</td>
                    <td>
                      <Link className="adm-btn adm-btn--small" href={`/admin/events/${item.id}`}>
                        Редактировать
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
