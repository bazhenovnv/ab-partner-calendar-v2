'use client';

import { useEffect, useState } from 'react';
import { adminApi, type AdminDirection } from '@/lib/admin-api';

interface Props {
  selected: string[];
  onChange: (ids: string[]) => void;
}

export default function DirectionsPicker({ selected, onChange }: Props) {
  const [directions, setDirections] = useState<AdminDirection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const data = await adminApi.get<AdminDirection[]>('/filters/directions');
        setDirections(data);
      } catch {
        setError('Не удалось загрузить направления');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  if (loading) return <p className="adm-muted" style={{ fontSize: '.8rem' }}>Загрузка направлений…</p>;
  if (error) return <p className="adm-error" style={{ fontSize: '.8rem' }}>{error}</p>;
  if (directions.length === 0) return <p className="adm-muted" style={{ fontSize: '.8rem' }}>Направления не заданы в системе.</p>;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
      {directions.map((d) => {
        const checked = selected.includes(d.id);
        return (
          <label
            key={d.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '.35rem',
              cursor: 'pointer',
              padding: '.3rem .6rem',
              border: `1px solid ${checked ? 'var(--color-selected-day)' : '#d1d5db'}`,
              borderRadius: '6px',
              background: checked ? 'rgba(54,125,103,.08)' : '#fff',
              fontSize: '.875rem',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(d.id)}
              style={{ accentColor: 'var(--color-selected-day)' }}
            />
            {d.name}
          </label>
        );
      })}
    </div>
  );
}
