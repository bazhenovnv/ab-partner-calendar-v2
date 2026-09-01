'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  adminApi,
  type AdminCitiesResponse,
  type AdminCity,
} from '@/lib/admin-api';

interface Props {
  selectedId: string;
  cityName: string;
  required?: boolean;
  disabled?: boolean;
  onChange: (cityId: string, cityName: string) => void;
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase('ru-RU');
}

export default function CityPicker({
  selectedId,
  cityName,
  required = false,
  disabled = false,
  onChange,
}: Props) {
  const [cities, setCities] = useState<AdminCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const data = await adminApi.get<AdminCitiesResponse>(
          '/admin/cities?isActive=true&limit=500&sortBy=name&sortDir=asc',
        );
        setCities(data.cities);
      } catch {
        setError('Не удалось загрузить справочник городов');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const exactMatches = useMemo(() => {
    const name = normalize(cityName);
    if (!name) return [];
    return cities.filter((city) => normalize(city.name) === name);
  }, [cities, cityName]);

  useEffect(() => {
    if (selectedId || exactMatches.length !== 1) return;
    const city = exactMatches[0];
    onChange(city.id, city.name);
  }, [exactMatches, onChange, selectedId]);

  if (loading) {
    return <p className="adm-muted" style={{ margin: 0, fontSize: '.8rem' }}>Загрузка городов…</p>;
  }

  if (error) {
    return <p className="adm-error" style={{ margin: 0, fontSize: '.8rem' }}>{error}</p>;
  }

  const unmatchedLegacyName = Boolean(cityName.trim()) && !selectedId && exactMatches.length !== 1;

  return (
    <>
      <select
        className="adm-select"
        value={selectedId}
        required={required}
        disabled={disabled}
        onChange={(event) => {
          const id = event.target.value;
          if (!id) {
            onChange('', '');
            return;
          }
          const city = cities.find((item) => item.id === id);
          if (city) onChange(city.id, city.name);
        }}
      >
        <option value="">— Выберите город из справочника —</option>
        {cities.map((city) => (
          <option key={city.id} value={city.id}>
            {city.name}{city.region ? ` — ${city.region}` : ''}
          </option>
        ))}
      </select>
      {unmatchedLegacyName && (
        <p className="adm-muted" style={{ margin: '.35rem 0 0', fontSize: '.8rem' }}>
          Сейчас в старых данных указано «{cityName}», но канонический город не выбран. Выберите его из справочника.
        </p>
      )}
    </>
  );
}
