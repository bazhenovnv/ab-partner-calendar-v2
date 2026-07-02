'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi, ApiError } from '@/lib/admin-api';
import type { EventFormat, PriceType } from '@/lib/admin-api';

interface FormState {
  title: string;
  shortDescription: string;
  fullDescription: string;
  startDate: string;
  endDate: string;
  startTime: string;
  format: EventFormat;
  cityName: string;
  address: string;
  venue: string;
  speaker: string;
  eventUrl: string;
  ticketUrl: string;
  ticketSalesEnabled: boolean;
  priceType: PriceType;
  priceText: string;
  mainEvent: boolean;
  tags: string;
}

const INITIAL: FormState = {
  title: '',
  shortDescription: '',
  fullDescription: '',
  startDate: '',
  endDate: '',
  startTime: '',
  format: 'ONLINE',
  cityName: '',
  address: '',
  venue: '',
  speaker: '',
  eventUrl: '',
  ticketUrl: '',
  ticketSalesEnabled: false,
  priceType: 'FREE',
  priceText: '',
  mainEvent: false,
  tags: '',
};

export default function EventNewPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(field: keyof FormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function validate(): string {
    if (!form.title.trim() || form.title.trim().length < 2) return 'Введите название (минимум 2 символа)';
    if (!form.startDate) return 'Укажите дату начала';
    if (!form.priceType) return 'Укажите тип цены';
    if (!form.format) return 'Укажите формат';
    return '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        startDate: form.startDate,
        format: form.format,
        priceType: form.priceType,
      };
      if (form.shortDescription.trim()) body.shortDescription = form.shortDescription.trim();
      if (form.fullDescription.trim()) body.fullDescription = form.fullDescription.trim();
      if (form.endDate) body.endDate = form.endDate;
      if (form.startTime) body.startTime = form.startTime;
      if (form.cityName.trim()) body.cityName = form.cityName.trim();
      if (form.address.trim()) body.address = form.address.trim();
      if (form.venue.trim()) body.venue = form.venue.trim();
      if (form.speaker.trim()) body.speaker = form.speaker.trim();
      if (form.eventUrl.trim()) body.eventUrl = form.eventUrl.trim();
      if (form.ticketUrl.trim()) body.ticketUrl = form.ticketUrl.trim();
      body.ticketSalesEnabled = form.ticketSalesEnabled;
      if (form.priceText.trim()) body.priceText = form.priceText.trim();
      body.mainEvent = form.mainEvent;
      if (form.tags.trim()) {
        body.tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
      }

      const created = await adminApi.post<{ id: string }>('/events/admin', body);
      router.push(`/admin/events/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка при создании');
      setSaving(false);
    }
  }

  return (
    <div className="adm-page">
      <div className="adm-page__header">
        <div>
          <Link href="/admin/events" className="adm-back">← Мероприятия</Link>
          <h1 className="adm-page__title">Новое мероприятие</h1>
        </div>
      </div>

      {error && <p className="adm-error">{error}</p>}

      <form className="adm-form" onSubmit={handleSubmit}>
        <label className="adm-label">
          Название *
          <input
            className="adm-input"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            required
            minLength={2}
          />
        </label>

        <label className="adm-label">
          Краткое описание
          <textarea
            className="adm-textarea"
            rows={2}
            value={form.shortDescription}
            onChange={(e) => set('shortDescription', e.target.value)}
          />
        </label>

        <label className="adm-label">
          Полное описание
          <textarea
            className="adm-textarea"
            rows={5}
            value={form.fullDescription}
            onChange={(e) => set('fullDescription', e.target.value)}
          />
        </label>

        <div className="adm-row">
          <label className="adm-label adm-label--grow">
            Дата начала *
            <input
              className="adm-input"
              type="date"
              value={form.startDate}
              onChange={(e) => set('startDate', e.target.value)}
              required
            />
          </label>
          <label className="adm-label adm-label--grow">
            Дата окончания
            <input
              className="adm-input"
              type="date"
              value={form.endDate}
              onChange={(e) => set('endDate', e.target.value)}
            />
          </label>
          <label className="adm-label">
            Время начала
            <input
              className="adm-input"
              type="time"
              value={form.startTime}
              onChange={(e) => set('startTime', e.target.value)}
            />
          </label>
        </div>

        <div className="adm-row">
          <label className="adm-label adm-label--grow">
            Формат *
            <select
              className="adm-select"
              value={form.format}
              onChange={(e) => set('format', e.target.value as EventFormat)}
            >
              <option value="ONLINE">Онлайн</option>
              <option value="OFFLINE">Офлайн</option>
            </select>
          </label>
          <label className="adm-label adm-label--grow">
            Тип цены *
            <select
              className="adm-select"
              value={form.priceType}
              onChange={(e) => set('priceType', e.target.value as PriceType)}
            >
              <option value="FREE">Бесплатно</option>
              <option value="PAID">Платно</option>
            </select>
          </label>
        </div>

        {form.priceType === 'PAID' && (
          <label className="adm-label">
            Описание цены
            <input
              className="adm-input"
              placeholder="Например: от 2 000 ₽"
              value={form.priceText}
              onChange={(e) => set('priceText', e.target.value)}
            />
          </label>
        )}

        <label className="adm-label">
          Город
          <input
            className="adm-input"
            value={form.cityName}
            onChange={(e) => set('cityName', e.target.value)}
          />
        </label>

        {form.format === 'OFFLINE' && (
          <>
            <label className="adm-label">
              Адрес
              <input
                className="adm-input"
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
              />
            </label>
            <label className="adm-label">
              Площадка
              <input
                className="adm-input"
                value={form.venue}
                onChange={(e) => set('venue', e.target.value)}
              />
            </label>
          </>
        )}

        <label className="adm-label">
          Спикер
          <input
            className="adm-input"
            value={form.speaker}
            onChange={(e) => set('speaker', e.target.value)}
          />
        </label>

        <label className="adm-label">
          Ссылка на мероприятие
          <input
            className="adm-input"
            type="url"
            value={form.eventUrl}
            onChange={(e) => set('eventUrl', e.target.value)}
          />
        </label>

        <label className="adm-label">
          Ссылка на билеты
          <input
            className="adm-input"
            type="url"
            value={form.ticketUrl}
            onChange={(e) => set('ticketUrl', e.target.value)}
          />
        </label>

        <label className="adm-label">
          Теги (через запятую)
          <input
            className="adm-input"
            placeholder="бухгалтерия, налоги, семинар"
            value={form.tags}
            onChange={(e) => set('tags', e.target.value)}
          />
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.ticketSalesEnabled}
              onChange={(e) => set('ticketSalesEnabled', e.target.checked)}
            />
            Продажа билетов активна
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.mainEvent}
              onChange={(e) => set('mainEvent', e.target.checked)}
            />
            Главное мероприятие (показывать на главной странице)
          </label>
        </div>

        <div className="adm-form__footer">
          <button className="adm-btn adm-btn--primary" type="submit" disabled={saving}>
            {saving ? 'Сохранение…' : 'Создать'}
          </button>
          <Link href="/admin/events" className="adm-btn adm-btn--secondary">
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
