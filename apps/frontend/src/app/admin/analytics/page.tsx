'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';

type Overview = {
  counters: Record<string, number>;
  topEvents: Array<{ eventId: string; views: number; event: { title: string; startDate: string } | null }>;
  topPages7d: Array<{ page: string; visits: number }>;
};

const LABELS: Record<string, string> = {
  visits24h: 'Визиты 24 часа',
  visits7d: 'Визиты 7 дней',
  visits30d: 'Визиты 30 дней',
  eventViews30d: 'Просмотры событий 30 дней',
  registrations30d: 'Регистрационные действия 30 дней',
  remindersCreated30d: 'Создано напоминаний 30 дней',
  botUsers: 'Пользователи ботов',
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Overview | null>(null);
  const load = useCallback(async () => setData(await adminApi.get<Overview>('/analytics/admin/overview')), []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      <div className="adm-page-header"><div><h1 className="adm-page-title">Аналитика</h1><p className="adm-muted">Внутренняя аналитика сайта, событий и напоминаний. Яндекс.Метрика остаётся внешним источником расширенной веб-аналитики.</p></div><button className="adm-btn" onClick={() => void load()} type="button">Обновить</button></div>
      {!data ? <p className="adm-muted">Загрузка…</p> : <>
        <div className="adm-stats-grid">{Object.entries(data.counters).map(([key, value]) => <div className="adm-stat-card" key={key}><span>{LABELS[key] ?? key}</span><strong>{value}</strong></div>)}</div>
        <div className="adm-grid-2">
          <div className="adm-card"><h2>Популярные события за 30 дней</h2><div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Событие</th><th>Просмотры</th></tr></thead><tbody>{data.topEvents.map((item) => <tr key={item.eventId}><td>{item.event?.title ?? item.eventId}</td><td>{item.views}</td></tr>)}</tbody></table></div></div>
          <div className="adm-card"><h2>Популярные страницы за 7 дней</h2><div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Страница</th><th>Визиты</th></tr></thead><tbody>{data.topPages7d.map((item) => <tr key={item.page}><td>{item.page}</td><td>{item.visits}</td></tr>)}</tbody></table></div></div>
        </div>
      </>}
    </div>
  );
}
