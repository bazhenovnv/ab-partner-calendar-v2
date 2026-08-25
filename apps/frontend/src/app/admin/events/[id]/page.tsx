'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  adminApi,
  ApiError,
  type AdminEvent,
  type EventStatus,
  type EventFormat,
  type PriceType,
} from '@/lib/admin-api';
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
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  async function loadEvent(): Promise<AdminEvent> {
    return adminApi.get<AdminEvent>(`/events/admin/${id}`);
  }

  useEffect(() => {
    void (async () => {
      try {
        const ev = await loadEvent();
        setEvent(ev);
        setForm(eventToForm(ev));
        setDirectionIds(ev.directions?.map((d) => d.direction.id) ?? []);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Ошибка загрузки');
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function applyEvent(ev: AdminEvent) {
    setEvent(ev);
    setForm(eventToForm(ev));
    setDirectionIds(ev.directions?.map((d) => d.direction.id) ?? []);
  }

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
    if (!form || !event) return;
    if (event.status === 'DELETED') {
      setError('Удалённое мероприятие сначала нужно восстановить');
      return;
    }
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

      await adminApi.put<AdminEvent>(`/events/admin/${id}`, body);
      const refreshed = await loadEvent();
      applyEvent(refreshed);
      setOk('Сохранено. Проверка готовности к публикации обновлена.');
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
      await adminApi.patch<AdminEvent>(`/events/admin/${id}/publish`, {});
      const refreshed = await loadEvent();
      applyEvent(refreshed);
      setOk('Мероприятие опубликовано');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка при публикации');
    }
  }

  async function handleSetStatus(status: EventStatus) {
    setError('');
    setOk('');
    try {
      await adminApi.patch<AdminEvent>(`/events/admin/${id}/status`, { status });
      const refreshed = await loadEvent();
      applyEvent(refreshed);
      setOk(`Статус изменён: ${STATUS_LABELS[status]}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка');
    }
  }

  async function handleArchive() {
    if (!confirm('Перевести мероприятие в архив?')) return;
    setLifecycleBusy(true);
    setError('');
    setOk('');
    try {
      await adminApi.patch<AdminEvent>(`/events/admin/${id}/archive`, {});
      router.push('/admin/archive');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось архивировать мероприятие');
    } finally {
      setLifecycleBusy(false);
    }
  }

  async function handleRestore() {
    if (!confirm('Восстановить мероприятие?')) return;
    setLifecycleBusy(true);
    setError('');
    setOk('');
    try {
      await adminApi.patch<AdminEvent>(`/events/admin/${id}/restore`, {});
      const restored = await loadEvent();
      applyEvent(restored);
      setOk(`Мероприятие восстановлено. Статус: ${STATUS_LABELS[restored.status]}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось восстановить мероприятие');
    } finally {
      setLifecycleBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Переместить мероприятие в удалённые? Запись и история сохранятся.')) return;
    setLifecycleBusy(true);
    setError('');
    setOk('');
    try {
      await adminApi.del<void>(`/events/admin/${id}`);
      router.push('/admin/archive');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось удалить мероприятие');
    } finally {
      setLifecycleBusy(false);
    }
  }

  if (loading) return <div className="adm-page"><p className="adm-muted">Загрузка…</p></div>;
  if (!event || !form) return <div className="adm-page"><p className="adm-error">{error || 'Мероприятие не найдено'}</p></div>;

  const isArchivedOrDeleted = event.status === 'ARCHIVE' || event.status === 'DELETED';
  const isDeleted = event.status === 'DELETED';
  const isNeedsAttention = event.status === 'NEEDS_ATTENTION';
  const backHref = isArchivedOrDeleted
    ? '/admin/archive'
    : isNeedsAttention
      ? '/admin/needs-attention'
      : '/admin/events';
  const backLabel = isArchivedOrDeleted
    ? 'Архив / удалённые'
    : isNeedsAttention
      ? 'Требует внимания'
      : 'Мероприятия';

  return (
    <div className="adm-page">
      <div className="adm-page__header">
        <div>
          <Link href={backHref} className="adm-back">
            ← {backLabel}
          </Link>
          <h1 className="adm-page__title">{event.title}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className={STATUS_BADGE[event.status]}>{STATUS_LABELS[event.status]}</span>
          {(event.status === 'DRAFT' || event.status === 'NEEDS_ATTENTION') && (
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
          {!isArchivedOrDeleted && (
            <button
              className="adm-btn adm-btn--warn adm-btn--sm"
              onClick={handleArchive}
              disabled={lifecycleBusy}
              type="button"
            >
              Архив
            </button>
          )}
          {isArchivedOrDeleted && (
            <button
              className="adm-btn adm-btn--primary adm-btn--sm"
              onClick={handleRestore}
              disabled={lifecycleBusy}
              type="button"
            >
              Восстановить
            </button>
          )}
          {!isDeleted && (
            <button
              className="adm-btn adm-btn--danger adm-btn--sm"
              onClick={handleDelete}
              disabled={lifecycleBusy}
              type="button"
            >
              Удалить
            </button>
          )}
        </div>
      </div>

      {error && <p className="adm-error">{error}</p>}
      {ok && <p className="adm-ok">{ok}</p>}
      {isDeleted && (
        <p className="adm-muted">Удалённое мероприятие доступно для просмотра. Для редактирования сначала восстановите его.</p>
      )}

      {isNeedsAttention && (
        <div className="adm-card" style={{ marginBottom: '1rem', border: '1px solid #e6a9a9' }}>
          <h2 style={{ marginTop: 0, marginBottom: '0.8rem', fontSize: '1.05rem' }}>
            Почему событие требует внимания
          </h2>
          {(event.attentionGuidance?.length ?? 0) > 0 ? (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {event.attentionGuidance?.map((item, index) => (
                <div key={`${item.reason}-${index}`}>
                  <div style={{ fontWeight: 600 }}>{item.reason}</div>
                  <div className="adm-muted" style={{ marginTop: '0.15rem' }}>{item.action}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="adm-muted">Автоматическая публикация была остановлена. Проверьте данные мероприятия.</p>
          )}

          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
            <div style={{ fontWeight: 700, marginBottom: '0.45rem' }}>Что мешает публикации сейчас</div>
            {(event.publicationIssues?.length ?? 0) > 0 ? (
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {event.publicationIssues?.map((item, index) => (
                  <li key={`${item.reason}-${index}`} style={{ marginBottom: '0.4rem' }}>
                    <strong>{item.reason}.</strong> {item.action}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="adm-ok" style={{ margin: 0 }}>
                Обязательные данные заполнены. Проверьте карточку и нажмите «Опубликовать».
              </p>
            )}
          </div>
        </div>
      )}

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
              <option value="HYBRID">Онлайн + офлайн</option>
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

        {(form.format === 'OFFLINE' || form.format === 'HYBRID') && (
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
          {!isDeleted && (
            <button className="adm-btn adm-btn--primary" type="submit" disabled={saving}>
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          )}
          <Link href={backHref} className="adm-btn adm-btn--secondary">
            К списку
          </Link>
        </div>
      </form>
    </div>
  );
}
