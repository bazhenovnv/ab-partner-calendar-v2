'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';

type MainEvent = {
  id: string;
  title: string;
  startDate: string;
  autoStatus: string;
  sortOrder: number;
  cityName: string | null;
  images?: Array<{ thumbnailUrl: string | null; mainEventUrl: string | null }>;
};

export default function MainEventsAdminPage() {
  const [items, setItems] = useState<MainEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await adminApi.get<MainEvent[]>('/admin/main-events')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      <div className="adm-page-header">
        <div><h1 className="adm-page-title">Главные события</h1><p className="adm-muted">События с mainEvent=true. Публичная карусель показывает максимум пять опубликованных событий по BR-034.</p></div>
        <button className="adm-btn" onClick={() => void load()} type="button">Обновить</button>
      </div>
      <div className="adm-card">
        {loading ? <p className="adm-muted">Загрузка…</p> : items.length === 0 ? <p className="adm-muted">Главные события не назначены.</p> : (
          <div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Событие</th><th>Дата</th><th>Статус</th><th>Порядок</th><th>Баннер</th><th /></tr></thead><tbody>
            {items.map((item) => <tr key={item.id}><td>{item.title}</td><td>{new Date(item.startDate).toLocaleDateString('ru-RU')}</td><td>{item.autoStatus}</td><td>{item.sortOrder}</td><td>{item.images?.[0]?.mainEventUrl ? 'Есть' : 'Нет'}</td><td><Link className="adm-btn adm-btn--small" href={`/admin/events/${item.id}`}>Редактировать</Link></td></tr>)}
          </tbody></table></div>
        )}
      </div>
    </div>
  );
}
