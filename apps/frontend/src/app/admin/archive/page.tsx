'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';

type EventItem = { id: string; title: string; status: string; startDate: string; updatedAt: string; cityName: string | null; city: { name: string } | null };
type Response = { events: EventItem[]; total: number; page: number; limit: number };

export default function ArchivePage() {
  const [data, setData] = useState<Response | null>(null);
  const load = useCallback(async () => setData(await adminApi.get<Response>('/admin/archive')), []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      <div className="adm-page-header"><div><h1 className="adm-page-title">Архив / удалённые</h1><p className="adm-muted">События со статусами ARCHIVE и DELETED. Удаление в системе логическое, история сохраняется.</p></div><button className="adm-btn" onClick={() => void load()} type="button">Обновить</button></div>
      <div className="adm-card">{!data ? <p className="adm-muted">Загрузка…</p> : <><p className="adm-muted">Всего: {data.total}</p><div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Событие</th><th>Дата</th><th>Место</th><th>Статус</th><th>Обновлено</th><th /></tr></thead><tbody>
        {data.events.map((item) => <tr key={item.id}><td>{item.title}</td><td>{new Date(item.startDate).toLocaleDateString('ru-RU')}</td><td>{item.city?.name || item.cityName || '—'}</td><td>{item.status}</td><td>{new Date(item.updatedAt).toLocaleString('ru-RU')}</td><td><Link className="adm-btn adm-btn--small" href={`/admin/events/${item.id}`}>Открыть</Link></td></tr>)}
      </tbody></table></div></>}</div>
    </div>
  );
}
