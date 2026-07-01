import { isoToIcsDate } from './format';

interface IcsEventOptions {
  id: string;
  title: string;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  url?: string | null;
  location?: string | null;
}

export function generateIcs(event: IcsEventOptions): string {
  const dtStart = isoToIcsDate(event.startDate);
  const dtEnd = event.endDate
    ? isoToIcsDate(event.endDate)
    : isoToIcsDate(new Date(new Date(event.startDate).getTime() + 3 * 60 * 60 * 1000).toISOString());

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AB Afisha Bukhgaltera//AB Event//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@ab-event.pro`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcs(event.title)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcs(event.description)}`);
  }
  if (event.url) {
    lines.push(`URL:${event.url}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeIcs(event.location)}`);
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

function escapeIcs(value: string): string {
  return value.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
}

export function downloadIcs(icsContent: string, filename: string): void {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
