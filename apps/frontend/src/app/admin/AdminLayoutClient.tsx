'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi, clearToken } from '@/lib/admin-api';

type AdminRole = 'ADMIN' | 'EDITOR';

type Profile = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  lastLoginAt: string | null;
};

type MenuItem = {
  href: string;
  label: string;
  roles: AdminRole[];
  section?: string;
};

const MENU: MenuItem[] = [
  { href: '/admin', label: 'Дашборд', roles: ['ADMIN', 'EDITOR'] },
  { href: '/admin/events', label: 'Мероприятия', roles: ['ADMIN', 'EDITOR'], section: 'Контент' },
  { href: '/admin/needs-attention', label: 'Требует внимания', roles: ['ADMIN', 'EDITOR'] },
  { href: '/admin/main-events', label: 'Главные события', roles: ['ADMIN', 'EDITOR'] },
  { href: '/admin/quotes', label: 'Цитаты', roles: ['ADMIN', 'EDITOR'] },
  { href: '/admin/filters', label: 'Фильтры', roles: ['ADMIN'], section: 'Справочники и импорт' },
  { href: '/admin/cities', label: 'Города и регионы', roles: ['ADMIN'] },
  { href: '/admin/directions', label: 'Направления', roles: ['ADMIN'] },
  { href: '/admin/max-import', label: 'MAX импорт', roles: ['ADMIN'] },
  { href: '/admin/integrations', label: 'Интеграции / API', roles: ['ADMIN'] },
  { href: '/admin/editorial', label: 'Публикации TG / MAX', roles: ['ADMIN'], section: 'Коммуникации' },
  { href: '/admin/editorial/max-channels', label: 'MAX-каналы публикаций', roles: ['ADMIN'] },
  { href: '/admin/bots-reminders', label: 'Боты и напоминания', roles: ['ADMIN'] },
  { href: '/admin/contacts', label: 'Контакты', roles: ['ADMIN'] },
  { href: '/admin/broadcasts', label: 'Рассылки', roles: ['ADMIN'] },
  { href: '/admin/analytics', label: 'Аналитика', roles: ['ADMIN', 'EDITOR'] },
  { href: '/admin/site-builder', label: 'Конструктор сайта', roles: ['ADMIN'], section: 'Сайт и система' },
  { href: '/admin/legal', label: 'Документы', roles: ['ADMIN'] },
  { href: '/admin/settings', label: 'Настройки сайта', roles: ['ADMIN'] },
  { href: '/admin/users', label: 'Пользователи и роли', roles: ['ADMIN'] },
  { href: '/admin/archive', label: 'Архив / удалённые', roles: ['ADMIN'] },
  { href: '/admin/action-log', label: 'Журнал действий', roles: ['ADMIN'], section: 'Контроль' },
  { href: '/admin/error-log', label: 'Технические ошибки', roles: ['ADMIN'] },
];

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === href;
  if (href === '/admin/editorial') return pathname === href;
  return pathname.startsWith(href);
}

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const isLogin = pathname === '/admin/login';
    const token = localStorage.getItem('admin_token');

    if (isLogin) {
      setReady(true);
      return () => { cancelled = true; };
    }

    if (!token) {
      router.replace('/admin/login');
      return () => { cancelled = true; };
    }

    adminApi.get<Profile>('/auth/me')
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setReady(true);
      })
      .catch(() => {
        clearToken();
        if (!cancelled) router.replace('/admin/login');
      });

    return () => { cancelled = true; };
  }, [pathname, router]);

  if (!ready) {
    return <div className="adm-login-wrap"><div className="adm-muted">Проверка доступа…</div></div>;
  }

  if (pathname === '/admin/login') return <>{children}</>;
  if (!profile) return null;

  const allowedMenu = MENU.filter((item) => item.roles.includes(profile.role));
  const current = MENU.find((item) => isActive(pathname, item.href));
  if (current && !current.roles.includes(profile.role)) {
    return (
      <div className="adm-login-wrap">
        <div className="adm-card">
          <h1 className="adm-page-title">Доступ запрещён</h1>
          <p className="adm-muted">Для роли {profile.role} этот раздел недоступен.</p>
          <button className="adm-btn adm-btn--primary" onClick={() => router.replace('/admin')} type="button">
            Вернуться в дашборд
          </button>
        </div>
      </div>
    );
  }

  function logout() {
    clearToken();
    router.replace('/admin/login');
  }

  let previousSection = '';

  return (
    <div className="adm-shell">
      <aside className="adm-sidebar">
        <div className="adm-sidebar__logo">АБ Афиша</div>
        <div className="adm-sidebar__account">
          <strong>{profile.name}</strong>
          <span>{profile.role === 'ADMIN' ? 'Администратор' : 'Редактор'}</span>
        </div>
        <nav className="adm-sidebar__nav" aria-label="Административное меню">
          {allowedMenu.map((item) => {
            const section = item.section && item.section !== previousSection ? item.section : null;
            if (item.section) previousSection = item.section;
            return (
              <div key={item.href}>
                {section && <div className="adm-sidebar__section-title">{section}</div>}
                <Link
                  href={item.href}
                  className={`adm-sidebar__link${isActive(pathname, item.href) ? ' adm-sidebar__link--active' : ''}`}
                >
                  {item.label}
                </Link>
              </div>
            );
          })}
        </nav>
        <button className="adm-sidebar__logout" onClick={logout} type="button">
          Выйти
        </button>
      </aside>
      <main className="adm-content">{children}</main>
    </div>
  );
}
