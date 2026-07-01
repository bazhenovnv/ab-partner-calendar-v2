'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/admin-api';
import { BroadcastForm, type BroadcastFormValues } from '@/components/admin/BroadcastForm';

export default function NewBroadcastPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave(values: BroadcastFormValues) {
    setSaving(true);
    setError('');
    try {
      const b = await adminApi.post<{ id: string }>('/broadcasts', values);
      router.replace(`/admin/broadcasts/${b.id}`);
    } catch {
      setError('Не удалось создать рассылку');
      setSaving(false);
    }
  }

  return (
    <div className="adm-page">
      <h1 className="adm-page__title">Новая рассылка</h1>
      {error && <p className="adm-error">{error}</p>}
      <BroadcastForm onSave={handleSave} saving={saving} />
    </div>
  );
}
