'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { adminApi, type AttentionGuidanceItem } from '@/lib/admin-api';

type Item = {
  id: string;
  title: string;
  cityName: string | null;
  updatedAt: string;
  attentionGuidance?: AttentionGuidanceItem[];
  publicationIssues?: AttentionGuidanceItem[];
  publicationReady?: boolean;
};

function GuidanceList({ items }: { items: AttentionGuidanceItem[] }) {
  if (items.length === 0) return <span className="adm-muted">—</span>;
  return (
    <div style={{ display: 'grid', gap: '0.45rem', minWidth: '280px' }}>
      {items.map((item, index) => (
        <div key={`${item.reason}-${index}`}>
          <div style={{ fontWeight: 600 }}>{item.reason}</div>
          <div className="adm-muted" style={{ marginTop: '0.15rem' }}>{item.action}</div>
        </div>
      ))}
    </div>
  );
}

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
        <div>
          <h1 className="adm-page-title">Требует внимания</h1>
          <p className="adm-muted">
            Здесь показано, почему событие не опубликовано автоматически и что администратору нужно проверить или исправить.
          </p>
        </div>
        <button className="adm-btn" onClick={() => void load()} type="button">Обновить</button>
      </div>
      <div className="adm-card">
        {loading ? <p className="adm-muted">Загрузка…</p> : items.length === 0 ? <p className="adm-muted">Нет событий, требующих внимания.</p> : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Событие</th>
                  <th>Причина</th>
                  <th>Что нужно для публикации</th>
                  <th>Место</th>
                  <th>Обновлено</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const guidance = item.attentionGuidance ?? [];
                  const issues = item.publicationIssues ?? [];
                  return (
                    <tr key={item.id}>
                      <td style={{ minWidth: '240px' }}>{item.title}</td>
                      <td><GuidanceList items={guidance} /></td>
                      <td style={{ minWidth: '300px' }}>
                        {issues.length > 0 ? (
                          <GuidanceList items={issues} />
                        ) : (
                          <div>
                            <div style={{ fontWeight: 600 }}>Обязательные данные заполнены</div>
                            <div className="adm-muted" style={{ marginTop: '0.15rem' }}>
                              Откройте карточку, проверьте данные и нажмите «Опубликовать».
                            </div>
                          </div>
                        )}
                      </td>
                      <td>{item.cityName || '—'}</td>
                      <td>{new Date(item.updatedAt).toLocaleString('ru-RU')}</td>
                      <td>
                        <Link className="adm-btn adm-btn--small" href={`/admin/events/${item.id}`}>
                          Проверить
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
