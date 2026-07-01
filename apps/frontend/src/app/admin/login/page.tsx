'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, setToken, ApiError } from '@/lib/admin-api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await adminApi.post<{ access_token: string }>('/auth/login', { email, password });
      setToken(data.access_token);
      router.replace('/admin/broadcasts');
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'Неверный email или пароль' : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="adm-login-wrap">
      <form className="adm-login-form" onSubmit={handleSubmit}>
        <h1 className="adm-login-title">АБ Афиша — Администратор</h1>
        {error && <p className="adm-error">{error}</p>}
        <label className="adm-label">
          Email
          <input
            className="adm-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label className="adm-label">
          Пароль
          <input
            className="adm-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        <button className="adm-btn adm-btn--primary" type="submit" disabled={loading}>
          {loading ? 'Вход…' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
