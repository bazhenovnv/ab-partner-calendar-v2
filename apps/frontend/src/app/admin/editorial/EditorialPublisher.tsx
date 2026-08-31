'use client';

import DOMPurify from 'dompurify';
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './editorial.module.css';
import ux from './editorial-v2.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

type Platform = 'TELEGRAM' | 'MAX';
type ContentType = 'NEWS' | 'EVENT';
type PlacementMode = 'now' | 'scheduled';

type Channel = {
  key: string;
  platform: Platform;
  name: string;
  publicUrl: string;
  configured: boolean;
  targetId: string | null;
  configurationHint: string | null;
  capabilities: {
    richText: boolean;
    images: boolean;
    nativeViews: boolean;
  };
};

type MediaItem = {
  url: string;
  relativeUrl?: string;
  template: string;
  templateLabel?: string;
  width?: number;
  height?: number;
  sourceWidth?: number;
  sourceHeight?: number;
  sourceFormat?: string;
};

type Publication = {
  id: string;
  channelKey: string;
  channelName: string;
  platform: Platform;
  status: string;
  providerMessageId: string | null;
  providerUrl: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  views: number | null;
  publishedAt: string | null;
};

type EditorialPost = {
  id: string;
  contentType: ContentType;
  title: string;
  contentHtml: string;
  contentText: string;
  media: MediaItem[];
  channelKeys: string[];
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  publications: Publication[];
};

type Dashboard = {
  counters: {
    news: number;
    events: number;
    publications: number;
    failed: number;
  };
  byChannel: Array<{
    key: string;
    name: string;
    platform: Platform;
    published: number;
    failed: number;
    nativeViewsAvailable: boolean;
  }>;
  chart: Array<{
    date: string;
    channels: Record<string, number>;
  }>;
  recentErrors: Array<{
    id: string;
    postId: string;
    channelKey: string;
    channelName: string;
    errorCode: string | null;
    errorMessage: string | null;
    updatedAt: string;
  }>;
  statsNotice: string;
};

type PublishResponse = {
  ok: boolean;
  status: string;
  successCount: number;
  failedCount: number;
  results: Array<{
    channelKey: string;
    channelName: string;
    platform: Platform;
    success: boolean;
    messageId?: string;
    url?: string;
    errorCode?: string;
    errorMessage?: string;
  }>;
};

type ScheduleResponse = {
  ok: boolean;
  status: string;
  scheduledAt: string;
  channelKeys: string[];
};

type PostsResponse = {
  items: EditorialPost[];
  total: number;
};

const IMAGE_TEMPLATES = [
  { value: 'original', label: 'Оригинальный размер' },
  { value: 'square', label: 'Квадрат 1:1 — 1080×1080' },
  { value: 'portrait', label: 'Вертикальный 4:5 — 1080×1350' },
  { value: 'landscape', label: 'Горизонтальный 16:9 — 1280×720' },
  { value: 'story', label: 'История 9:16 — 1080×1920' },
];

const EMOJI: Record<string, string[]> = {
  Часто: ['😀', '😊', '👍', '🔥', '❤️', '✅', '❗', '📌', '📅', '🎯', '💡', '🚀', '🎉', '👏', '🙏', '😉', '🙂', '🤝', '⭐', '✨'],
  Лица: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😍', '🥰', '😘', '😎', '🤓', '🧐', '🤔', '🤩', '🥳', '😌', '😏', '😮', '😯', '😲', '🥺', '😢', '😭'],
  Жесты: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '👋', '👏', '🙌', '👐', '🤝', '🙏', '💪', '✍️'],
  Работа: ['💼', '📊', '📈', '📉', '🧾', '💰', '💳', '🏦', '🧮', '📚', '📝', '📎', '📁', '📂', '🗂️', '📌', '📍', '🔍', '💡', '⚙️', '🛠️', '🔔', '⏰', '📅'],
  События: ['🎯', '🚀', '🎓', '🎤', '🎬', '🎟️', '🏆', '🥇', '🎁', '🎉', '🎊', '✨', '⭐', '🌟', '🔥', '💥', '📣', '📢', '✅', '☑️', '❗', '❓', '➡️', '⬇️'],
  Сердца: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
};

const CHART_COLORS: Record<string, string> = {
  TG_A_BPORTAL: '#229ED9',
  TG_AB_AFISHA_BUH: '#166fa2',
  MAX_CHANNEL_1: '#7357e8',
  MAX_CHANNEL_2: '#9a56d9',
};

const CHANNEL_LABELS: Record<string, string> = {
  MAX_CHANNEL_1: 'Макс - "АБ Афиша бухгалтера простая"',
  MAX_CHANNEL_2: 'Макс - "АБ| Афиша бухгалтера"',
  TG_A_BPORTAL: 'ТГ - "АБ Портал"',
  TG_AB_AFISHA_BUH: 'ТГ - "АБ Афиша бухгалтера"',
};

const ALLOWED_TAGS = ['b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del', 'a', 'br', 'p', 'div', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre'];

function channelLabel(key: string, fallback?: string) {
  return CHANNEL_LABELS[key] || fallback || key;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window === 'undefined' ? null : localStorage.getItem('admin_token');
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init?.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'message' in body
        ? String((body as { message?: unknown }).message || `HTTP ${response.status}`)
        : String(body || `HTTP ${response.status}`);
    throw new Error(message);
  }
  return body as T;
}

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function toDateTimeLocal(value: Date | string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function defaultScheduleValue() {
  return toDateTimeLocal(new Date(Date.now() + 30 * 60_000));
}

function ViewsChart({ dashboard, channels }: { dashboard: Dashboard | null; channels: Channel[] }) {
  const points = dashboard?.chart ?? [];
  if (!points.length) {
    return <div className={styles.previewEmpty}>Статистика просмотров появится после публикаций и первой синхронизации.</div>;
  }

  const width = 760;
  const height = 220;
  const padX = 44;
  const padTop = 18;
  const padBottom = 32;
  const innerW = width - padX - 16;
  const innerH = height - padTop - padBottom;
  const maxValue = Math.max(1, ...points.flatMap((point) => Object.values(point.channels)));
  const x = (index: number) => padX + (points.length <= 1 ? innerW / 2 : (index / (points.length - 1)) * innerW);
  const y = (value: number) => padTop + innerH - (value / maxValue) * innerH;

  return (
    <>
      <div className={styles.chartWrap}>
        <svg className={styles.chart} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="График просмотров публикаций">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const value = Math.round(maxValue * ratio);
            const yy = y(value);
            return (
              <g key={ratio}>
                <line className={styles.chartGrid} x1={padX} x2={width - 16} y1={yy} y2={yy} />
                <text className={styles.chartAxisText} x={4} y={yy + 3}>{value}</text>
              </g>
            );
          })}
          {channels.map((channel) => {
            const coords = points
              .map((point, index) => ({ x: x(index), y: y(point.channels[channel.key] ?? 0) }))
              .map((point) => `${point.x},${point.y}`)
              .join(' ');
            return (
              <polyline
                key={channel.key}
                points={coords}
                fill="none"
                stroke={CHART_COLORS[channel.key] ?? '#55756d'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
          {points.map((point, index) => {
            if (index !== 0 && index !== points.length - 1 && index % Math.ceil(points.length / 5) !== 0) return null;
            return (
              <text key={point.date} className={styles.chartAxisText} x={x(index)} y={height - 8} textAnchor="middle">
                {point.date.slice(5).split('-').reverse().join('.')}
              </text>
            );
          })}
        </svg>
      </div>
      <div className={styles.legend}>
        {channels.map((channel) => (
          <span className={styles.legendItem} key={channel.key}>
            <span className={styles.legendDot} style={{ background: CHART_COLORS[channel.key] ?? '#55756d' }} />
            {channelLabel(channel.key, channel.name)}{!channel.capabilities.nativeViews ? ' — native views недоступны Bot API' : ''}
          </span>
        ))}
      </div>
    </>
  );
}

function ChannelColumn({
  title,
  channels,
  selectedChannels,
  onToggle,
}: {
  title: string;
  channels: Channel[];
  selectedChannels: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div className={ux.channelColumn}>
      <h3 className={ux.channelColumnTitle}>{title}</h3>
      <div className={ux.channelColumnList}>
        {channels.map((channel) => {
          const selected = selectedChannels.includes(channel.key);
          return (
            <label
              key={channel.key}
              className={`${styles.channelCard} ${selected ? styles.channelCardSelected : ''} ${!channel.configured ? styles.channelCardDisabled : ''}`}
            >
              <input className={styles.channelCheck} type="checkbox" checked={selected} onChange={() => onToggle(channel.key)} />
              <span style={{ minWidth: 0 }}>
                <span className={styles.channelName}>{channelLabel(channel.key, channel.name)}</span>
                <span className={styles.channelUrl}>{channel.publicUrl}</span>
                {!channel.configured && (
                  <span className={styles.channelWarning}>
                    {channel.configurationHint || 'Канал пока не настроен. При публикации кабинет покажет точную ошибку конфигурации.'}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function EditorialPublisher() {
  const editorRef = useRef<HTMLDivElement>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [recentPosts, setRecentPosts] = useState<EditorialPost[]>([]);
  const [contentType, setContentType] = useState<ContentType>('NEWS');
  const [title, setTitle] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [contentText, setContentText] = useState('');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [template, setTemplate] = useState('original');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [placementMode, setPlacementMode] = useState<PlacementMode>('now');
  const [scheduledAtLocal, setScheduledAtLocal] = useState(defaultScheduleValue);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState('Часто');
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState('DRAFT');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [publishResult, setPublishResult] = useState<PublishResponse | null>(null);
  const [scheduleResult, setScheduleResult] = useState<ScheduleResponse | null>(null);

  const refresh = useCallback(async () => {
    const [channelData, dashboardData, postsData] = await Promise.all([
      api<Channel[]>('/editorial/channels'),
      api<Dashboard>('/editorial/dashboard?days=30'),
      api<PostsResponse>('/editorial/posts?page=1&limit=10'),
    ]);
    setChannels(channelData);
    setDashboard(dashboardData);
    setRecentPosts(postsData.items);
  }, []);

  useEffect(() => {
    refresh()
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [refresh]);

  const sanitizedPreview = useMemo(
    () => DOMPurify.sanitize(contentHtml, { ALLOWED_TAGS, ALLOWED_ATTR: ['href', 'target', 'rel'] }),
    [contentHtml],
  );

  const selectedPreviewChannels = channels.filter((channel) => selectedChannels.includes(channel.key));
  const maxChannels = channels.filter((channel) => channel.platform === 'MAX');
  const telegramChannels = channels.filter((channel) => channel.platform === 'TELEGRAM');

  function syncEditor() {
    const element = editorRef.current;
    if (!element) return;
    setContentHtml(element.innerHTML);
    setContentText(element.innerText.trim());
  }

  function exec(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncEditor();
  }

  function addLink() {
    const url = window.prompt('Вставьте ссылку, начинающуюся с https://');
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setError('Ссылка должна начинаться с http:// или https://');
      return;
    }
    exec('createLink', url);
  }

  function insertEmoji(emoji: string) {
    editorRef.current?.focus();
    document.execCommand('insertText', false, emoji);
    syncEditor();
  }

  function toggleChannel(key: string) {
    setSelectedChannels((previous) =>
      previous.includes(key) ? previous.filter((item) => item !== key) : [...previous, key],
    );
  }

  function selectAllChannels() {
    setSelectedChannels(channels.map((channel) => channel.key));
  }

  function resetEditor() {
    setContentType('NEWS');
    setTitle('');
    setContentHtml('');
    setContentText('');
    setMedia([]);
    setTemplate('original');
    setSelectedChannels([]);
    setPlacementMode('now');
    setScheduledAtLocal(defaultScheduleValue());
    setCurrentPostId(null);
    setCurrentStatus('DRAFT');
    setPublishResult(null);
    setScheduleResult(null);
    setError('');
    if (editorRef.current) editorRef.current.innerHTML = '';
  }

  async function uploadImages(files: FileList | null) {
    if (!files?.length) return;
    if (media.length >= 10) {
      setError('Можно прикрепить не более 10 изображений к одной публикации.');
      return;
    }

    setUploading(true);
    setError('');
    const available = Math.max(0, 10 - media.length);
    const selected = Array.from(files).slice(0, available);
    const uploaded: MediaItem[] = [];
    const failures: string[] = [];

    for (const file of selected) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const result = await api<MediaItem>(`/editorial/upload?template=${encodeURIComponent(template)}`, {
          method: 'POST',
          body: formData,
        });
        uploaded.push(result);
      } catch (err) {
        failures.push(`${file.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (uploaded.length) {
      setMedia((previous) => [...previous, ...uploaded]);
    }
    if (files.length > available) {
      failures.push(`Ещё ${files.length - available} файл(а) не добавлены: лимит — 10 изображений.`);
    }
    if (failures.length) {
      setError(`Не все изображения обработаны. ${failures.join(' | ')}`);
    }
    setUploading(false);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    void uploadImages(input.files).finally(() => {
      input.value = '';
    });
  }

  function payload() {
    return {
      contentType,
      title: title.trim(),
      contentHtml: DOMPurify.sanitize(contentHtml, { ALLOWED_TAGS, ALLOWED_ATTR: ['href'] }),
      contentText,
      media,
      channelKeys: selectedChannels,
      scheduledAt:
        placementMode === 'scheduled' && scheduledAtLocal
          ? new Date(scheduledAtLocal).toISOString()
          : null,
    };
  }

  async function saveDraft() {
    if (!title.trim()) throw new Error('Введите название публикации');
    if (!contentText.trim()) throw new Error('Введите текст публикации');

    const canUpdate = currentPostId && ['DRAFT', 'FAILED', 'PARTIAL_FAILED', 'SCHEDULED'].includes(currentStatus);
    const saved = canUpdate
      ? await api<EditorialPost>(`/editorial/posts/${currentPostId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload()),
        })
      : await api<EditorialPost>('/editorial/posts', {
          method: 'POST',
          body: JSON.stringify(payload()),
        });
    setCurrentPostId(saved.id);
    setCurrentStatus(saved.status);
    return saved.id;
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setScheduleResult(null);
    try {
      await saveDraft();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!selectedChannels.length) {
      setError('Выберите хотя бы один канал публикации.');
      return;
    }

    if (placementMode === 'scheduled') {
      if (!scheduledAtLocal) {
        setError('Укажите дату и время размещения.');
        return;
      }
      const scheduledDate = new Date(scheduledAtLocal);
      if (Number.isNaN(scheduledDate.getTime()) || scheduledDate.getTime() < Date.now() + 15_000) {
        setError('Время размещения должно быть позже текущего времени.');
        return;
      }
    }

    setPublishing(true);
    setError('');
    setPublishResult(null);
    setScheduleResult(null);

    try {
      const id = await saveDraft();
      if (placementMode === 'scheduled') {
        const result = await api<ScheduleResponse>(`/editorial/posts/${id}/schedule`, {
          method: 'POST',
          body: JSON.stringify({
            channelKeys: selectedChannels,
            scheduledAt: new Date(scheduledAtLocal).toISOString(),
          }),
        });
        setScheduleResult(result);
        setCurrentStatus(result.status);
      } else {
        const result = await api<PublishResponse>(`/editorial/posts/${id}/publish`, {
          method: 'POST',
          body: JSON.stringify({ channelKeys: selectedChannels }),
        });
        setPublishResult(result);
        setCurrentStatus(result.status);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPublishing(false);
    }
  }

  async function loadPost(id: string) {
    setError('');
    try {
      const post = await api<EditorialPost>(`/editorial/posts/${id}`);
      setCurrentPostId(post.id);
      setCurrentStatus(post.status);
      setContentType(post.contentType);
      setTitle(post.title);
      setContentHtml(post.contentHtml);
      setContentText(post.contentText);
      setMedia(Array.isArray(post.media) ? post.media : []);
      setSelectedChannels(post.channelKeys || []);
      if (post.status === 'SCHEDULED' && post.scheduledAt) {
        setPlacementMode('scheduled');
        setScheduledAtLocal(toDateTimeLocal(post.scheduledAt));
      } else {
        setPlacementMode('now');
        setScheduledAtLocal(defaultScheduleValue());
      }
      setPublishResult(null);
      setScheduleResult(null);
      requestAnimationFrame(() => {
        if (editorRef.current) editorRef.current.innerHTML = post.contentHtml;
      });
      window.scrollTo({ top: 560, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function retryChannel(postId: string, channelKey: string) {
    setError('');
    try {
      const result = await api<PublishResponse>(`/editorial/posts/${postId}/retry`, {
        method: 'POST',
        body: JSON.stringify({ channelKeys: [channelKey] }),
      });
      setPublishResult(result);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function syncStats() {
    setSyncing(true);
    setError('');
    try {
      await api('/editorial/stats/sync', { method: 'POST' });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return <div className="adm-page"><p className="adm-muted">Загрузка редакционного кабинета…</p></div>;
  }

  const placementDescription =
    placementMode === 'scheduled' && scheduledAtLocal
      ? `Запланировано: ${formatDate(new Date(scheduledAtLocal))}`
      : 'Размещение: сразу после нажатия кнопки';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Редактор публикаций ТГ / MAX</h1>
          <p className={styles.subtitle}>
            Единый кабинет для новостей и событий: форматированный текст, изображения без обрезки,
            эмодзи, публикация сейчас или по времени, выбор каналов, общий предпросмотр и статистика.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.buttonGhost} type="button" onClick={syncStats} disabled={syncing}>
            {syncing ? 'Синхронизация…' : 'Обновить просмотры'}
          </button>
          <button className={styles.buttonPrimary} type="button" onClick={resetEditor}>Новая публикация</button>
        </div>
      </header>

      {error && <div className={styles.errorBox}><strong>Ошибка:</strong> {error}</div>}

      <section className={styles.statsGrid}>
        <div className={styles.statCard}><span className={styles.statLabel}>Новости</span><strong className={styles.statValue}>{dashboard?.counters.news ?? 0}</strong></div>
        <div className={styles.statCard}><span className={styles.statLabel}>События</span><strong className={styles.statValue}>{dashboard?.counters.events ?? 0}</strong></div>
        <div className={styles.statCard}><span className={styles.statLabel}>Размещено по каналам</span><strong className={styles.statValue}>{dashboard?.counters.publications ?? 0}</strong></div>
        <div className={styles.statCard}><span className={styles.statLabel}>Ошибки размещения</span><strong className={styles.statValue}>{dashboard?.counters.failed ?? 0}</strong></div>
      </section>

      <section className={styles.topGrid}>
        <div className={styles.panel}>
          <div className={styles.panelTitleRow}><h2 className={styles.panelTitle}>Просмотры публикаций · 30 дней</h2></div>
          <ViewsChart dashboard={dashboard} channels={channels} />
          {dashboard?.statsNotice && <div className={styles.notice}>{dashboard.statsNotice}</div>}
        </div>
        <div className={styles.panel}>
          <div className={styles.panelTitleRow}><h2 className={styles.panelTitle}>Размещения по каналам</h2></div>
          <div className={styles.channelStats}>
            {(dashboard?.byChannel ?? []).map((row) => (
              <div className={styles.channelStat} key={row.key}>
                <strong>{channelLabel(row.key, row.name)}</strong>
                <span>Успешно: {row.published} · Ошибок: {row.failed}</span>
                <span>{row.nativeViewsAvailable ? 'Нативные просмотры доступны' : 'Публикации считаются; native views требуют MTProto'}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.editorLayout}>
        <div className={styles.editorPanel}>
          <div className={styles.editorHead}>
            <div className={styles.typeTabs}>
              <button type="button" className={`${styles.typeTab} ${contentType === 'NEWS' ? styles.typeTabActive : ''}`} onClick={() => setContentType('NEWS')}>Новость</button>
              <button type="button" className={`${styles.typeTab} ${contentType === 'EVENT' ? styles.typeTabActive : ''}`} onClick={() => setContentType('EVENT')}>Событие</button>
            </div>
            {currentPostId && <span className={styles.muted}> ID: {currentPostId.slice(0, 8)} · статус {currentStatus}</span>}
          </div>

          <div className={styles.formBody}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="editorial-title">Название</label>
              <input id="editorial-title" className={styles.input} value={title} maxLength={240} onChange={(event) => setTitle(event.target.value)} placeholder="Например: Новые правила НДС с 1 сентября" />
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Изображения · до 10 файлов</span>
              <div className={styles.mediaTop}>
                <select className={styles.templateSelect} value={template} onChange={(event) => setTemplate(event.target.value)}>
                  {IMAGE_TEMPLATES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
                <label className={styles.fileLabel}>
                  {uploading ? 'Обработка…' : '+ Добавить изображения'}
                  <input
                    className={styles.fileInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.avif,.gif,.heic,.heif"
                    multiple
                    disabled={uploading}
                    onChange={handleFileChange}
                  />
                </label>
                <span className={ux.uploadSummary}>Кадр сохраняется целиком. Шаблоны дополняются полями без обрезки изображения.</span>
              </div>
              {media.length > 0 && (
                <div className={styles.mediaGrid}>
                  {media.map((item, index) => (
                    <div className={styles.mediaCard} key={`${item.url}-${index}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className={ux.mediaImageFull} src={item.url} alt={`Изображение ${index + 1}`} />
                      <button className={styles.mediaRemove} type="button" aria-label="Удалить изображение" onClick={() => setMedia((previous) => previous.filter((_, i) => i !== index))}>×</button>
                      <div className={styles.mediaMeta}>
                        {item.templateLabel || item.template}
                        {item.width && item.height ? ` · ${item.width}×${item.height}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Текст публикации</span>
              <div className={styles.toolbar} role="toolbar" aria-label="Форматирование текста">
                <button className={styles.toolButton} type="button" title="Отменить" onClick={() => exec('undo')}>↶</button>
                <button className={styles.toolButton} type="button" title="Повторить" onClick={() => exec('redo')}>↷</button>
                <span className={styles.toolSep} />
                <button className={styles.toolButton} type="button" title="Жирный" onClick={() => exec('bold')}>B</button>
                <button className={styles.toolButton} type="button" title="Курсив" onClick={() => exec('italic')}><i>I</i></button>
                <button className={styles.toolButton} type="button" title="Подчёркивание" onClick={() => exec('underline')}><u>U</u></button>
                <button className={styles.toolButton} type="button" title="Зачёркивание" onClick={() => exec('strikeThrough')}><s>S</s></button>
                <span className={styles.toolSep} />
                <button className={styles.toolButton} type="button" title="Маркированный список" onClick={() => exec('insertUnorderedList')}>•≡</button>
                <button className={styles.toolButton} type="button" title="Нумерованный список" onClick={() => exec('insertOrderedList')}>1≡</button>
                <button className={styles.toolButton} type="button" title="Цитата" onClick={() => exec('formatBlock', 'blockquote')}>❝</button>
                <button className={styles.toolButton} type="button" title="Ссылка" onClick={addLink}>🔗</button>
                <button className={styles.toolButton} type="button" title="Очистить формат" onClick={() => exec('removeFormat')}>Tx</button>
                <span className={styles.toolSep} />
                <button className={styles.toolButton} type="button" title="Эмодзи Telegram / MAX" onClick={() => setEmojiOpen((value) => !value)}>😊</button>
              </div>
              <div
                ref={editorRef}
                className={styles.editor}
                contentEditable
                suppressContentEditableWarning
                onInput={syncEditor}
                data-placeholder="Введите текст как в обычном текстовом редакторе. Форматирование будет адаптировано под Telegram и MAX."
              />
              <div className={`${styles.charCounter} ${(title.length + contentText.length) > 3700 ? styles.charCounterWarn : ''}`}>
                {title.length + contentText.length} / 3900 символов для совместимой публикации ТГ + MAX
              </div>
              {emojiOpen && (
                <div className={styles.emojiPopover}>
                  <div className={styles.emojiTabs}>
                    {Object.keys(EMOJI).map((category) => (
                      <button key={category} className={styles.emojiTab} type="button" onClick={() => setEmojiCategory(category)}>{category}</button>
                    ))}
                  </div>
                  <div className={styles.emojiGrid}>
                    {EMOJI[emojiCategory].map((emoji, index) => (
                      <button key={`${emoji}-${index}`} className={styles.emojiButton} type="button" onClick={() => insertEmoji(emoji)}>{emoji}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Время размещения</span>
              <div className={ux.placementBox}>
                <div className={ux.placementModes}>
                  <label className={`${ux.placementOption} ${placementMode === 'now' ? ux.placementOptionActive : ''}`}>
                    <input type="radio" name="placement-mode" checked={placementMode === 'now'} onChange={() => setPlacementMode('now')} />
                    Разместить сейчас
                  </label>
                  <label className={`${ux.placementOption} ${placementMode === 'scheduled' ? ux.placementOptionActive : ''}`}>
                    <input type="radio" name="placement-mode" checked={placementMode === 'scheduled'} onChange={() => setPlacementMode('scheduled')} />
                    Запланировать
                  </label>
                </div>
                {placementMode === 'scheduled' && (
                  <div className={ux.scheduleRow}>
                    <input
                      className={ux.datetimeInput}
                      type="datetime-local"
                      value={scheduledAtLocal}
                      min={toDateTimeLocal(new Date(Date.now() + 15_000))}
                      onChange={(event) => setScheduledAtLocal(event.target.value)}
                    />
                    <span className={styles.muted}>Время берётся из часового пояса браузера. Сервер проверяет очередь каждые 15 секунд.</span>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.field}>
              <div className={styles.channelHead}>
                <span className={styles.label}>Куда разместить</span>
                <button className={styles.buttonGhost} type="button" onClick={selectedChannels.length === channels.length ? () => setSelectedChannels([]) : selectAllChannels}>
                  {selectedChannels.length === channels.length ? 'Снять все' : 'Выбрать все'}
                </button>
              </div>
              <div className={ux.channelColumns}>
                <ChannelColumn title="Макс" channels={maxChannels} selectedChannels={selectedChannels} onToggle={toggleChannel} />
                <ChannelColumn title="ТГ" channels={telegramChannels} selectedChannels={selectedChannels} onToggle={toggleChannel} />
              </div>
            </div>
          </div>

          <div className={styles.formActions}>
            <button className={styles.button} type="button" onClick={handleSave} disabled={saving || publishing}>{saving ? 'Сохранение…' : 'Сохранить черновик'}</button>
            <button className={styles.buttonPrimary} type="button" onClick={handlePublish} disabled={publishing || saving}>
              {publishing
                ? placementMode === 'scheduled' ? 'Планирование…' : 'Размещение…'
                : placementMode === 'scheduled'
                  ? `Запланировать (${selectedChannels.length})`
                  : `Проверено — разместить (${selectedChannels.length})`}
            </button>
          </div>
        </div>

        <aside className={styles.previewPanel}>
          <div className={styles.panelTitleRow}>
            <h2 className={styles.panelTitle}>Общий предварительный просмотр</h2>
          </div>
          <div className={styles.phone}>
            <div className={styles.phoneHead}>
              <span className={styles.avatar}>АБ</span>
              <div style={{ minWidth: 0 }}>
                <strong>Публикация в каналах</strong>
                <div className={ux.previewChannelList}>
                  {selectedPreviewChannels.length
                    ? selectedPreviewChannels.map((channel) => channelLabel(channel.key, channel.name)).join(' · ')
                    : 'Каналы пока не выбраны'}
                </div>
              </div>
            </div>
            <div className={styles.phoneBody}>
              <div className={ux.previewTiming}>{placementDescription}</div>
              {!title && !contentText && !media.length ? (
                <div className={styles.previewEmpty}>Начните вводить текст или добавьте изображение.</div>
              ) : (
                <article className={styles.message}>
                  {media.length > 0 && (
                    <div className={ux.previewMediaStack}>
                      {media.map((item, index) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className={ux.previewImage} src={item.url} alt={`Предпросмотр изображения ${index + 1}`} key={`${item.url}-preview-${index}`} />
                      ))}
                    </div>
                  )}
                  <div className={styles.messageText}>
                    {title && <><strong>{title}</strong><br /><br /></>}
                    <div dangerouslySetInnerHTML={{ __html: sanitizedPreview }} />
                  </div>
                </article>
              )}
            </div>
          </div>
          <div className={styles.notice}>
            Показывается весь подготовленный файл без скрытой обрезки. Именно этот файл отправляется в ТГ и MAX; сами приложения могут добавлять собственные поля, шрифты и оформление альбома.
          </div>

          {scheduleResult && (
            <div className={ux.scheduleSuccess}>
              <strong>Публикация запланирована</strong><br />
              {formatDate(scheduleResult.scheduledAt)} · каналов: {scheduleResult.channelKeys.length}
            </div>
          )}

          {publishResult && (
            <div className={publishResult.ok ? styles.successBox : styles.resultBox}>
              <strong>{publishResult.ok ? 'Размещение завершено' : `Частичное размещение: успешно ${publishResult.successCount}, ошибок ${publishResult.failedCount}`}</strong>
              {publishResult.results.map((result) => (
                <div className={styles.resultRow} key={result.channelKey}>
                  <span>
                    {channelLabel(result.channelKey, result.channelName)}
                    {!result.success && <><br /><small>{result.errorCode}: {result.errorMessage}</small></>}
                    {result.success && result.url && <><br /><a href={result.url} target="_blank" rel="noreferrer">Открыть публикацию</a></>}
                  </span>
                  <span className={result.success ? styles.resultOk : styles.resultFail}>{result.success ? 'Размещено' : 'Ошибка'}</span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </section>

      <section className={styles.bottomGrid}>
        <div className={styles.panel}>
          <div className={styles.panelTitleRow}><h2 className={styles.panelTitle}>Последние публикации и черновики</h2><span className={styles.muted}>Показаны последние 10</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table}>
              <thead><tr><th>Тип</th><th>Название</th><th>Статус</th><th>Каналы</th><th>Время размещения</th><th>Изменено</th><th /></tr></thead>
              <tbody>
                {recentPosts.map((post) => (
                  <tr key={post.id}>
                    <td>{post.contentType === 'EVENT' ? 'Событие' : 'Новость'}</td>
                    <td>{post.title}</td>
                    <td><span className={styles.status}>{post.status}</span></td>
                    <td>{post.publications?.filter((item) => item.status === 'PUBLISHED').length ?? 0}/{post.channelKeys?.length ?? 0}</td>
                    <td>
                      {post.status === 'SCHEDULED' && post.scheduledAt
                        ? `Запланировано: ${formatDate(post.scheduledAt)}`
                        : post.publishedAt
                          ? formatDate(post.publishedAt)
                          : '—'}
                    </td>
                    <td>{formatDate(post.updatedAt)}</td>
                    <td><button className={styles.buttonGhost} type="button" onClick={() => loadPost(post.id)}>Открыть</button></td>
                  </tr>
                ))}
                {!recentPosts.length && <tr><td colSpan={7} className={styles.muted}>Публикаций пока нет.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTitleRow}><h2 className={styles.panelTitle}>Ошибки размещения</h2><span className={styles.muted}>Последние 8</span></div>
          <div className={styles.errorList}>
            {(dashboard?.recentErrors ?? []).map((item) => (
              <div className={styles.errorItem} key={item.id}>
                <strong>{channelLabel(item.channelKey, item.channelName)} · {item.errorCode || 'ERROR'}</strong>
                <p>{item.errorMessage || 'Неизвестная ошибка'}<br />{formatDate(item.updatedAt)}</p>
                <button className={styles.buttonGhost} type="button" onClick={() => retryChannel(item.postId, item.channelKey)}>Повторить только этот канал</button>
              </div>
            ))}
            {!dashboard?.recentErrors.length && <div className={styles.muted}>Ошибок размещения нет.</div>}
          </div>
        </div>
      </section>
    </div>
  );
}
