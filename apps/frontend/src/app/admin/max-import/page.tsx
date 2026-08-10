'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi, ApiError } from '@/lib/admin-api';

type Log = {
  id: string;
  runAt: string;
  postsFound: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetail: unknown;
};

export default function MaxImportAdminPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLogs(await adminApi.get<Log[]>('/max-import/logs'));
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function run(path: string, label: string) {
    setBusy(label);
    setMessage('');
    try {
      const result = await adminApi.post<unknown>(path);
      setMessage(`${label}: выполнено. ${JSON.stringify(result)}`);
      await load();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : `${label}: ошибка`);
    } finally {
      setBusy('');
    }
  }

  return (
    <div>
      <div className="adm-page-header"><div><h1 className="adm-page-title">MAX импорт</h1><p className="adm-muted">Контроль автоматического импорта, повторной обработки и восстановления событий из MAX.</p></div><button className="adm-btn" onClick={() => void load()} type="button">Обновить</button></div>
      <div className="adm-card">
        <div className="adm-actions">
          <button className="adm-btn adm-btn--primary" disabled={Boolean(busy)} onClick={() => void run('/max-import/run', 'Синхронизация')} type="button">Запустить синхронизацию</button>
          <button className="adm-btn" disabled={Boolean(busy)} onClick={() => void run('/max-import/backfill-recent', 'Повтор недавних обновлений')} type="button">Повторить недавние</button>
          <button className="adm-btn" disabled={Boolean(busy)} onClick={() => void run('/max-import/reprocess', 'Переобработка')} type="button">Переобработать проблемные</button>
        </div>
        {message && <p className="adm-muted">{message}</p>}
      </div>
      <div className="adm-card">
        <h2>Последние запуски</h2>
        <div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Дата</th><th>Найдено</th><th>Импорт</th><th>Обновлено</th><th>Пропущено</th><th>Ошибки</th></tr></thead><tbody>
          {logs.map((log) => <tr key={log.id}><td>{new Date(log.runAt).toLocaleString('ru-RU')}</td><td>{log.postsFound}</td><td>{log.imported}</td><td>{log.updated}</td><td>{log.skipped}</td><td>{log.errors}</td></tr>)}
        </tbody></table></div>
      </div>
    </div>
  );
}
