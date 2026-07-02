'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi, ApiError, type AdminEvent, type EventStatus, type EventFormat, type PriceType } from '@/lib/admin-api';
import DirectionsPicker from '@/components/admin/DirectionsPicker';

const STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: 'Черновик',
  PUBLISHED: 'Опубликовано',
  HIDDEN: 'Скрыто',
  ARCHIVE: 'Архив',
  NEEDS_ATTENTION: 'Требует внимания',
  DELETED: 'Удалено',
};

const STATUS_BADGE: Record<EventStatus, string> = {
  DRAFT: 'adm-badge adm-badge--gray',
  PUBLISHED: 'adm-badge adm-badge--green',
  HIDDEN: 'adm-badge adm-badge--orange',
  ARCHIVE: 'adm-badge adm-badge--gray',
  NEEDS_ATTENTION: 'adm-badge adm-badge--red',
  DELETED: 'adm-badge adm-badge--red',
};

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

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.split('T')[0];
}

function eventToForm(ev: AdminEvent): FormState {
  return {
    title: ev.title,
    shortDescription: ev.shortDescription ?? '',
    fullDescription: ev.fullDescription ?? '',
    startDate: toDateInput(ev.startDate),
    endDate: toDateInput(ev.endDate),
    startTime: ev.startTime ?? '',
    format: ev.format,
    cityName: ev.cityName ?? ev.city?.name ?? '',
    address: ev.address ?? '',
    venue: ev.venue ?? '',
    speaker: ev.speaker ?? '',
    eventUrl: ev.eventUrl ?? '',
    ticketUrl: ev.ticketUrl ?? '',
    ticketSalesEnabled: ev.ticketSalesEnabled,
    priceType: ev.priceType,
    priceText: ev.priceText ?? '',
    mainEvent: ev.mainEvent,
    tags: ev.tags?.map((t) => t.tag).join(', ') ?? '',
  };
}

export default function EventEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [event, setEvent] = useState<AdminEvent | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [directionIds, setDirectionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const ev = await adminApi.get<AdminEvent>(`/events/admin/${id}`);
        setEvent(ev);
        setForm(eventToForm(ev));
        setDirectionIds(ev.directions?.map((d) => d.direction.id) ?? []);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Ошибка загрузки');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  function setField(field: keyof FormState, value: string | boolean) {
    setForm((prev) => prev ? { ...prev, [field]: value } : prev);
  }

  function validate(): string {
    if (!form) return 'Форма не загружена';
    if (!form.title.trim() || form.title.trim().length < 2) return 'Введите название (минимум 2 символа)';
    if (!form.startDate) return 'Укажите дату начала';
    return '';
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const err = validate();
    if (err) { setError(err); return; }

    setSaving(true);
    setError('');
    setOk('');
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        startDate: form.startDate,
        format: form.format,
        priceType: form.priceType,
        shortDescription: form.shortDescription.trim() || null,
        fullDescription: form.fullDescription.trim() || null,
        endDate: form.endDate || null,
        startTime: form.startTime || null,
        cityName: form.cityName.trim() || null,
        address: form.address.trim() || null,
        venue: form.venue.trim() || null,
        speaker: form.speaker.trim() || null,
        eventUrl: form.eventUrl.trim() || null,
        ticketUrl: form.ticketUrl.trim() || null,
        ticketSalesEnabled: form.ticketSalesEnabled,
        priceText: form.priceText.trim() || null,
        mainEvent: form.mainEvent,
        directionIds,
        tags: form.tags.trim()
          ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
      };

      const updated = await adminApi.put<AdminEvent>(`/events/admin/${id}`, body);
      setEvent(updated);
      setForm(eventToForm(updated));
      if (updated.directions) {
        setDirectionIds(updated.directions.map((d) => d.direction.id));
      }
      setOk('Сохранено');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setError('');
    setOk('');
    try {
      const updated = await adminApi.patch<AdminEvent>(`/events/admin/${id}/publish`, {});
      setEvent(updated);
      setOk('Мероприятие опубликовано');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка при публикации');
    }
  }

  async function handleSetStatus(status: EventStatus) {
    setError('');
    setOk('');
    try {
      const updated = await adminApi.patch<AdminEvent>(`/events/admin/${id}/status`, { status });
      setEvent(updated);
      setOk(`Статус изменён: ${STATUS_LABELS[status]}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка');
    }
  }

  async function handleArchive() {
    if (!confirm('Перевести в архив?')) return;
    setError('');
    try {
      await adminApi.patch(`/events/admin/${id}/archive`, {});
      router.push('/admin/events');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка');
    }
  }

  async function handleDelete() {
    if (!confirm('Удалить мероприятие? Действие необратимо.')) return;
    setError('');
    try {
      await adminApi.del(`/events/admin/${id}`);
      router.push('/admin/events');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка');
    }
  }

  if (loading) return <div className="adm-page"><p className="adm-muted">Загрузка…</p></div>;
  if (!event || !form) return <div className="adm-page"><p className="adm-error">{error || 'Мероприятие не найдено'}</p></div>;

  return (
    <div className="adm-page">
      <div className="adm-page__header">
        <div>
          <Link href="/admin/events" className="adm-back">← Мероприятия</Link>
          <h1 className="adm-page__title">{event.title}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className={STATUS_BADGE[event.status]}>{STATUS_LABELS[event.status]}</span>
          {event.status === 'DRAFT' && (
            <button className="adm-btn adm-btn--primary adm-btn--sm" onClick={handlePublish} type="button">
              Опубликовать
            </button>
          )}
          {event.status === 'PUBLISHED' && (
            <button
              className="adm-btn adm-btn--sm"
              onClick={() => handleSetStatus('HIDDEN')}
              type="button"
            >
              Скрыть
            </button>
          )}
          {event.status === 'HIDDEN' && (
            <button
              className="adm-btn adm-btn--primary adm-btn--sm"
              onClick={() => handleSetStatus('PUBLISHED')}
              type="button"
            >
              Опубликовать
            </button>
          )}
          {!['ARCHIVE', 'DELETED'].includes(event.status) && (
            <button className="adm-btn adm-btn--warn adm-btn--sm" onClick={handleArchive} type="button">
              Архив
            </button>
          )}
          <button className="adm-btn adm-btn--danger adm-btn--sm" onClick={handleDelete} type="button">
            Удалить
          </button>
        </div>
      </div>

      {error && <p className="adm-error">{error}</p>}
      {ok && <p className="adm-ok">{ok}</p>}

      <form className="adm-form" onSubmit={handleSave}>
        <label className="adm-label">
          Название *
          <input
            className="adm-input"
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
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
            onChange={(e) => setField('shortDescription', e.target.value)}
          />
        </label>

        <label className="adm-label">
          Полное описание
          <textarea
            className="adm-textarea"
            rows={6}
            value={form.fullDescription}
            onChange={(e) => setField('fullDescription', e.target.value)}
          />
        </label>

        <div className="adm-row">
          <label className="adm-label adm-label--grow">
            Дата начала *
            <input
              className="adm-input"
              type="date"
              value={form.startDate}
              onChange={(e) => setField('startDate', e.target.value)}
              required
            />
          </label>
          <label className="adm-label adm-label--grow">
            Дата окончания
            <input
              className="adm-input"
              type="date"
              value={form.endDate}
              onChange={(e) => setField('endDate', e.target.value)}
            />
          </label>
          <label className="adm-label">
            Время начала
            <input
              className="adm-input"
              type="time"
              value={form.startTime}
              onChange={(e) => setField('startTime', e.target.value)}
            />
          </label>
        </div>

        <div className="adm-row">
          <label className="adm-label adm-label--grow">
            Формат *
            <select
              className="adm-select"
              value={form.format}
              onChange={(e) => setField('format', e.target.value as EventFormat)}
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
              onChange={(e) => setField('priceType', e.target.value as PriceType)}
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
              onChange={(e) => setField('priceText', e.target.value)}
            />
          </label>
        )}

        <label className="adm-label">
          Город
          <input
            className="adm-input"
            value={form.cityName}
            onChange={(e) => setField('cityName', e.target.value)}
          />
        </label>

        {form.format === 'OFFLINE' && (
          <>
            <label className="adm-label">
              Адрес
              <input
                className="adm-input"
                value={form.address}
                onChange={(e) => setField('address', e.target.value)}
              />
            </label>
            <label className="adm-label">
              Площадка
              <input
                className="adm-input"
                value={form.venue}
                onChange={(e) => setField('venue', e.target.value)}
              />
            </label>
          </>
        )}

        <label className="adm-label">
          Спикер
          <input
            className="adm-input"
            value={form.speaker}
            onChange={(e) => setField('speaker', e.target.value)}
          />
        </label>

        <label className="adm-label">
          Ссылка на мероприятие
          <input
            className="adm-input"
            type="url"
            value={form.eventUrl}
            onChange={(e) => setField('eventUrl', e.target.value)}
          />
        </label>

        <label className="adm-label">
          Ссылка на билеты
          <input
            className="adm-input"
            type="url"
            value={form.ticketUrl}
            onChange={(e) => setField('ticketUrl', e.target.value)}
          />
        </label>

        <div className="adm-label">
          Направления
          <DirectionsPicker selected={directionIds} onChange={setDirectionIds} />
        </div>

        <label className="adm-label">
          Теги (через запятую)
          <input
            className="adm-input"
            placeholder="бухгалтерия, налоги, семинар"
            value={form.tags}
            onChange={(e) => setField('tags', e.target.value)}
          />
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.ticketSalesEnabled}
              onChange={(e) => setField('ticketSalesEnabled', e.target.checked)}
            />
            Продажа билетов активна
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.mainEvent}
              onChange={(e) => setField('mainEvent', e.target.checked)}
            />
            Главное мероприятие (показывать на главной странице)
          </label>
        </div>

        <div className="adm-form__footer">
          <button className="adm-btn adm-btn--primary" type="submit" disabled={saving}>
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
          <Link href="/admin/events" className="adm-btn adm-btn--secondary">
            К списку
          </Link>
        </div>
      </form>
    </div>
  );
}
