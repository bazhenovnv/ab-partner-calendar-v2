'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi, ApiError, type SiteConfigRow } from '@/lib/admin-api';

// ── metadata for each exposed setting ─────────────────────────────────────

type FieldType = 'boolean' | 'number' | 'text';

interface SettingMeta {
  label: string;
  description: string;
  type: FieldType;
  group: string;
}

const SETTINGS_META: Record<string, SettingMeta> = {
  'bot.phoneRequired': {
    label: 'Требовать номер телефона',
    description: 'Если включено, бот запрашивает номер телефона перед созданием напоминаний.',
    type: 'boolean',
    group: 'Бот',
  },
  'cookie.noticeEnabled': {
    label: 'Показывать cookie-баннер',
    description: 'Включает или отключает отображение cookie-уведомления на публичном сайте.',
    type: 'boolean',
    group: 'Cookie',
  },
  'cookie.noticeText': {
    label: 'Текст cookie-уведомления',
    description: 'Текст, отображаемый в баннере.',
    type: 'text',
    group: 'Cookie',
  },
  'cookie.buttonText': {
    label: 'Текст кнопки cookie-баннера',
    description: 'Подпись кнопки принятия (например: «Понятно»).',
    type: 'text',
    group: 'Cookie',
  },
  'broadcast.cooldownHours': {
    label: 'Cooldown рассылки (часов)',
    description: 'Минимальный интервал между рассылками для одного пользователя. 0 — без ограничений.',
    type: 'number',
    group: 'Рассылки',
  },
  'broadcast.telegramRatePerSecond': {
    label: 'Скорость Telegram (сообщ./с)',
    description: 'Максимальное число сообщений в секунду для Telegram API. Не более 30.',
    type: 'number',
    group: 'Рассылки',
  },
  'broadcast.maxRatePerSecond': {
    label: 'Скорость MAX (сообщ./с)',
    description: 'Максимальное число сообщений в секунду для MAX API.',
    type: 'number',
    group: 'Рассылки',
  },
  'broadcast.maxRecipients': {
    label: 'Лимит получателей',
    description: 'Максимальное число получателей на рассылку. 0 — без ограничений.',
    type: 'number',
    group: 'Рассылки',
  },
  'broadcast.allowSimultaneous': {
    label: 'Разрешить одновременные рассылки',
    description: 'Если включено, несколько рассылок могут отправляться одновременно (отключает BR-022).',
    type: 'boolean',
    group: 'Рассылки',
  },
};

const GROUP_ORDER = ['Бот', 'Cookie', 'Рассылки'];

// ── helpers ────────────────────────────────────────────────────────────────

function parseValue(raw: unknown, type: FieldType): string {
  if (type === 'boolean') return raw === true ? 'true' : 'false';
  if (raw === null || raw === undefined) return '';
  return String(raw);
}

function encodeValue(str: string, type: FieldType): unknown {
  if (type === 'boolean') return str === 'true';
  if (type === 'number') {
    const n = Number(str);
    return Number.isFinite(n) ? n : 0;
  }
  return str;
}

// ── component ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [rows, setRows] = useState<SiteConfigRow[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [msgs, setMsgs] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const data = await adminApi.get<SiteConfigRow[]>('/admin/settings');
      setRows(data);
      const initial: Record<string, string> = {};
      for (const row of data) {
        const meta = SETTINGS_META[row.key];
        if (meta) initial[row.key] = parseValue(row.value, meta.type);
      }
      setDrafts(initial);
      setDirty({});
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Ошибка загрузки');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function handleChange(key: string, val: string) {
    setDrafts((prev) => ({ ...prev, [key]: val }));
    setDirty((prev) => ({ ...prev, [key]: true }));
  }

  async function handleSave(key: string) {
    const meta = SETTINGS_META[key];
    if (!meta) return;
    setSaving((prev) => ({ ...prev, [key]: true }));
    try {
      await adminApi.patch(`/admin/settings/${encodeURIComponent(key)}`, {
        value: encodeValue(drafts[key] ?? '', meta.type),
      });
      setDirty((prev) => ({ ...prev, [key]: false }));
      flash(key, 'Сохранено');
    } catch (err) {
      flash(key, err instanceof ApiError ? `Ошибка: ${err.message}` : 'Ошибка сохранения');
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  }

  function flash(key: string, msg: string) {
    setMsgs((prev) => ({ ...prev, [key]: msg }));
    setTimeout(() => setMsgs((prev) => ({ ...prev, [key]: '' })), 3000);
  }

  // group rows by meta group
  const grouped: Record<string, SiteConfigRow[]> = {};
  if (rows) {
    for (const row of rows) {
      const meta = SETTINGS_META[row.key];
      if (!meta) continue;
      (grouped[meta.group] ??= []).push(row);
    }
  }

  return (
    <div className="adm-page">
      <div className="adm-page__header">
        <h1 className="adm-page__title">Настройки</h1>
      </div>
      <p className="adm-muted">Системные настройки сайта и рассылок. Изменения применяются немедленно.</p>

      {loadError && <p className="adm-error">{loadError}</p>}
      {!rows && !loadError && <p className="adm-muted">Загрузка…</p>}

      {rows && GROUP_ORDER.map((group) => {
        const groupRows = grouped[group];
        if (!groupRows?.length) return null;
        return (
          <section key={group} className="adm-settings-group">
            <h2 className="adm-settings-group__title">{group}</h2>
            <div className="adm-settings-list">
              {groupRows.map((row) => {
                const meta = SETTINGS_META[row.key];
                if (!meta) return null;
                const val = drafts[row.key] ?? '';
                const isDirty = dirty[row.key] ?? false;
                const isSaving = saving[row.key] ?? false;
                const msg = msgs[row.key] ?? '';

                return (
                  <div key={row.key} className="adm-setting">
                    <div className="adm-setting__info">
                      <span className="adm-setting__label">{meta.label}</span>
                      <span className="adm-setting__desc">{meta.description}</span>
                      <span className="adm-setting__key adm-mono">{row.key}</span>
                    </div>
                    <div className="adm-setting__control">
                      {meta.type === 'boolean' ? (
                        <select
                          className="adm-select adm-select--sm"
                          value={val}
                          onChange={(e) => handleChange(row.key, e.target.value)}
                        >
                          <option value="true">Включено</option>
                          <option value="false">Выключено</option>
                        </select>
                      ) : meta.type === 'number' ? (
                        <input
                          className="adm-input adm-input--sm adm-input--num"
                          type="number"
                          min={0}
                          value={val}
                          onChange={(e) => handleChange(row.key, e.target.value)}
                        />
                      ) : (
                        <textarea
                          className="adm-textarea adm-textarea--sm"
                          rows={3}
                          value={val}
                          onChange={(e) => handleChange(row.key, e.target.value)}
                        />
                      )}
                      <button
                        className="adm-btn adm-btn--sm adm-btn--primary"
                        onClick={() => handleSave(row.key)}
                        disabled={!isDirty || isSaving}
                        type="button"
                      >
                        {isSaving ? '…' : 'Сохранить'}
                      </button>
                      {msg && (
                        <span className={`adm-setting__msg${msg.startsWith('Ошибка') ? ' adm-setting__msg--err' : ''}`}>
                          {msg}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
