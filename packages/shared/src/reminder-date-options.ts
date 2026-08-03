export const MOSCOW_TIME_ZONE = 'Europe/Moscow';

const MOSCOW_OFFSET_HOURS = 3;
const DEFAULT_REMINDER_TIME = '09:00';
const DAYS_BEFORE_EVENT = [30, 14, 7, 3, 1, 0] as const;

export interface ReminderDateOption {
  id: string;
  label: string;
  remindAt: string;
}

export interface ReminderCalendarDay {
  dateId: string | null;
  day: number | null;
  enabled: boolean;
}

export interface ReminderCalendarView {
  monthId: string;
  label: string;
  weeks: ReminderCalendarDay[][];
  canGoPrevious: boolean;
  canGoNext: boolean;
}

export interface ReminderDateTimeOption {
  id: string;
  dateId: string;
  time: string;
  label: string;
  remindAt: string;
}

interface DateParts {
  year: number;
  month: number;
  day: number;
}

function getMoscowDateParts(date: Date): DateParts | null {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MOSCOW_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  return year && month && day ? { year, month, day } : null;
}

function parseDateId(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function parseTime(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59
    ? { hour, minute }
    : null;
}

function formatDateId(parts: DateParts): string {
  return [
    String(parts.year).padStart(4, '0'),
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0'),
  ].join('-');
}

function monthIdFromDateId(dateId: string): string {
  return dateId.slice(0, 7);
}

function parseMonthId(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? { year, month } : null;
}

function shiftMonth(monthId: string, delta: number): string {
  const parsed = parseMonthId(monthId);
  if (!parsed) return monthId;
  const shifted = new Date(Date.UTC(parsed.year, parsed.month - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
}

function clampMonth(monthId: string, minMonthId: string, maxMonthId: string): string {
  if (monthId < minMonthId) return minMonthId;
  if (monthId > maxMonthId) return maxMonthId;
  return monthId;
}

function moscowDateTime(dateId: string, time: string): Date | null {
  const date = parseDateId(dateId);
  const clock = parseTime(time);
  if (!date || !clock) return null;

  return new Date(Date.UTC(
    date.year,
    date.month - 1,
    date.day,
    clock.hour - MOSCOW_OFFSET_HOURS,
    clock.minute,
  ));
}

export function getMoscowDateId(input: Date | string = new Date()): string | null {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  const parts = getMoscowDateParts(date);
  return parts ? formatDateId(parts) : null;
}

export function getReminderEventDateId(eventStartInput: Date | string): string | null {
  return getMoscowDateId(eventStartInput);
}

export function getInitialReminderMonth(
  eventStartInput: Date | string,
  nowInput: Date | string = new Date(),
): string | null {
  const todayId = getMoscowDateId(nowInput);
  const eventDateId = getReminderEventDateId(eventStartInput);
  if (!todayId || !eventDateId || todayId > eventDateId) return null;
  return monthIdFromDateId(todayId);
}

export function shiftReminderMonth(
  currentMonthId: string,
  delta: number,
  eventStartInput: Date | string,
  nowInput: Date | string = new Date(),
): string | null {
  const todayId = getMoscowDateId(nowInput);
  const eventDateId = getReminderEventDateId(eventStartInput);
  if (!todayId || !eventDateId || todayId > eventDateId) return null;

  return clampMonth(
    shiftMonth(currentMonthId, delta),
    monthIdFromDateId(todayId),
    monthIdFromDateId(eventDateId),
  );
}

export function buildReminderCalendar(
  eventStartInput: Date | string,
  currentMonthId?: string,
  nowInput: Date | string = new Date(),
): ReminderCalendarView | null {
  const todayId = getMoscowDateId(nowInput);
  const eventDateId = getReminderEventDateId(eventStartInput);
  if (!todayId || !eventDateId || todayId > eventDateId) return null;

  const minMonthId = monthIdFromDateId(todayId);
  const maxMonthId = monthIdFromDateId(eventDateId);
  const monthId = clampMonth(currentMonthId ?? minMonthId, minMonthId, maxMonthId);
  const parsedMonth = parseMonthId(monthId);
  if (!parsedMonth) return null;

  const daysInMonth = new Date(Date.UTC(parsedMonth.year, parsedMonth.month, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(parsedMonth.year, parsedMonth.month - 1, 1)).getUTCDay() + 6) % 7;
  const cells: ReminderCalendarDay[] = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push({ dateId: null, day: null, enabled: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateId = formatDateId({ year: parsedMonth.year, month: parsedMonth.month, day });
    cells.push({
      dateId,
      day,
      enabled: dateId >= todayId && dateId <= eventDateId,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ dateId: null, day: null, enabled: false });
  }

  const weeks: ReminderCalendarDay[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }

  const label = new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(parsedMonth.year, parsedMonth.month - 1, 1)));

  return {
    monthId,
    label: label.charAt(0).toUpperCase() + label.slice(1),
    weeks,
    canGoPrevious: monthId > minMonthId,
    canGoNext: monthId < maxMonthId,
  };
}

export function adjustReminderTime(time: string, deltaMinutes: number): string {
  const parsed = parseTime(time) ?? { hour: 9, minute: 0 };
  const total = (parsed.hour * 60 + parsed.minute + deltaMinutes + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function buildReminderDateTime(
  dateId: string,
  time: string,
  eventStartInput: Date | string,
  eventStartTime?: string | null,
  nowInput: Date | string = new Date(),
): ReminderDateTimeOption | null {
  const remindAt = moscowDateTime(dateId, time);
  const now = new Date(nowInput);
  const eventDateId = getReminderEventDateId(eventStartInput);
  if (!remindAt || Number.isNaN(now.getTime()) || !eventDateId) return null;

  const eventDeadline = moscowDateTime(
    eventDateId,
    parseTime(eventStartTime ?? '') ? eventStartTime! : '23:59',
  );
  if (!eventDeadline) return null;
  if (remindAt.getTime() <= now.getTime() || remindAt.getTime() >= eventDeadline.getTime()) return null;

  const label = new Intl.DateTimeFormat('ru-RU', {
    timeZone: MOSCOW_TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(remindAt);

  return {
    id: `${dateId}T${time}`,
    dateId,
    time,
    label,
    remindAt: remindAt.toISOString(),
  };
}

/**
 * Backward-compatible compact presets. New bot interfaces use buildReminderCalendar()
 * and buildReminderDateTime() so the user can select both date and time.
 */
export function buildReminderDateOptions(
  eventStartInput: Date | string,
  nowInput: Date | string = new Date(),
): ReminderDateOption[] {
  const eventDateId = getReminderEventDateId(eventStartInput);
  const eventDate = eventDateId ? parseDateId(eventDateId) : null;
  if (!eventDate) return [];

  const formatter = new Intl.DateTimeFormat('ru-RU', {
    timeZone: MOSCOW_TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return DAYS_BEFORE_EVENT.map((daysBefore) => {
    const date = new Date(Date.UTC(eventDate.year, eventDate.month - 1, eventDate.day - daysBefore));
    const dateId = formatDateId({
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    });
    const option = buildReminderDateTime(
      dateId,
      DEFAULT_REMINDER_TIME,
      eventStartInput,
      null,
      nowInput,
    );

    return option
      ? { id: dateId, label: formatter.format(new Date(option.remindAt)), remindAt: option.remindAt }
      : null;
  })
    .filter((option): option is ReminderDateOption => option !== null)
    .sort((left, right) => left.remindAt.localeCompare(right.remindAt));
}
