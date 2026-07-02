'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi, ApiError, type AdminQuote } from '@/lib/admin-api';

type FormState = {
  text: string;
  author: string;
  sortOrder: string;
};

const EMPTY_FORM: FormState = { text: '', author: '', sortOrder: '0' };

export default function AdminQuotesPage() {
  const [quotes, setQuotes] = useState<AdminQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.get<AdminQuote[]>('/quotes/admin');
      setQuotes(data);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'Необходимо войти в систему'
          : 'Ошибка загрузки цитат',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(q: AdminQuote) {
    setEditId(q.id);
    setForm({ text: q.text, author: q.author ?? '', sortOrder: String(q.sortOrder) });
    setFormError('');
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormError('');
  }

  async function handleSave() {
    if (!form.text.trim()) {
      setFormError('Введите текст цитаты');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        text: form.text.trim(),
        author: form.author.trim() || null,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editId) {
        await adminApi.put<AdminQuote>(`/quotes/admin/${editId}`, payload);
      } else {
        await adminApi.post<AdminQuote>('/quotes/admin', payload);
      }
      cancelForm();
      await load();
    } catch {
      setFormError('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string) {
    try {
      await adminApi.patch<AdminQuote>(`/quotes/admin/${id}/toggle`, {});
      await load();
    } catch {
      setError('Ошибка переключения статуса');
    }
  }

  async function handleDelete(q: AdminQuote) {
    if (!confirm(`Удалить цитату «${q.text.slice(0, 60)}»?`)) return;
    try {
      await adminApi.del(`/quotes/admin/${q.id}`);
      await load();
    } catch {
      setError('Ошибка удаления');
    }
  }

  return (
    <div className="adm-page">
      <div className="adm-page__header">
        <h1 className="adm-page__title">Цитаты</h1>
        <button
          className="adm-btn adm-btn--secondary adm-btn--sm"
          onClick={() => void load()}
          disabled={loading}
          type="button"
        >
          {loading ? 'Загрузка…' : '↻ Обновить'}
        </button>
      </div>

      {error && <p className="adm-error">{error}</p>}

      {/* ── Форма создания / редактирования ── */}
      {showForm && (
        <div className="adm-form-panel" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
            {editId ? 'Редактировать цитату' : 'Новая цитата'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            <div>
              <label className="adm-label">Текст *</label>
              <textarea
                className="adm-input"
                rows={3}
                value={form.text}
                onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                placeholder="Текст цитаты…"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: '.75rem' }}>
              <div>
                <label className="adm-label">Автор</label>
                <input
                  className="adm-input"
                  value={form.author}
                  onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                  placeholder="Имя автора (необязательно)"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label className="adm-label">Порядок</label>
                <input
                  type="number"
                  className="adm-input"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            {formError && <p className="adm-error" style={{ margin: 0 }}>{formError}</p>}
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <button
                className="adm-btn adm-btn--primary adm-btn--sm"
                onClick={() => void handleSave()}
                disabled={saving}
                type="button"
              >
                {saving ? 'Сохранение…' : 'Сохранить'}
              </button>
              <button
                className="adm-btn adm-btn--sm"
                onClick={cancelForm}
                type="button"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Шапка списка ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <p className="adm-muted" style={{ fontSize: '.85rem' }}>
          {loading ? 'Загрузка…' : `${quotes.length} ${quotes.length === 1 ? 'цитата' : 'цитат'}`}
        </p>
        {!showForm && (
          <button
            className="adm-btn adm-btn--primary adm-btn--sm"
            onClick={openCreate}
            type="button"
          >
            + Добавить цитату
          </button>
        )}
      </div>

      {/* ── Пустое состояние ── */}
      {!loading && quotes.length === 0 && (
        <p className="adm-muted">Цитат пока нет. Добавьте первую.</p>
      )}

      {/* ── Список ── */}
      <div className="adm-table-wrap">
        {quotes.length > 0 && (
          <table className="adm-table">
            <thead>
              <tr>
                <th style={{ width: '48px' }}>#</th>
                <th>Текст</th>
                <th>Автор</th>
                <th>Статус</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} style={{ opacity: q.isActive ? 1 : 0.55 }}>
                  <td className="adm-muted" style={{ fontSize: '.8rem' }}>{q.sortOrder}</td>
                  <td style={{ maxWidth: '400px' }}>
                    <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      «{q.text}»
                    </span>
                  </td>
                  <td className="adm-muted">{q.author ?? '—'}</td>
                  <td>
                    <span className={q.isActive ? 'adm-badge adm-badge--green' : 'adm-badge adm-badge--gray'}>
                      {q.isActive ? 'Активна' : 'Скрыта'}
                    </span>
                  </td>
                  <td className="adm-table__actions">
                    <button
                      className="adm-btn adm-btn--sm"
                      onClick={() => openEdit(q)}
                      type="button"
                    >
                      Изменить
                    </button>
                    <button
                      className="adm-btn adm-btn--sm adm-btn--secondary"
                      onClick={() => void handleToggle(q.id)}
                      type="button"
                    >
                      {q.isActive ? 'Скрыть' : 'Показать'}
                    </button>
                    <button
                      className="adm-btn adm-btn--sm adm-btn--danger"
                      onClick={() => void handleDelete(q)}
                      type="button"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
