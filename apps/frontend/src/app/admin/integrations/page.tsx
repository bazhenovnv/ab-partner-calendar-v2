'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { adminApi, ApiError } from '@/lib/admin-api';

type Source = {
  id: string;
  name: string;
  url: string;
  method: string;
  syncPeriod: number;
  syncMode: string;
  isEnabled: boolean;
  lastSyncAt: string | null;
};

export default function IntegrationsPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [form, setForm] = useState({ name: '', url: '', method: 'GET', syncPeriod: 60 });
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setSources(await adminApi.get<Source[]>('/api-sources/admin'));
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    try {
      await adminApi.post('/api-sources/admin', { ...form, authType: 'none', syncMode: 'new_and_update', isEnabled: false, headers: {}, authConfig: {}, fieldMapping: {} });
      setForm({ name: '', url: '', method: 'GET', syncPeriod: 60 });
      await load();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Ошибка создания');
    }
  }

  async function patch(source: Source, body: Partial<Source>) {
    await adminApi.patch(`/api-sources/admin/${source.id}`, body);
    await load();
  }

  async function test(source: Source) {
    const result = await adminApi.post<{ success: boolean; httpStatus?: number; error?: string }>(`/api-sources/admin/${source.id}/test`);
    setMessage(`${source.name}: ${result.success ? 'соединение успешно' : `ошибка ${result.error ?? result.httpStatus ?? ''}`}`);
    await load();
  }

  async function remove(source: Source) {
    if (!window.confirm(`Удалить источник «${source.name}»?`)) return;
    await adminApi.del(`/api-sources/admin/${source.id}`);
    await load();
  }

  return (
    <div>
      <div className="adm-page-header"><div><h1 className="adm-page-title">Интеграции / API источники</h1><p className="adm-muted">Подключение будущих внешних источников событий, проверка соединения и включение синхронизации.</p></div><button className="adm-btn" onClick={() => void load()} type="button">Обновить</button></div>
      {message && <p className="adm-muted">{message}</p>}
      <form className="adm-card adm-form" onSubmit={create}>
        <h2>Добавить источник</h2>
        <div className="adm-grid-2">
          <label className="adm-label">Название<input className="adm-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="adm-label">URL<input className="adm-input" type="url" required value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></label>
          <label className="adm-label">Метод<select className="adm-input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}><option>GET</option><option>POST</option></select></label>
          <label className="adm-label">Период, минут<input className="adm-input" type="number" min={1} value={form.syncPeriod} onChange={(e) => setForm({ ...form, syncPeriod: Number(e.target.value) })} /></label>
        </div>
        <button className="adm-btn adm-btn--primary" type="submit">Добавить</button>
      </form>
      <div className="adm-card"><div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Источник</th><th>Метод</th><th>Период</th><th>Статус</th><th>Последняя синхронизация</th><th>Действия</th></tr></thead><tbody>
        {sources.map((source) => <tr key={source.id}><td><strong>{source.name}</strong><br /><span className="adm-muted">{source.url}</span></td><td>{source.method}</td><td>{source.syncPeriod} мин</td><td>{source.isEnabled ? 'Включён' : 'Отключён'}</td><td>{source.lastSyncAt ? new Date(source.lastSyncAt).toLocaleString('ru-RU') : '—'}</td><td><div className="adm-actions"><button className="adm-btn adm-btn--small" type="button" onClick={() => void test(source)}>Тест</button><button className="adm-btn adm-btn--small" type="button" onClick={() => void patch(source, { isEnabled: !source.isEnabled })}>{source.isEnabled ? 'Выключить' : 'Включить'}</button><button className="adm-btn adm-btn--small" type="button" onClick={() => void remove(source)}>Удалить</button></div></td></tr>)}
      </tbody></table></div></div>
    </div>
  );
}
