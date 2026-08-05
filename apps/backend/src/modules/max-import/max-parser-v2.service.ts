import { Injectable, Logger } from '@nestjs/common';
import { HASHTAG_TO_DIRECTIONS } from '@ab-afisha/shared';

export interface ParsedMaxPost {
  title: string | null;
  shortDescription: string | null;
  fullDescription: string | null;
  startDate: Date | null;
  endDate: Date | null;
  startTime: string | null;
  timezone: string;
  format: 'ONLINE' | 'OFFLINE' | null;
  city: string | null;
  address: string | null;
  venue: string | null;
  eventUrl: string | null;
  priceType: 'FREE' | 'PAID' | null;
  priceText: string | null;
  speaker: string | null;
  mainEvent: boolean;
  directionSlugs: string[];
  tags: string[];
  needsAttention: boolean;
  attentionReasons: string[];
}

const MAIN_EVENT_TAGS = new Set([
  '#хит',
  '#главноесобытие',
  '#главныесобытия',
]);

const STREET_PREFIX = /^(?:ул\.?|улица|проспект|пр-т|пер\.?|переулок|шоссе|наб\.?|набережная|бульвар|бул\.?|пл\.?|площадь|д\.?\s*\d)/i;

const DIRECTION_HINTS: Array<{ pattern: RegExp; slugs: string[] }> = [
  { pattern: /\b(?:автоусн|аусн|усн|псн|осно|нпд|есхн|налогооблож)/i, slugs: ['sno', 'taxes'] },
  { pattern: /\b(?:фнс|налогов|ндфл|прибыл|декларац|провер)/i, slugs: ['taxes'] },
  { pattern: /\bндс\b/i, slugs: ['nds', 'taxes'] },
  { pattern: /\b(?:бухгалтерск|бухуч[её]т|фсбу|инвентаризац|активов)/i, slugs: ['accounting'] },
  { pattern: /\b(?:отч[её]тност|рсв|ефс-?1|сфр)\b/i, slugs: ['reporting'] },
  { pattern: /\b(?:кадр|персонал|hr|работодател|трудов)/i, slugs: ['personnel', 'labor-law'] },
  { pattern: /\b(?:зарплат|страхов.*взнос)/i, slugs: ['payroll'] },
  { pattern: /\b(?:эдо|эпд|этрн|документооборот)/i, slugs: ['edo'] },
  { pattern: /\b(?:1с|автоматизац|искусственн.*интеллект|\bии\b)/i, slugs: ['automation'] },
  { pattern: /\b(?:финанс|денежн|бюджет|ликвидност)/i, slugs: ['finance'] },
  { pattern: /\b(?:управлен|бизнес|предпринимател|стратег)/i, slugs: ['business'] },
  { pattern: /\b(?:право|юрист|судебн|договор)/i, slugs: ['legal'] },
  { pattern: /\b(?:касс|ккт|54-?фз|офд)/i, slugs: ['kassy'] },
  { pattern: /\b(?:маркировк|честный знак)/i, slugs: ['marking'] },
  { pattern: /\b(?:маркетплейс|wildberries|ozon|яндекс маркет)/i, slugs: ['marketplaces'] },
  { pattern: /\b(?:закупк|тендер|44-?фз|223-?фз)/i, slugs: ['procurement'] },
  { pattern: /\b(?:логистик|грузоперевоз|транспорт)/i, slugs: ['logistics'] },
];

@Injectable()
export class MaxParserService {
  private readonly logger = new Logger(MaxParserService.name);

  isCollectionPost(text: string): boolean {
    return [
      /ПОДБОРКА\s+(НЕДЕЛИ|МЕСЯЦА|ДНЯ)/i,
      /АБ\s+АФИША\s+БУХГАЛТЕРА[:：]\s*ЧТО\s+ПОСМОТРЕТЬ/i,
      /\b(?:мероприятия|вебинары|семинары)\s+на\s+(?:неделю|месяц)\b/i,
    ].some((pattern) => pattern.test(text));
  }

  parse(text: string, postDate?: Date, supplementalUrls: string[] = []): ParsedMaxPost {
    const result: ParsedMaxPost = {
      title: null,
      shortDescription: null,
      fullDescription: text.trim() || null,
      startDate: null,
      endDate: null,
      startTime: null,
      timezone: 'Europe/Moscow',
      format: null,
      city: null,
      address: null,
      venue: null,
      eventUrl: null,
      priceType: 'FREE',
      priceText: 'Бесплатно',
      speaker: null,
      mainEvent: false,
      directionSlugs: [],
      tags: [],
      needsAttention: false,
      attentionReasons: [],
    };

    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const normalizedText = lines
      .map((line) => this.normalizeStructuredLine(line))
      .join('\n');

    result.title = this.extractTitle(lines);
    this.parseHashtags(text, result);
    this.inferDirections(text, result);
    this.parseDate(normalizedText, postDate, result);
    this.parseFormatLocation(normalizedText, result);
    this.parsePrice(normalizedText, result);
    this.parseSpeaker(lines, result);
    this.parseEventUrl(text, supplementalUrls, result);
    result.shortDescription = this.extractDescription(lines);
    this.validate(result);

    return result;
  }

  private normalizeStructuredLine(line: string): string {
    return line
      .replace(/^\s*[📅🗓⏰🕐📍🌐💻🏢💰💵🎙️🎙]+\s*/u, '')
      .replace(/\*\*|__|~~|`/g, '')
      .replace(/：/g, ':')
      .trim();
  }

  private extractTitle(lines: string[]): string | null {
    return (
      lines.find((line) => {
        const normalized = this.normalizeStructuredLine(line);
        if (normalized.startsWith('#')) return false;
        return !/^(Когда|Дата|Время|Начало|Формат|Где|Стоимость|Цена|Участие|Спикер(?:ы)?):/i.test(
          normalized,
        );
      }) ?? null
    );
  }

  private parseHashtags(text: string, result: ParsedMaxPost): void {
    const hashtags = text.match(/#[\wА-Яа-яЁё-]+/g) ?? [];
    const mappingEntries = Object.entries(HASHTAG_TO_DIRECTIONS);

    for (const rawTag of hashtags) {
      const lower = rawTag.toLocaleLowerCase('ru-RU');
      if (MAIN_EVENT_TAGS.has(lower)) {
        result.mainEvent = true;
        continue;
      }

      const canonical = mappingEntries.find(
        ([key]) => key.toLocaleLowerCase('ru-RU') === lower,
      );
      const mapped = canonical?.[1];

      if (mapped?.length) {
        result.directionSlugs.push(...mapped);
      } else if (lower !== '#абафи ша'.replace(' ', '').toLocaleLowerCase('ru-RU')) {
        result.tags.push(rawTag.slice(1));
      }
    }

    result.directionSlugs = [...new Set(result.directionSlugs)];
    result.tags = [...new Set(result.tags)];
  }

  private inferDirections(text: string, result: ParsedMaxPost): void {
    if (result.directionSlugs.length === 0) {
      for (const hint of DIRECTION_HINTS) {
        if (hint.pattern.test(text)) result.directionSlugs.push(...hint.slugs);
      }
    }

    result.directionSlugs = [...new Set(result.directionSlugs)];

    if (result.directionSlugs.length === 0) {
      // Every imported post belongs to the accountant catalogue. Keep it visible
      // and mark the fallback for later editorial refinement instead of hiding it.
      result.directionSlugs = ['accounting'];
      result.tags.push('auto-direction-fallback');
    }
  }

  private parseDate(text: string, postDate: Date | undefined, result: ParsedMaxPost): void {
    const multiDay = text.match(
      /(?:Когда|Дата):\s*(\d{1,2})[–\-—](\d{1,2})\s+([а-яА-ЯёЁ]+)(?:\s+(\d{4}))?(?:\s+года?)?/i,
    );
    if (multiDay) {
      const [, d1, d2, monthText, explicitYear] = multiDay;
      const month = this.parseMonthRu(monthText);
      if (month !== null) {
        const year = explicitYear ? Number(explicitYear) : this.inferYear(month, postDate);
        result.startDate = this.safeDate(year, month, Number(d1));
        result.endDate = this.safeDate(year, month, Number(d2));
      }
    }

    if (!result.startDate) {
      const single = text.match(
        /(?:Когда|Дата):\s*(\d{1,2})\s+([а-яА-ЯёЁ]+)(?:\s+(\d{4}))?(?:\s+года?)?(?:,?\s*(\d{1,2}:\d{2})\s*(?:\(МСК\))?)?/i,
      );
      if (single) {
        const [, day, monthText, explicitYear, time] = single;
        const month = this.parseMonthRu(monthText);
        if (month !== null) {
          const year = explicitYear ? Number(explicitYear) : this.inferYear(month, postDate);
          result.startDate = this.safeDate(year, month, Number(day));
          if (time) result.startTime = this.normalizeTime(time);
        }
      }
    }

    if (!result.startDate) {
      const numeric = text.match(
        /(?:Когда|Дата):\s*(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?(?:,?\s*(\d{1,2}:\d{2}))?/i,
      );
      if (numeric) {
        const [, day, monthNumber, rawYear, time] = numeric;
        const month = Number(monthNumber) - 1;
        const year = rawYear
          ? Number(rawYear.length === 2 ? `20${rawYear}` : rawYear)
          : this.inferYear(month, postDate);
        result.startDate = this.safeDate(year, month, Number(day));
        if (time) result.startTime = this.normalizeTime(time);
      }
    }

    if (!result.startTime) {
      const separateTime = text.match(/(?:Время|Начало):\s*(\d{1,2}:\d{2})/i);
      if (separateTime) result.startTime = this.normalizeTime(separateTime[1]);
    }
  }

  private parseFormatLocation(text: string, result: ParsedMaxPost): void {
    const structured = text.match(/(?:Формат|Где):\s*([^\n]+)/i);
    const rawValue = structured?.[1]?.trim() ?? '';

    if (rawValue && /(?:онлайн\s*[\/+]|[\/+ ]\s*офлайн|очно\s*[\/+]|[\/+ ]\s*online)/i.test(rawValue)) {
      result.format = 'ONLINE';
      result.city = rawValue;
      this.addAttention(result, 'Гибридный формат требует ручной проверки');
      return;
    }

    if (rawValue && /^(?:онлайн|online)(?:\b|\s|$)/i.test(rawValue)) {
      result.format = 'ONLINE';
      result.city = 'Онлайн';
      return;
    }

    const legacyVenue = text.match(/Формат:\s*(.+),\s*г\.\s*([^,\n]+),\s*([^\n]+)/i);
    if (legacyVenue) {
      result.format = 'OFFLINE';
      result.venue = legacyVenue[1].trim();
      result.city = legacyVenue[2].trim();
      result.address = legacyVenue[3].trim();
      return;
    }

    const whereRussia = text.match(/Где:\s*Россия,\s*([^,\n]+)(?:,\s*([^\n]+))?/i);
    if (whereRussia) {
      result.format = 'OFFLINE';
      result.city = whereRussia[1].trim();
      result.address = whereRussia[2]?.trim() ?? null;
      return;
    }

    if (rawValue) {
      result.format = 'OFFLINE';
      const cityAndDetails = rawValue.match(/^\s*(?:г\.\s*)?([^,]+)(?:,\s*(.+))?$/i);
      result.city = cityAndDetails?.[1]?.trim() ?? rawValue;
      const details = cityAndDetails?.[2]?.trim() ?? '';

      if (details) {
        const parentheticalAddress = details.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
        if (parentheticalAddress) {
          result.venue = parentheticalAddress[1].trim();
          result.address = parentheticalAddress[2].trim();
        } else if (STREET_PREFIX.test(details)) {
          result.address = details;
        } else {
          const commaParts = details.split(',').map((part) => part.trim()).filter(Boolean);
          if (commaParts.length > 1 && STREET_PREFIX.test(commaParts.slice(1).join(', '))) {
            result.venue = commaParts[0];
            result.address = commaParts.slice(1).join(', ');
          } else {
            result.venue = details;
          }
        }
      }
      return;
    }

    if (/\bвебинар\b/i.test(text)) {
      result.format = 'ONLINE';
      result.city = 'Онлайн';
    }
  }

  private parsePrice(text: string, result: ParsedMaxPost): void {
    const priceMatch = text.match(/(?:Стоимость|Цена|Участие)\s*:\s*([^\n]+)/i);
    if (!priceMatch) return;

    const raw = priceMatch[1]
      .replace(/\*\*|__|~~|`/g, '')
      .replace(/^[\s—–-]+|[\s—–-]+$/g, '')
      .trim();

    if (!raw) return;

    if (/^(?:бесплатно|без оплаты|свободный вход)$/i.test(raw) || /^0(?:[\s.,]0+)?\s*(?:₽|руб(?:\.|лей)?)?$/i.test(raw)) {
      result.priceType = 'FREE';
      result.priceText = 'Бесплатно';
      return;
    }

    result.priceType = 'PAID';
    result.priceText = raw;
  }

  private parseSpeaker(lines: string[], result: ParsedMaxPost): void {
    const speakers: string[] = [];
    let collectFollowingLines = false;

    for (const sourceLine of lines) {
      const normalized = this.normalizeStructuredLine(sourceLine);
      const microphoneLine = /^🎙/u.test(sourceLine) || /\[микрофон\]/i.test(sourceLine);
      const labelMatch = normalized.match(/^Спикер(?:ы)?\s*:\s*(.*)$/i);

      if (microphoneLine || labelMatch) {
        const value = (labelMatch?.[1] ?? sourceLine)
          .replace(/^\s*🎙️?\s*/u, '')
          .replace(/\[микрофон\]\s*/i, '')
          .replace(/^\s*Спикер(?:ы)?\s*:\s*/i, '')
          .replace(/\*\*|__|~~|`/g, '')
          .trim();
        if (value) speakers.push(value);
        collectFollowingLines = Boolean(labelMatch && !labelMatch[1].trim());
        continue;
      }

      if (collectFollowingLines && /^[-–—•]\s+/.test(normalized)) {
        speakers.push(normalized.replace(/^[-–—•]\s+/, '').trim());
        continue;
      }

      if (collectFollowingLines) collectFollowingLines = false;
    }

    const unique = [...new Set(speakers.filter(Boolean))];
    if (unique.length > 0) result.speaker = unique.join(' • ');
  }

  private parseEventUrl(text: string, supplementalUrls: string[], result: ParsedMaxPost): void {
    const cleanUrl = (url: string): string => url.trim().replace(/[.,;!?]+$/, '');
    const isExternal = (url: string): boolean =>
      /^https?:\/\//i.test(url) && !/max\.ru\/(?:join|id)/i.test(url);

    const markdownLink = text.match(
      /\[(здесь|тут|зарегистрироваться|регистрация|подробнее|участвовать)\]\((https?:\/\/[^)]+)\)/i,
    );
    if (markdownLink) {
      result.eventUrl = cleanUrl(markdownLink[2]);
      return;
    }

    const keywordUrl = text.match(
      /(?:здесь|тут|зарегистрироваться|регистрация|подробнее|участвовать)[\s\S]*?(https?:\/\/[^\s)\]}]+)/i,
    );
    if (keywordUrl) {
      result.eventUrl = cleanUrl(keywordUrl[1]);
      return;
    }

    const textUrl = (text.match(/https?:\/\/[^\s)\]}]+/gi) ?? [])
      .map(cleanUrl)
      .find(isExternal);
    if (textUrl) {
      result.eventUrl = textUrl;
      return;
    }

    result.eventUrl = supplementalUrls
      .filter((url): url is string => typeof url === 'string')
      .map(cleanUrl)
      .find(isExternal) ?? null;
  }

  private extractDescription(lines: string[]): string | null {
    const description = lines
      .slice(1)
      .filter((line) => {
        const normalized = this.normalizeStructuredLine(line);
        return (
          !/^(Когда|Дата|Время|Начало|Формат|Где|Стоимость|Цена|Участие|Спикер(?:ы)?):/i.test(normalized) &&
          !normalized.startsWith('#') &&
          !/^🎙/u.test(line) &&
          !/\[микрофон\]/i.test(line)
        );
      })
      .join(' ')
      .trim();
    return description || null;
  }

  private validate(result: ParsedMaxPost): void {
    if (!result.title) this.addAttention(result, 'Заголовок не найден');
    if (!result.startDate) this.addAttention(result, 'Дата не найдена');
    if (!result.format) this.addAttention(result, 'Формат не определён');
    if (result.format === 'OFFLINE' && !result.city) {
      this.addAttention(result, 'Город офлайн-события не определён');
    }

    // Time, registration link and an editorially precise direction are useful,
    // but their absence must not hide an otherwise valid event from the calendar.
    if (!result.startTime) result.tags.push('missing-start-time');
    if (!result.eventUrl) result.tags.push('missing-registration-url');
    result.tags = [...new Set(result.tags)];
  }

  private addAttention(result: ParsedMaxPost, reason: string): void {
    result.needsAttention = true;
    if (!result.attentionReasons.includes(reason)) result.attentionReasons.push(reason);
  }

  private inferYear(month: number, postDate?: Date): number {
    const reference = postDate ?? new Date();
    let year = reference.getUTCFullYear();
    const referenceMonth = reference.getUTCMonth();
    if (month < referenceMonth - 6) year += 1;
    return year;
  }

  private safeDate(year: number, month: number, day: number): Date | null {
    const date = new Date(Date.UTC(year, month, day, 12, 0, 0));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month ||
      date.getUTCDate() !== day
    ) {
      this.logger.warn(`Invalid MAX event date: ${day}.${month + 1}.${year}`);
      return null;
    }
    return date;
  }

  private normalizeTime(value: string): string {
    const [hours, minutes] = value.split(':').map(Number);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private parseMonthRu(monthText: string): number | null {
    const months: Record<string, number> = {
      января: 0,
      февраля: 1,
      марта: 2,
      апреля: 3,
      мая: 4,
      июня: 5,
      июля: 6,
      августа: 7,
      сентября: 8,
      октября: 9,
      ноября: 10,
      декабря: 11,
    };
    return months[monthText.toLocaleLowerCase('ru-RU')] ?? null;
  }
}
