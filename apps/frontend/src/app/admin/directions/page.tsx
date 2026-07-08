'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  adminApi,
  ApiError,
  type AdminDirection,
  type AdminDirectionsResponse,
} from '@/lib/admin-api';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const EMPTY_FORM = { name: '', slug: '', sortOrder: 0, isActive: true };

export default function DirectionsPage() {
  const [data, setData] = useState<AdminDirectionsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'sortOrder' | 'name' | 'createdAt'>('sortOrder');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterActive, setFilterActive] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminDirection | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT), sortBy, sortDir });
      if (search) params.set('search', search);
      if (filterActive) params.set('isActive', filterActive);
      const res = await adminApi.get<AdminDirectionsResponse>(`/admin/directions?${params}`);
      setData(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [page, search, sortBy, sortDir, filterActive]);

  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(dir: AdminDirection) {
    setEditTarget(dir);
    setForm({ name: dir.name, slug: dir.slug, sortOrder: dir.sortOrder, isActive: dir.isActive });
    setFormError('');
    setFormOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setFormError('');
    try {
      if (editTarget) {
        await adminApi.put(`/admin/directions/${editTarget.id}`, form);
      } else {
        await adminApi.post('/admin/directions', form);
      }
      setFormOpen(false);
      setPage(1);
      void load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string) {
    try {
      await adminApi.patch(`/admin/directions/${id}/toggle`, {});
      void load();
    } catch {
      alert('Не удалось изменить статус');
    }
  }

  async function handleDelete(dir: AdminDirection) {
    const evCount = dir._count?.events ?? 0;
    const msg = evCount > 0
      ? `Направление «${dir.name}» используется в ${evCount} мер. Оно будет отключено (soft delete). Продолжить?`
      : `Удалить направление «${dir.name}»?`;
    if (!confirm(msg)) return;
    try {
      await adminApi.del(`/admin/directions/${dir.id}`);
      void load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Ошибка удаления');
    }
  }

  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(1);
  }

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;
  const sortArrow = (field: string) => sortBy === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <div className="adm-page">
      <div className="adm-page__header">
        <h1 className="adm-page__title">
          Направления
          {data && <span className="adm-count">{data.total}</span>}
        </h1>
        <button className="adm-btn adm-btn--primary" type="button" onClick={openCreate}>
          + Добавить направление
        </button>
      </div>

      <div className="adm-toolbar">
        <div className="adm-toolbar__group">
          <input
            className="adm-input adm-input--sm"
            placeholder="Поиск по названию или slug…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="adm-toolbar__group">
          <select
            className="adm-select"
            value={filterActive}
            onChange={(e) => { setFilterActive(e.target.value); setPage(1); }}
          >
            <option value="">Все</option>
            <option value="true">Активные</option>
            <option value="false">Отключённые</option>
          </select>
        </div>
      </div>

      {error && <p className="adm-error">{error}</p>}
      {loading && <p className="adm-muted">Загрузка…</p>}

      {!loading && data && data.directions.length === 0 && (
        <p className="adm-muted">Направлений не найдено.</p>
      )}

      {!loading && data && data.directions.length > 0 && (
        <>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('sortOrder')}>
                    Порядок{sortArrow('sortOrder')}
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('name')}>
                    Название{sortArrow('name')}
                  </th>
                  <th>Slug</th>
                  <th>Мероприятий</th>
                  <th>Статус</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('createdAt')}>
                    Создано{sortArrow('createdAt')}
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.directions.map((dir) => (
                  <tr key={dir.id}>
                    <td className="adm-muted">{dir.sortOrder}</td>
                    <td>
                      <span className="adm-link" style={{ cursor: 'pointer' }} onClick={() => openEdit(dir)}>
                        {dir.name}
                      </span>
                    </td>
                    <td className="adm-muted">{dir.slug}</td>
                    <td className="adm-muted">{dir._count?.events ?? 0}</td>
                    <td>
                      <span className={`adm-badge ${dir.isActive ? 'adm-badge--green' : 'adm-badge--gray'}`}>
                        {dir.isActive ? 'Активно' : 'Отключено'}
                      </span>
                    </td>
                    <td className="adm-muted">{fmtDate(dir.createdAt)}</td>
                    <td className="adm-table__actions">
                      <button className="adm-btn adm-btn--sm" type="button" onClick={() => openEdit(dir)}>
                        Изменить
                      </button>
                      <button
                        className={`adm-btn adm-btn--sm ${dir.isActive ? 'adm-btn--warn' : 'adm-btn--secondary'}`}
                        type="button"
                        onClick={() => handleToggle(dir.id)}
                      >
                        {dir.isActive ? 'Отключить' : 'Включить'}
                      </button>
                      <button
                        className="adm-btn adm-btn--sm adm-btn--danger"
                        type="button"
                        onClick={() => handleDelete(dir)}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="adm-pagination">
              <button className="adm-btn adm-btn--sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} type="button">← Назад</button>
              <span className="adm-muted">стр. {page} / {totalPages}</span>
              <button className="adm-btn adm-btn--sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} type="button">Вперёд →</button>
            </div>
          )}
        </>
      )}

      {formOpen && (
        <div className="adm-modal-overlay" onClick={() => setFormOpen(false)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="adm-modal__title">{editTarget ? 'Редактировать направление' : 'Новое направление'}</h2>

            <div className="adm-form">
              <label className="adm-label">
                Название <span className="adm-required">*</span>
                <input
                  className="adm-input"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Бизнес и карьера"
                />
              </label>
              <label className="adm-label">
                Slug <span className="adm-required">*</span>
                <input
                  className="adm-input"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="business-career"
                />
              </label>
              <label className="adm-label">
                Порядок сортировки
                <input
                  className="adm-input"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                />
              </label>
              <label className="adm-label adm-label--checkbox">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                Активно
              </label>
            </div>

            {formError && <p className="adm-error" style={{ marginTop: '0.75rem' }}>{formError}</p>}

            <div className="adm-modal__actions">
              <button className="adm-btn adm-btn--secondary" type="button" onClick={() => setFormOpen(false)}>
                Отмена
              </button>
              <button className="adm-btn adm-btn--primary" type="button" onClick={handleSave} disabled={saving}>
                {saving ? 'Сохранение…' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
