const MOSCOW_TIME_ZONE = 'Europe/Moscow';
const REMINDER_HOUR_MSK = 9;
const DAYS_BEFORE_EVENT = [30, 14, 7, 3, 1, 0] as const;

export interface ReminderDateOption {
  id: string;
  label: string;
  remindAt: string;
}
function getMoscowDateParts(date: Date): { year: number; month: number; day: number } | null {
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

/**
 * Returns a compact set of useful reminder dates at 09:00 Moscow time.
 * Dates that have already passed or are not strictly before the event are omitted.
 */
export function buildReminderDateOptions(
  eventStartInput: Date | string,
  nowInput: Date | string = new Date(),
): ReminderDateOption[] {
  const eventStart = new Date(eventStartInput);
  const now = new Date(nowInput);
  if (Number.isNaN(eventStart.getTime()) || Number.isNaN(now.getTime())) return [];

  const eventDate = getMoscowDateParts(eventStart);
  if (!eventDate) return [];

  const formatter = new Intl.DateTimeFormat('ru-RU', {
    timeZone: MOSCOW_TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return DAYS_BEFORE_EVENT.map((daysBefore) => {
    // Moscow is UTC+3 year-round: 09:00 MSK is 06:00 UTC.
    const remindAt = new Date(Date.UTC(
      eventDate.year,
      eventDate.month - 1,
      eventDate.day - daysBefore,
      REMINDER_HOUR_MSK - 3,
    ));

    return {
      id: remindAt.toISOString().slice(0, 10),
      label: formatter.format(remindAt),
      remindAt: remindAt.toISOString(),
    };
  })
    .filter((option) => {
      const remindAt = new Date(option.remindAt).getTime();
      return remindAt > now.getTime() && remindAt < eventStart.getTime();
    })
    .sort((left, right) => left.remindAt.localeCompare(right.remindAt));
}
