'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  adminApi,
  ApiError,
  type Broadcast,
  type BroadcastRecipient,
  type BroadcastLog,
  type Paginated,
} from '@/lib/admin-api';
import { StatusBadge, fmtDate, fmtDateTime } from '@/components/admin/BroadcastsShared';
import { BroadcastForm, type BroadcastFormValues } from '@/components/admin/BroadcastForm';

type Tab = 'details' | 'recipients' | 'logs';

export default function BroadcastDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [tab, setTab] = useState<Tab>('details');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // recipients / logs state
  const [recipients, setRecipients] = useState<Paginated<BroadcastRecipient> | null>(null);
  const [logs, setLogs] = useState<Paginated<BroadcastLog> | null>(null);
  const [recipPage, setRecipPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);

  // test-send chat id
  const [adminChatId, setAdminChatId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const b = await adminApi.get<Broadcast>(`/broadcasts/${id}`);
      setBroadcast(b);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (tab === 'recipients') void loadRecipients();
    if (tab === 'logs') void loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, recipPage, logsPage]);

  async function loadRecipients() {
    try {
      const res = await adminApi.get<Paginated<BroadcastRecipient>>(
        `/broadcasts/${id}/recipients?page=${recipPage}&limit=50`,
      );
      setRecipients(res);
    } catch { /* silent */ }
  }

  async function loadLogs() {
    try {
      const res = await adminApi.get<Paginated<BroadcastLog>>(
        `/broadcasts/${id}/logs?page=${logsPage}&limit=100`,
      );
      setLogs(res);
    } catch { /* silent */ }
  }

  function flash(msg: string) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 4000);
  }

  async function handleSave(values: BroadcastFormValues) {
    setSaving(true);
    try {
      await adminApi.patch(`/broadcasts/${id}`, values);
      flash('Сохранено');
      void load();
    } catch {
      flash('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestSend() {
    if (!adminChatId.trim()) {
      alert('Введите Telegram chat_id администратора');
      return;
    }
    try {
      await adminApi.post(`/broadcasts/${id}/test-send?adminChatId=${encodeURIComponent(adminChatId.trim())}`);
      flash('Тест отправлен успешно');
      void load();
    } catch (err) {
      flash(err instanceof ApiError ? `Ошибка: ${err.message}` : 'Ошибка тест-отправки');
    }
  }

  async function handleSchedule() {
    if (!broadcast?.testSentAt) {
      alert('Перед запуском рассылки необходимо выполнить тест-отправку (BR-022).');
      return;
    }
    if (!confirm('Запустить рассылку?')) return;
    try {
      const res = await adminApi.post<{ status: string }>(`/broadcasts/${id}/schedule`);
      flash(`Рассылка поставлена в очередь (${res.status})`);
      void load();
    } catch (err) {
      flash(err instanceof ApiError ? `Ошибка: ${err.message}` : 'Ошибка запуска');
    }
  }

  async function handleCancel() {
    if (!confirm('Отменить рассылку?')) return;
    try {
      await adminApi.post(`/broadcasts/${id}/cancel`);
      flash('Рассылка отменена');
      void load();
    } catch (err) {
      flash(err instanceof ApiError ? `Ошибка: ${err.message}` : 'Ошибка отмены');
    }
  }

  async function handleDelete() {
    if (!confirm('Удалить рассылку? Это действие необратимо.')) return;
    try {
      await adminApi.del(`/broadcasts/${id}`);
      router.replace('/admin/broadcasts');
    } catch (err) {
      flash(err instanceof ApiError ? `Ошибка: ${err.message}` : 'Ошибка удаления');
    }
  }

  if (loading) return <div className="adm-page"><p className="adm-muted">Загрузка…</p></div>;
  if (error) return <div className="adm-page"><p className="adm-error">{error}</p></div>;
  if (!broadcast) return null;

  const isDraft = broadcast.status === 'DRAFT';
  const canCancel = ['SCHEDULED', 'QUEUED', 'SENDING'].includes(broadcast.status);
  const canDelete = ['DRAFT', 'CANCELLED', 'FAILED'].includes(broadcast.status);
  const stats = broadcast.stats;

  return (
    <div className="adm-page">
      <div className="adm-page__header">
        <div>
          <Link href="/admin/broadcasts" className="adm-back">← Рассылки</Link>
          <h1 className="adm-page__title">{broadcast.title}</h1>
        </div>
        <StatusBadge status={broadcast.status} large />
      </div>

      {actionMsg && <p className="adm-flash">{actionMsg}</p>}

      {/* Stats bar */}
      {stats && (
        <div className="adm-stats">
          <div className="adm-stat"><span className="adm-stat__val">{stats.total}</span><span>Всего</span></div>
          <div className="adm-stat"><span className="adm-stat__val adm-stat__val--blue">{stats.pending}</span><span>Ожидают</span></div>
          <div className="adm-stat"><span className="adm-stat__val adm-stat__val--green">{stats.sent}</span><span>Отправлено</span></div>
          <div className="adm-stat"><span className="adm-stat__val adm-stat__val--red">{stats.failed}</span><span>Ошибка</span></div>
          <div className="adm-stat"><span className="adm-stat__val adm-stat__val--gray">{stats.skipped}</span><span>Пропущено</span></div>
        </div>
      )}

      {/* Action toolbar */}
      <div className="adm-toolbar">
        {isDraft && (
          <>
            <div className="adm-toolbar__group">
              <input
                className="adm-input adm-input--sm"
                placeholder="Telegram chat_id администратора"
                value={adminChatId}
                onChange={(e) => setAdminChatId(e.target.value)}
              />
              <button className="adm-btn adm-btn--secondary" onClick={handleTestSend} type="button">
                Тест-отправка
              </button>
            </div>
            <button
              className="adm-btn adm-btn--primary"
              onClick={handleSchedule}
              type="button"
              disabled={!broadcast.testSentAt}
              title={!broadcast.testSentAt ? 'Сначала выполните тест-отправку' : undefined}
            >
              {broadcast.testSentAt ? 'Запустить рассылку' : '⚠ Запустить (тест не пройден)'}
            </button>
          </>
        )}
        {canCancel && (
          <button className="adm-btn adm-btn--warn" onClick={handleCancel} type="button">
            Отменить
          </button>
        )}
        {canDelete && (
          <button className="adm-btn adm-btn--danger" onClick={handleDelete} type="button">
            Удалить
          </button>
        )}
      </div>

      {!broadcast.testSentAt && isDraft && (
        <p className="adm-warning">
          ⚠ Тест-отправка не выполнена. Перед запуском рассылки необходимо отправить тест на Telegram-аккаунт администратора (BR-022).
        </p>
      )}
      {broadcast.testSentAt && (
        <p className="adm-ok">✓ Тест отправлен: {fmtDateTime(broadcast.testSentAt)}</p>
      )}

      {/* Tabs */}
      <div className="adm-tabs">
        {(['details', 'recipients', 'logs'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`adm-tab${tab === t ? ' adm-tab--active' : ''}`}
            onClick={() => setTab(t)}
            type="button"
          >
            {t === 'details' ? 'Детали' : t === 'recipients' ? 'Получатели' : 'Логи'}
          </button>
        ))}
      </div>

      {tab === 'details' && (
        <div className="adm-tab-content">
          {isDraft ? (
            <BroadcastForm initialValues={broadcast} onSave={handleSave} saving={saving} />
          ) : (
            <BroadcastReadOnly broadcast={broadcast} />
          )}
        </div>
      )}

      {tab === 'recipients' && (
        <div className="adm-tab-content">
          {!recipients && <p className="adm-muted">Загрузка…</p>}
          {recipients && recipients.items.length === 0 && <p className="adm-muted">Получателей нет.</p>}
          {recipients && recipients.items.length > 0 && (
            <>
              <p className="adm-muted">Всего: {recipients.total}</p>
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead><tr><th>Канал</th><th>Username</th><th>externalId</th><th>Статус</th><th>Причина</th><th>Отправлено</th></tr></thead>
                  <tbody>
                    {recipients.items.map((r) => (
                      <tr key={r.id}>
                        <td>{r.channel}</td>
                        <td>{r.botUser.username ?? '—'}</td>
                        <td className="adm-mono">{r.botUser.externalId}</td>
                        <td><StatusBadge status={r.status} /></td>
                        <td>{r.failReason ?? r.skippedReason ?? '—'}</td>
                        <td>{r.sentAt ? fmtDateTime(r.sentAt) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationRow
                page={recipPage}
                total={recipients.total}
                limit={recipients.limit}
                onChange={setRecipPage}
              />
            </>
          )}
        </div>
      )}

      {tab === 'logs' && (
        <div className="adm-tab-content">
          {!logs && <p className="adm-muted">Загрузка…</p>}
          {logs && logs.items.length === 0 && <p className="adm-muted">Логов нет.</p>}
          {logs && logs.items.length > 0 && (
            <>
              <div className="adm-logs">
                {logs.items.map((l) => (
                  <div key={l.id} className={`adm-log adm-log--${l.level}`}>
                    <span className="adm-log__time">{fmtDateTime(l.createdAt)}</span>
                    <span className="adm-log__level">{l.level.toUpperCase()}</span>
                    <span className="adm-log__msg">{l.message}</span>
                  </div>
                ))}
              </div>
              <PaginationRow
                page={logsPage}
                total={logs.total}
                limit={logs.limit}
                onChange={setLogsPage}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function BroadcastReadOnly({ broadcast }: { broadcast: Broadcast }) {
  return (
    <dl className="adm-dl">
      <dt>Канал</dt><dd>{broadcast.channel}</dd>
      <dt>Текст сообщения</dt><dd className="adm-pre">{broadcast.messageText}</dd>
      {broadcast.buttonText && <><dt>Кнопка</dt><dd>{broadcast.buttonText} → {broadcast.buttonUrl}</dd></>}
      {broadcast.scheduledAt && <><dt>Запланирована</dt><dd>{fmtDateTime(broadcast.scheduledAt)}</dd></>}
      {broadcast.startedAt && <><dt>Начата</dt><dd>{fmtDateTime(broadcast.startedAt)}</dd></>}
      {broadcast.completedAt && <><dt>Завершена</dt><dd>{fmtDateTime(broadcast.completedAt)}</dd></>}
    </dl>
  );
}

function PaginationRow({
  page, total, limit, onChange,
}: { page: number; total: number; limit: number; onChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;
  return (
    <div className="adm-pagination">
      <button className="adm-btn adm-btn--sm" disabled={page <= 1} onClick={() => onChange(page - 1)} type="button">← Назад</button>
      <span className="adm-muted">стр. {page} / {totalPages}</span>
      <button className="adm-btn adm-btn--sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)} type="button">Вперёд →</button>
    </div>
  );
}
