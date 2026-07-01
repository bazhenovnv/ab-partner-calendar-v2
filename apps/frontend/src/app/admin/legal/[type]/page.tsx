'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { adminApi, ApiError, type LegalDoc, type LegalDocVersion } from '@/lib/admin-api';

const TYPE_LABELS: Record<string, string> = {
  PRIVACY_POLICY: 'Политика конфиденциальности',
  USER_AGREEMENT: 'Пользовательское соглашение',
  PERSONAL_DATA_CONSENT: 'Согласие на обработку ПДн',
  COOKIE_POLICY: 'Политика Cookie и аналитики',
  BROADCAST_CONSENT: 'Согласие на информационные рассылки',
};

const TYPE_SLUGS: Record<string, string> = {
  PRIVACY_POLICY: 'privacy',
  USER_AGREEMENT: 'terms',
  PERSONAL_DATA_CONSENT: 'consent',
  COOKIE_POLICY: 'cookies',
  BROADCAST_CONSENT: 'broadcast-consent',
};

type Tab = 'edit' | 'versions' | 'preview';

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function LegalDocPage() {
  const { type } = useParams<{ type: string }>();

  const [doc, setDoc] = useState<LegalDoc | null>(null);
  const [versions, setVersions] = useState<LegalDocVersion[] | null>(null);
  const [tab, setTab] = useState<Tab>('edit');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // editor state — mirrors doc.content until saved
  const [draftContent, setDraftContent] = useState('');
  const [draftTitle, setDraftTitle] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Public GET /legal/:type returns full LegalDoc (same shape needed here)
      const d = await adminApi.get<LegalDoc>(`/legal/${type}`);
      setDoc(d);
      setDraftContent(d.content);
      setDraftTitle(d.title);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [type]);

  const loadVersions = useCallback(async () => {
    try {
      const v = await adminApi.get<LegalDocVersion[]>(`/legal/admin/${type}/versions`);
      setVersions(v);
    } catch { /* silent */ }
  }, [type]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (tab === 'versions') void loadVersions(); }, [tab, loadVersions]);

  function flash(msg: string) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 4000);
  }

  async function handleSaveDraft() {
    setSaving(true);
    try {
      await adminApi.patch(`/legal/admin/${type}`, { title: draftTitle, content: draftContent });
      flash('Черновик сохранён');
      void load();
    } catch (err) {
      flash(err instanceof ApiError ? `Ошибка: ${err.message}` : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!confirm('Опубликовать текущий черновик как новую версию документа?')) return;
    setPublishing(true);
    try {
      await adminApi.post(`/legal/admin/${type}/publish`, { content: draftContent });
      flash('Версия опубликована');
      void load();
      void loadVersions();
    } catch (err) {
      flash(err instanceof ApiError ? `Ошибка: ${err.message}` : 'Ошибка публикации');
    } finally {
      setPublishing(false);
    }
  }

  function handleRestoreVersion(content: string) {
    if (!confirm('Восстановить содержимое этой версии в редактор?')) return;
    setDraftContent(content);
    setTab('edit');
    flash('Версия восстановлена в редактор. Сохраните или опубликуйте.');
  }

  if (loading) return <div className="adm-page"><p className="adm-muted">Загрузка…</p></div>;
  if (error) return <div className="adm-page"><p className="adm-error">{error}</p></div>;
  if (!doc) return null;

  const label = TYPE_LABELS[type] ?? type;
  const slug = TYPE_SLUGS[type];

  return (
    <div className="adm-page">
      <div className="adm-page__header">
        <div>
          <Link href="/admin/legal" className="adm-back">← Документы</Link>
          <h1 className="adm-page__title">{label}</h1>
        </div>
        <span className={`adm-badge adm-badge--${doc.isDraft ? 'gray' : 'green'} adm-badge--lg`}>
          {doc.isDraft ? 'Черновик' : 'Опубликован'}
        </span>
      </div>

      {actionMsg && <p className="adm-flash">{actionMsg}</p>}

      {slug && (
        <p className="adm-muted">
          Публичная страница:{' '}
          <a href={`/legal/${slug}`} className="adm-link" target="_blank" rel="noreferrer">
            /legal/{slug}
          </a>
          {doc.publishedAt && ` · опубликован ${fmtDateTime(doc.publishedAt)}`}
        </p>
      )}

      <div className="adm-tabs">
        {(['edit', 'versions', 'preview'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`adm-tab${tab === t ? ' adm-tab--active' : ''}`}
            onClick={() => setTab(t)}
            type="button"
          >
            {t === 'edit' ? 'Редактор' : t === 'versions' ? 'История версий' : 'Предпросмотр'}
          </button>
        ))}
      </div>

      {tab === 'edit' && (
        <div className="adm-tab-content">
          <div className="adm-legal-warning">
            ⚠ Не изменяйте юридические тексты без официального DOCX/PDF архива от юриста.
            Используйте редактор только для публикации согласованных документов.
          </div>
          <div className="adm-form">
            <label className="adm-label">
              Заголовок документа
              <input
                className="adm-input"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                maxLength={300}
              />
            </label>
            <label className="adm-label">
              Содержимое (HTML)
              <textarea
                className="adm-textarea adm-textarea--legal"
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                rows={24}
                placeholder="HTML-содержимое документа…"
              />
            </label>
            <div className="adm-form__footer">
              <button
                className="adm-btn adm-btn--secondary"
                onClick={handleSaveDraft}
                disabled={saving}
                type="button"
              >
                {saving ? 'Сохранение…' : 'Сохранить черновик'}
              </button>
              <button
                className="adm-btn adm-btn--primary"
                onClick={handlePublish}
                disabled={publishing || saving}
                type="button"
              >
                {publishing ? 'Публикация…' : 'Опубликовать версию'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'versions' && (
        <div className="adm-tab-content">
          {!versions && <p className="adm-muted">Загрузка…</p>}
          {versions && versions.length === 0 && (
            <p className="adm-muted">Версий пока нет. Опубликуйте первую версию.</p>
          )}
          {versions && versions.length > 0 && (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Опубликована</th>
                    <th>Создана</th>
                    <th>Автор</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((v, i) => (
                    <tr key={v.id}>
                      <td className="adm-mono">{versions.length - i}</td>
                      <td>{fmtDateTime(v.publishedAt)}</td>
                      <td>{fmtDateTime(v.createdAt)}</td>
                      <td>{v.createdBy ?? '—'}</td>
                      <td className="adm-table__actions">
                        <button
                          className="adm-btn adm-btn--sm adm-btn--secondary"
                          onClick={() => handleRestoreVersion(v.content)}
                          type="button"
                        >
                          Восстановить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'preview' && (
        <div className="adm-tab-content">
          <div className="adm-legal-preview">
            <h2 className="adm-legal-preview__title">{draftTitle}</h2>
            {/* eslint-disable-next-line react/no-danger */}
            <div
              className="adm-legal-preview__body"
              dangerouslySetInnerHTML={{ __html: draftContent }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
