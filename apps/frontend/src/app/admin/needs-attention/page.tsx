'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';

type Item = { id: string; title: string; cityName: string | null; updatedAt: string };

export default function NeedsAttentionPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await adminApi.get<Item[]>('/events/admin/needs-attention')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      <div className="adm-page-header">
        <div><h1 className="adm-page-title">Требует внимания</h1><p className="adm-muted">События, которые нельзя публиковать автоматически и нужно проверить вручную.</p></div>
        <button className="adm-btn" onClick={() => void load()} type="button">Обновить</button>
      </div>
      <div className="adm-card">
        {loading ? <p className="adm-muted">Загрузка…</p> : items.length === 0 ? <p className="adm-muted">Нет событий, требующих внимания.</p> : (
          <div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Событие</th><th>Место</th><th>Обновлено</th><th /></tr></thead><tbody>
            {items.map((item) => <tr key={item.id}><td>{item.title}</td><td>{item.cityName || '—'}</td><td>{new Date(item.updatedAt).toLocaleString('ru-RU')}</td><td><Link className="adm-btn adm-btn--small" href={`/admin/events/${item.id}`}>Исправить</Link></td></tr>)}
          </tbody></table></div>
        )}
      </div>
    </div>
  );
}
