'use client';

import { useState } from 'react';
import type { Broadcast, BroadcastChannel } from '@/lib/admin-api';

export interface BroadcastFormValues {
  title: string;
  messageText: string;
  imageUrl: string;
  buttonText: string;
  buttonUrl: string;
  channel: BroadcastChannel;
  scheduledAt: string;
}

const EMPTY: BroadcastFormValues = {
  title: '',
  messageText: '',
  imageUrl: '',
  buttonText: '',
  buttonUrl: '',
  channel: 'ALL',
  scheduledAt: '',
};

function toFormValues(b: Broadcast): BroadcastFormValues {
  return {
    title: b.title,
    messageText: b.messageText,
    imageUrl: b.imageUrl ?? '',
    buttonText: b.buttonText ?? '',
    buttonUrl: b.buttonUrl ?? '',
    channel: b.channel,
    scheduledAt: b.scheduledAt ? b.scheduledAt.slice(0, 16) : '',
  };
}

interface Props {
  initialValues?: Broadcast;
  onSave: (values: BroadcastFormValues) => Promise<void>;
  saving: boolean;
}

export function BroadcastForm({ initialValues, onSave, saving }: Props) {
  const [v, setV] = useState<BroadcastFormValues>(
    initialValues ? toFormValues(initialValues) : EMPTY,
  );

  function set(field: keyof BroadcastFormValues, value: string) {
    setV((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(v);
  }

  return (
    <form className="adm-form" onSubmit={handleSubmit}>
      <label className="adm-label">
        Название *
        <input
          className="adm-input"
          value={v.title}
          onChange={(e) => set('title', e.target.value)}
          required
          maxLength={200}
          placeholder="Краткое название рассылки"
        />
      </label>

      <label className="adm-label">
        Текст сообщения *
        <textarea
          className="adm-textarea"
          value={v.messageText}
          onChange={(e) => set('messageText', e.target.value)}
          required
          rows={6}
          placeholder="Текст сообщения. Поддерживается HTML: <b>, <i>, <a href=...>"
        />
      </label>

      <label className="adm-label">
        Канал
        <select
          className="adm-select"
          value={v.channel}
          onChange={(e) => set('channel', e.target.value as BroadcastChannel)}
        >
          <option value="ALL">Telegram + MAX</option>
          <option value="TELEGRAM">Только Telegram</option>
          <option value="MAX">Только MAX</option>
        </select>
      </label>

      <label className="adm-label">
        URL изображения
        <input
          className="adm-input"
          value={v.imageUrl}
          onChange={(e) => set('imageUrl', e.target.value)}
          placeholder="https://…"
          type="url"
        />
      </label>

      <div className="adm-row">
        <label className="adm-label adm-label--grow">
          Текст кнопки
          <input
            className="adm-input"
            value={v.buttonText}
            onChange={(e) => set('buttonText', e.target.value)}
            placeholder="Подробнее"
          />
        </label>
        <label className="adm-label adm-label--grow">
          URL кнопки
          <input
            className="adm-input"
            value={v.buttonUrl}
            onChange={(e) => set('buttonUrl', e.target.value)}
            placeholder="https://…"
            type="url"
          />
        </label>
      </div>

      <label className="adm-label">
        Дата и время запуска (МСК, необязательно)
        <input
          className="adm-input"
          type="datetime-local"
          value={v.scheduledAt}
          onChange={(e) => set('scheduledAt', e.target.value)}
        />
        <span className="adm-hint">Если не указано — рассылка запустится немедленно после нажатия «Запустить».</span>
      </label>

      <div className="adm-form__footer">
        <button className="adm-btn adm-btn--primary" type="submit" disabled={saving}>
          {saving ? 'Сохранение…' : 'Сохранить'}
        </button>
      </div>
    </form>
  );
}
