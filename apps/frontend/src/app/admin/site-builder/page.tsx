'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';

type BuilderData = {
  footerProjects: Array<{ id: string; title: string; url: string; isActive: boolean; sortOrder: number }>;
  quotes: Array<{ id: string; text: string; author: string | null; isActive: boolean; sortOrder: number }>;
  maintenance: { maintenanceEnabled: boolean; title: string; description: string; imageUrl: string };
};

export default function SiteBuilderPage() {
  const [data, setData] = useState<BuilderData | null>(null);
  const load = useCallback(async () => setData(await adminApi.get<BuilderData>('/admin/site-builder')), []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      <div className="adm-page-header"><div><h1 className="adm-page-title">Конструктор сайта</h1><p className="adm-muted">Единая точка управления контентными блоками публичного сайта.</p></div><button className="adm-btn" onClick={() => void load()} type="button">Обновить</button></div>
      {!data ? <p className="adm-muted">Загрузка…</p> : <div className="adm-grid-2">
        <Link className="adm-card" href="/admin/events"><h2>Мероприятия</h2><p className="adm-muted">Карточки, тексты, даты, изображения и публикация.</p></Link>
        <Link className="adm-card" href="/admin/main-events"><h2>Главные события</h2><p className="adm-muted">Сейчас назначено: {data.footerProjects.length >= 0 ? 'управляется через события' : ''}</p></Link>
        <Link className="adm-card" href="/admin/quotes"><h2>Цитаты</h2><p className="adm-muted">Всего: {data.quotes.length}, активных: {data.quotes.filter((q) => q.isActive).length}</p></Link>
        <Link className="adm-card" href="/admin/settings"><h2>Режим техработ</h2><p className="adm-muted">{data.maintenance.maintenanceEnabled ? 'Включён' : 'Выключен'} — {data.maintenance.title}</p></Link>
        <Link className="adm-card" href="/admin/legal"><h2>Юридические документы</h2><p className="adm-muted">Редактор и история опубликованных версий.</p></Link>
        <div className="adm-card"><h2>Проекты в подвале</h2><p className="adm-muted">Активных ссылок: {data.footerProjects.filter((item) => item.isActive).length}</p></div>
      </div>}
    </div>
  );
}
