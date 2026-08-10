'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { adminApi, ApiError } from '@/lib/admin-api';

type Role = 'ADMIN' | 'EDITOR';
type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', name: '', role: 'EDITOR' as Role, password: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setUsers(await adminApi.get<User[]>('/admin/users'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось загрузить пользователей');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createUser(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await adminApi.post('/admin/users', form);
      setForm({ email: '', name: '', role: 'EDITOR', password: '' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось создать пользователя');
    }
  }

  async function updateUser(user: User, patch: Partial<Pick<User, 'name' | 'role' | 'isActive'>>) {
    setError('');
    try {
      await adminApi.patch(`/admin/users/${user.id}`, patch);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось изменить пользователя');
    }
  }

  async function resetPassword(user: User) {
    const password = window.prompt(`Новый пароль для ${user.email}. Минимум 12 символов:`);
    if (!password) return;
    if (password.length < 12) {
      setError('Пароль должен содержать не менее 12 символов');
      return;
    }
    try {
      await adminApi.post(`/admin/users/${user.id}/reset-password`, { password });
      window.alert('Пароль изменён');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось изменить пароль');
    }
  }

  return (
    <div>
      <div className="adm-page-header">
        <div>
          <h1 className="adm-page-title">Пользователи и роли</h1>
          <p className="adm-muted">ADMIN — полный доступ. EDITOR — события, главные события, цитаты и аналитика.</p>
        </div>
        <button className="adm-btn" onClick={() => void load()} type="button">Обновить</button>
      </div>

      {error && <p className="adm-error">{error}</p>}

      <form className="adm-card adm-form" onSubmit={createUser}>
        <h2>Создать пользователя</h2>
        <div className="adm-grid-2">
          <label className="adm-label">Имя
            <input className="adm-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
          </label>
          <label className="adm-label">Email
            <input className="adm-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label className="adm-label">Роль
            <select className="adm-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="EDITOR">Редактор</option>
              <option value="ADMIN">Администратор</option>
            </select>
          </label>
          <label className="adm-label">Временный пароль
            <input className="adm-input" type="password" minLength={12} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="new-password" />
          </label>
        </div>
        <button className="adm-btn adm-btn--primary" type="submit">Создать</button>
      </form>

      <div className="adm-card">
        {loading ? <p className="adm-muted">Загрузка…</p> : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>Пользователь</th><th>Роль</th><th>Статус</th><th>Последний вход</th><th>Действия</th></tr></thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td><strong>{user.name}</strong><br /><span className="adm-muted">{user.email}</span></td>
                    <td>
                      <select className="adm-input" value={user.role} onChange={(e) => void updateUser(user, { role: e.target.value as Role })}>
                        <option value="ADMIN">ADMIN</option>
                        <option value="EDITOR">EDITOR</option>
                      </select>
                    </td>
                    <td>{user.isActive ? 'Активен' : 'Отключён'}</td>
                    <td>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('ru-RU') : '—'}</td>
                    <td>
                      <div className="adm-actions">
                        <button className="adm-btn adm-btn--small" type="button" onClick={() => void updateUser(user, { isActive: !user.isActive })}>{user.isActive ? 'Отключить' : 'Включить'}</button>
                        <button className="adm-btn adm-btn--small" type="button" onClick={() => void resetPassword(user)}>Сменить пароль</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
