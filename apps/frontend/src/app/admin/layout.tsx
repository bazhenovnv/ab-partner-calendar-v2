'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { clearToken } from '@/lib/admin-api';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const isLogin = pathname === '/admin/login';
    const token = localStorage.getItem('admin_token');
    if (!token && !isLogin) {
      router.replace('/admin/login');
      return;
    }
    setReady(true);
  }, [pathname, router]);

  if (!ready) return null;

  const isLogin = pathname === '/admin/login';
  if (isLogin) return <>{children}</>;

  function logout() {
    clearToken();
    router.replace('/admin/login');
  }

  return (
    <div className="adm-shell">
      <aside className="adm-sidebar">
        <div className="adm-sidebar__logo">АБ Афиша</div>
        <nav className="adm-sidebar__nav">
          <Link
            href="/admin/broadcasts"
            className={`adm-sidebar__link${pathname.startsWith('/admin/broadcasts') ? ' adm-sidebar__link--active' : ''}`}
          >
            Рассылки
          </Link>
        </nav>
        <button className="adm-sidebar__logout" onClick={logout} type="button">
          Выйти
        </button>
      </aside>
      <main className="adm-content">{children}</main>
    </div>
  );
}
