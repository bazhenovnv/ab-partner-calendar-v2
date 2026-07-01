'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'cookie_notice_accepted';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable (private mode, SSR guard)
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="region" aria-label="Уведомление об использовании cookie">
      <p className="cookie-banner__text">
        Мы используем cookie и аналитику, чтобы сайт работал корректно, а также для анализа
        посещаемости, улучшения сервиса и диагностики ошибок. Продолжая пользоваться сайтом, вы
        соглашаетесь с обработкой данных в соответствии с{' '}
        <Link href="/legal/privacy" className="cookie-banner__link">
          Политикой конфиденциальности
        </Link>
        {' и '}
        <Link href="/legal/cookies" className="cookie-banner__link">
          Политикой Cookie
        </Link>
        .
      </p>
      <button className="cookie-banner__btn" onClick={accept} type="button">
        Понятно
      </button>
    </div>
  );
}
