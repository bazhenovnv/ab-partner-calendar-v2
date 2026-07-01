import type { BroadcastStatus } from '@/lib/admin-api';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  SCHEDULED: 'Запланирована',
  QUEUED: 'В очереди',
  SENDING: 'Отправляется',
  PAUSED: 'Пауза',
  SENT: 'Отправлена',
  FAILED: 'Ошибка',
  CANCELLED: 'Отменена',
};

const STATUS_MOD: Record<string, string> = {
  DRAFT: 'gray',
  SCHEDULED: 'blue',
  QUEUED: 'orange',
  SENDING: 'blue-pulse',
  PAUSED: 'orange',
  SENT: 'green',
  FAILED: 'red',
  CANCELLED: 'gray',
};

export function StatusBadge({ status, large }: { status: string; large?: boolean }) {
  const mod = STATUS_MOD[status] ?? 'gray';
  return (
    <span className={`adm-badge adm-badge--${mod}${large ? ' adm-badge--lg' : ''}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
