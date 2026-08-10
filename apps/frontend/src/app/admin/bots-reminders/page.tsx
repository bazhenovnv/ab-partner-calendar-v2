'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';

type Reminder = {
  id: string;
  remindAt: string;
  status: string;
  failReason: string | null;
  botUser: { channel: string; username: string | null; firstName: string | null; externalId: string };
  event: { id: string; title: string; startDate: string };
};
type Overview = {
  byChannel: Array<{ channel: string; _count: { _all: number } }>;
  pending: number;
  failed: number;
  sentToday: number;
  recentReminders: Reminder[];
};

export default function BotsRemindersPage() {
  const [data, setData] = useState<Overview | null>(null);
  const load = useCallback(async () => setData(await adminApi.get<Overview>('/admin/bots-reminders')), []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      <div className="adm-page-header"><div><h1 className="adm-page-title">Боты и напоминания</h1><p className="adm-muted">Состояние Telegram/MAX аудитории и сервисных напоминаний.</p></div><button className="adm-btn" onClick={() => void load()} type="button">Обновить</button></div>
      {!data ? <p className="adm-muted">Загрузка…</p> : <>
        <div className="adm-stats-grid">
          {data.byChannel.map((item) => <div className="adm-stat-card" key={item.channel}><span>{item.channel}</span><strong>{item._count._all}</strong></div>)}
          <div className="adm-stat-card"><span>Ожидают</span><strong>{data.pending}</strong></div>
          <div className="adm-stat-card"><span>Отправлено сегодня</span><strong>{data.sentToday}</strong></div>
          <div className="adm-stat-card"><span>Ошибки</span><strong>{data.failed}</strong></div>
        </div>
        <div className="adm-card"><h2>Последние напоминания</h2><div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Пользователь</th><th>Канал</th><th>Событие</th><th>Напомнить</th><th>Статус</th></tr></thead><tbody>
          {data.recentReminders.map((item) => <tr key={item.id}><td>{item.botUser.username ? `@${item.botUser.username}` : item.botUser.firstName || item.botUser.externalId}</td><td>{item.botUser.channel}</td><td>{item.event.title}</td><td>{new Date(item.remindAt).toLocaleString('ru-RU')}</td><td>{item.status}{item.failReason ? `: ${item.failReason}` : ''}</td></tr>)}
        </tbody></table></div></div>
      </>}
    </div>
  );
}
