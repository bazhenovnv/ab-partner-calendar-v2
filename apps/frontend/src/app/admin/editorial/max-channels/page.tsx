'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import styles from './page.module.css';

type Binding = {
  chatId: string;
  title?: string | null;
  link?: string | null;
  boundAt: string;
  source: 'auto-link' | 'admin';
};

type Target = {
  key: string;
  label: string;
  publicUrl: string;
  envName: string;
  chatId: string | null;
  configured: boolean;
  source: 'environment' | 'database' | null;
  binding: Binding | null;
};

type Discovered = {
  chatId: string;
  title: string | null;
  link: string | null;
  type: string | null;
  status: string | null;
  isPublic: boolean | null;
  description: string | null;
  lastSeenAt: string;
  source: string;
};

type State = {
  targets: Target[];
  discovered: Discovered[];
  instructions: string;
};

function formatDate(value: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function MaxChannelsPage() {
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [manualChatId, setManualChatId] = useState('');
  const [selection, setSelection] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    const data = await adminApi.get<State>('/editorial/max/channels');
    setState(data);
  }, []);

  useEffect(() => {
    refresh()
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [refresh]);

  const activeDiscovered = useMemo(
    () => (state?.discovered ?? []).filter((item) => item.status !== 'removed'),
    [state],
  );

  async function bind(targetKey: string, chatId?: string) {
    const selected = (chatId || selection[targetKey] || '').trim();
    if (!selected) {
      setError('Выберите обнаруженный MAX-канал.');
      return;
    }
    setBusy(`bind:${targetKey}`);
    setError('');
    try {
      const next = await adminApi.post<State>('/editorial/max/channels/bind', {
        targetKey,
        chatId: selected,
      });
      setState(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy('');
    }
  }

  async function unbind(targetKey: string) {
    setBusy(`unbind:${targetKey}`);
    setError('');
    try {
      const next = await adminApi.post<State>('/editorial/max/channels/unbind', { targetKey });
      setState(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy('');
    }
  }

  async function probe() {
    const chatId = manualChatId.trim();
    if (!/^-?\d+$/.test(chatId)) {
      setError('Введите числовой chat_id MAX.');
      return;
    }
    setBusy('probe');
    setError('');
    try {
      const next = await adminApi.post<State>('/editorial/max/channels/refresh', { chatId });
      setState(next);
      setManualChatId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy('');
    }
  }

  if (loading) {
    return <div className="adm-page"><p className="adm-muted">Загрузка MAX-каналов…</p></div>;
  }

  return (
    <div className={`adm-page ${styles.page}`}>
      <div className={styles.header}>
        <div>
          <h1 className="adm-page__title">MAX-каналы публикаций</h1>
          <p className={styles.lead}>
            Автоматическое обнаружение и привязка числовых <code>chat_id</code> для двух MAX-каналов редакционного кабинета.
          </p>
        </div>
        <Link className="adm-btn" href="/admin/editorial">← К редактору публикаций</Link>
      </div>

      {error && <div className={styles.error}><strong>Ошибка:</strong> {error}</div>}

      <div className={styles.notice}>
        <strong>Как работает:</strong> {state?.instructions}
        <br />
        MAX официально передаёт <code>chat_id</code> в webhook-событии <code>bot_added</code>. Backend проверяет найденный ID через MAX API, убеждается, что это канал, и сохраняет его в базе.
      </div>

      <section className={styles.grid}>
        {(state?.targets ?? []).map((target) => (
          <article className={styles.card} key={target.key}>
            <div className={styles.cardHead}>
              <div>
                <h2>{target.label}</h2>
                <a href={target.publicUrl} target="_blank" rel="noreferrer">{target.publicUrl}</a>
              </div>
              <span className={target.configured ? styles.ok : styles.pending}>
                {target.configured ? 'Подключён' : 'Не привязан'}
              </span>
            </div>

            {target.configured ? (
              <div className={styles.binding}>
                <div><span>chat_id</span><strong>{target.chatId}</strong></div>
                <div><span>Источник</span><strong>{target.source === 'environment' ? 'Переменная окружения' : 'База данных'}</strong></div>
                {target.binding?.title && <div><span>Название MAX</span><strong>{target.binding.title}</strong></div>}
                {target.binding?.boundAt && <div><span>Привязан</span><strong>{formatDate(target.binding.boundAt)}</strong></div>}
                {target.source === 'database' ? (
                  <button
                    className="adm-btn"
                    type="button"
                    disabled={busy === `unbind:${target.key}`}
                    onClick={() => unbind(target.key)}
                  >
                    {busy === `unbind:${target.key}` ? 'Отключение…' : 'Отвязать'}
                  </button>
                ) : (
                  <p className={styles.hint}>ID задан через {target.envName}; он имеет приоритет над привязкой из кабинета.</p>
                )}
              </div>
            ) : (
              <div className={styles.bindRow}>
                <select
                  value={selection[target.key] || ''}
                  onChange={(event) => setSelection((prev) => ({ ...prev, [target.key]: event.target.value }))}
                >
                  <option value="">Выберите обнаруженный канал…</option>
                  {activeDiscovered.map((item) => (
                    <option key={item.chatId} value={item.chatId}>
                      {item.title || 'Без названия'} · chat_id {item.chatId}
                    </option>
                  ))}
                </select>
                <button
                  className="adm-btn adm-btn--primary"
                  type="button"
                  disabled={busy === `bind:${target.key}` || !selection[target.key]}
                  onClick={() => bind(target.key)}
                >
                  {busy === `bind:${target.key}` ? 'Проверка…' : 'Проверить и привязать'}
                </button>
              </div>
            )}
          </article>
        ))}
      </section>

      <section className={styles.panel}>
        <h2>Проверить известный chat_id вручную</h2>
        <p>Если числовой ID уже известен из логов или события MAX, можно проверить его через API и добавить в список обнаруженных.</p>
        <div className={styles.manualRow}>
          <input
            value={manualChatId}
            onChange={(event) => setManualChatId(event.target.value)}
            placeholder="Например: -123456789012345678"
            inputMode="numeric"
          />
          <button className="adm-btn" type="button" disabled={busy === 'probe'} onClick={probe}>
            {busy === 'probe' ? 'Проверяю…' : 'Проверить MAX API'}
          </button>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHead}>
          <div>
            <h2>Обнаруженные MAX-каналы</h2>
            <p>Список хранится в БД и переживает пересборку контейнеров.</p>
          </div>
          <button className="adm-btn" type="button" onClick={() => refresh().catch((err) => setError(String(err)))}>Обновить список</button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Канал</th><th>chat_id</th><th>Ссылка</th><th>Статус</th><th>Последнее событие</th><th /></tr>
            </thead>
            <tbody>
              {(state?.discovered ?? []).map((item) => (
                <tr key={item.chatId}>
                  <td><strong>{item.title || 'Без названия'}</strong><br /><small>{item.description || item.source}</small></td>
                  <td><code>{item.chatId}</code></td>
                  <td>{item.link ? <a href={item.link} target="_blank" rel="noreferrer">Открыть</a> : '—'}</td>
                  <td>{item.status || 'active'}{item.isPublic === true ? ' · public' : ''}</td>
                  <td>{formatDate(item.lastSeenAt)}</td>
                  <td>
                    <div className={styles.quickActions}>
                      {(state?.targets ?? []).filter((target) => !target.configured).map((target) => (
                        <button className="adm-btn" type="button" key={target.key} onClick={() => bind(target.key, item.chatId)}>
                          → {target.label.replace('MAX — ', '')}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {!state?.discovered.length && (
                <tr><td colSpan={6} className={styles.empty}>Пока ни одного MAX-канала не обнаружено.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
