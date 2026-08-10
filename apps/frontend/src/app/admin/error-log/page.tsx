'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';

type ErrorItem = {
  id: string;
  context: string;
  message: string;
  stack: string | null;
  payload: unknown;
  createdAt: string;
};
type Response = { items: ErrorItem[]; total: number; page: number; limit: number };

export default function ErrorLogPage() {
  const [data, setData] = useState<Response | null>(null);
  const load = useCallback(async () => setData(await adminApi.get<Response>('/admin/error-log')), []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      <div className="adm-page-header"><div><h1 className="adm-page-title">Технические ошибки</h1><p className="adm-muted">Журнал ошибок backend и фоновых процессов, сохранённых в ErrorLog.</p></div><button className="adm-btn" onClick={() => void load()} type="button">Обновить</button></div>
      <div className="adm-card">{!data ? <p className="adm-muted">Загрузка…</p> : data.items.length === 0 ? <p className="adm-muted">Технических ошибок в журнале нет.</p> : <><p className="adm-muted">Всего записей: {data.total}</p><div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Дата</th><th>Контекст</th><th>Сообщение</th><th>Детали</th></tr></thead><tbody>
        {data.items.map((item) => <tr key={item.id}><td>{new Date(item.createdAt).toLocaleString('ru-RU')}</td><td>{item.context}</td><td>{item.message}</td><td>{item.stack ? <details><summary>Stack</summary><pre className="adm-log-pre">{item.stack}</pre></details> : '—'}</td></tr>)}
      </tbody></table></div></>}</div>
    </div>
  );
}
