const MONTHS_RU_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
] as const;

const MONTHS_RU_NOM = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
] as const;

export function formatEventDate(startDate: string, endDate?: string | null): string {
  const start = new Date(startDate);
  const day = start.getDate();
  const month = MONTHS_RU_GEN[start.getMonth()];
  const year = start.getFullYear();
  const currentYear = new Date().getFullYear();

  if (endDate) {
    const end = new Date(endDate);
    if (
      end.getDate() !== start.getDate() ||
      end.getMonth() !== start.getMonth() ||
      end.getFullYear() !== start.getFullYear()
    ) {
      const endDay = end.getDate();
      const endMonth = MONTHS_RU_GEN[end.getMonth()];
      if (start.getMonth() === end.getMonth()) {
        return year !== currentYear
          ? `${day}–${endDay} ${month} ${year}`
          : `${day}–${endDay} ${month}`;
      }
      return year !== currentYear
        ? `${day} ${month} – ${endDay} ${endMonth} ${year}`
        : `${day} ${month} – ${endDay} ${endMonth}`;
    }
  }

  return year !== currentYear ? `${day} ${month} ${year}` : `${day} ${month}`;
}

export function formatMonthYear(year: number, month: number): string {
  return `${MONTHS_RU_NOM[month]} ${year}`;
}

export function formatPrice(priceType: 'FREE' | 'PAID', priceText?: string | null): string {
  if (priceType === 'FREE') return 'Бесплатно';
  return priceText ?? 'Платно';
}

export function formatFormat(format: 'ONLINE' | 'OFFLINE'): string {
  return format === 'ONLINE' ? 'Онлайн' : 'Офлайн';
}

export function isoToIcsDate(iso: string): string {
  return iso.replace(/[-:]/g, '').split('.')[0] + 'Z';
}
