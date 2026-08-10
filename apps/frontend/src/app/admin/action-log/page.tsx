'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';

type Log = {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  createdAt: string;
  before: unknown;
  after: unknown;
  user: { email: string; name: string; role: string } | null;
};
type Response = { items: Log[]; total: number; page: number; limit: number };

export default function ActionLogPage() {
  const [data, setData] = useState<Response | null>(null);
  const load = useCallback(async () => setData(await adminApi.get<Response>('/admin/action-log')), []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      <div className="adm-page-header"><div><h1 className="adm-page-title">Журнал действий</h1><p className="adm-muted">Аудит административных изменений и операций с контентом.</p></div><button className="adm-btn" onClick={() => void load()} type="button">Обновить</button></div>
      <div className="adm-card">{!data ? <p className="adm-muted">Загрузка…</p> : <><p className="adm-muted">Всего записей: {data.total}</p><div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Дата</th><th>Пользователь</th><th>Действие</th><th>Объект</th><th>ID</th></tr></thead><tbody>
        {data.items.map((item) => <tr key={item.id}><td>{new Date(item.createdAt).toLocaleString('ru-RU')}</td><td>{item.user ? `${item.user.name} (${item.user.email})` : 'Система'}</td><td>{item.action}</td><td>{item.entity || '—'}</td><td><code>{item.entityId || '—'}</code></td></tr>)}
      </tbody></table></div></>}</div>
    </div>
  );
}
