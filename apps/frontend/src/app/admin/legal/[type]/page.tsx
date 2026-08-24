'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
type EditorCommand = 'bold' | 'italic' | 'underline' | 'insertUnorderedList' | 'insertOrderedList' | 'unlink' | 'undo' | 'redo';

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function LegalDocPage() {
  const { type } = useParams<{ type: string }>();
  const editorRef = useRef<HTMLDivElement | null>(null);

  const [doc, setDoc] = useState<LegalDoc | null>(null);
  const [versions, setVersions] = useState<LegalDocVersion[] | null>(null);
  const [tab, setTab] = useState<Tab>('edit');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // HTML remains the storage format; the administrator edits it visually.
  const [draftContent, setDraftContent] = useState('');
  const [draftTitle, setDraftTitle] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
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

  useEffect(() => {
    if (tab !== 'edit' || !editorRef.current) return;
    if (editorRef.current.innerHTML !== draftContent) {
      editorRef.current.innerHTML = draftContent;
    }
  }, [tab, draftContent]);

  function flash(msg: string) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 4000);
  }

  function syncEditorContent() {
    if (!editorRef.current) return;
    setDraftContent(editorRef.current.innerHTML);
  }

  function runEditorCommand(command: EditorCommand) {
    editorRef.current?.focus();
    document.execCommand(command, false);
    syncEditorContent();
  }

  function setBlock(block: 'p' | 'h2' | 'h3') {
    editorRef.current?.focus();
    document.execCommand('formatBlock', false, block);
    syncEditorContent();
  }

  function addLink() {
    const href = window.prompt('Введите адрес ссылки, например https://example.ru');
    if (!href) return;
    editorRef.current?.focus();
    document.execCommand('createLink', false, href.trim());
    syncEditorContent();
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

            <div className="adm-label">
              Содержимое документа
              <div className="adm-rich-editor" role="group" aria-label="Редактор юридического документа">
                <div className="adm-rich-editor__toolbar" aria-label="Панель форматирования">
                  <select
                    className="adm-rich-editor__select"
                    defaultValue="p"
                    onChange={(e) => setBlock(e.target.value as 'p' | 'h2' | 'h3')}
                    aria-label="Стиль абзаца"
                  >
                    <option value="p">Обычный текст</option>
                    <option value="h2">Заголовок 1</option>
                    <option value="h3">Заголовок 2</option>
                  </select>
                  <span className="adm-rich-editor__separator" />
                  <button type="button" onClick={() => runEditorCommand('bold')} title="Жирный"><strong>Ж</strong></button>
                  <button type="button" onClick={() => runEditorCommand('italic')} title="Курсив"><em>К</em></button>
                  <button type="button" onClick={() => runEditorCommand('underline')} title="Подчёркнутый"><u>Ч</u></button>
                  <span className="adm-rich-editor__separator" />
                  <button type="button" onClick={() => runEditorCommand('insertUnorderedList')} title="Маркированный список">• Список</button>
                  <button type="button" onClick={() => runEditorCommand('insertOrderedList')} title="Нумерованный список">1. Список</button>
                  <span className="adm-rich-editor__separator" />
                  <button type="button" onClick={addLink} title="Добавить ссылку">Ссылка</button>
                  <button type="button" onClick={() => runEditorCommand('unlink')} title="Удалить ссылку">Убрать ссылку</button>
                  <span className="adm-rich-editor__separator" />
                  <button type="button" onClick={() => runEditorCommand('undo')} title="Отменить">↶</button>
                  <button type="button" onClick={() => runEditorCommand('redo')} title="Повторить">↷</button>
                </div>
                <div
                  ref={editorRef}
                  className="adm-rich-editor__surface"
                  contentEditable
                  suppressContentEditableWarning
                  role="textbox"
                  aria-multiline="true"
                  aria-label="Текст юридического документа"
                  onInput={syncEditorContent}
                  onBlur={syncEditorContent}
                />
              </div>
              <span className="adm-rich-editor__hint">Редактируйте документ прямо в его обычном виде. HTML-код сохраняется автоматически и в редакторе не показывается.</span>
            </div>

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
