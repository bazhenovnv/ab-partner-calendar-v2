'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './legal-close-button.module.css';

export function LegalCloseButton() {
  const router = useRouter();

  const closeDocument = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push('/');
  }, [router]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeDocument();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeDocument]);

  return (
    <button
      type="button"
      className={styles.close}
      onClick={closeDocument}
      aria-label="Закрыть документ"
      title="Закрыть"
    >
      <span aria-hidden="true">×</span>
    </button>
  );
}
