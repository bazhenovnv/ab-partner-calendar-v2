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

@Injectable()
export class MaxParserService {
  private readonly logger = new Logger(MaxParserService.name);

  isCollectionPost(text: string): boolean {
    const collectionMarkers = [
      /ПОДБОРКА\s+(НЕДЕЛИ|МЕСЯЦА|ДНЯ)/i,
      /АБ\s+АФИША\s+БУХГАЛТЕРА[:：]\s*ЧТО\s+ПОСМОТРЕТЬ/i,
      /\b(?:мероприятия|вебинары|семинары)\s+на\s+(?:неделю|месяц)\b/i,
    ];
    return collectionMarkers.some((re) => re.test(text));
  }

  parse(text: string, postDate?: Date): ParsedMaxPost {
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

    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    result.title = this.extractTitle(lines);
    this.parseHashtags(text, result);
    this.inferDirectionsFromText(text, result);
    this.parseDate(text, postDate, result);
    this.parseFormatLocation(text, result);
    this.parsePrice(text, result);
    this.parseSpeaker(lines, result);
    this.parseEventUrl(text, result);
    result.shortDescription = this.extractDescription(lines);
    this.validate(result);
    return result;
  }

  private extractTitle(lines: string[]): string | null {
    return lines.find((line) => {
      if (line.startsWith('#')) return false;
      return !/^(?:📅|🗓|⏰|Когда|Дата|Время|Начало|Формат|Где|Стоимость|Спикер)\s*:/i.test(line);
    }) ?? null;
  }

  private parseHashtags(text: string, result: ParsedMaxPost) {
    const hashtags = text.match(/#[\wА-Яа-яЁё]+/g) ?? [];
    const mappingEntries = Object.entries(HASHTAG_TO_DIRECTIONS);

    for (const rawTag of hashtags) {
      const canonical = mappingEntries.find(([key]) =>
        key.toLocaleLowerCase('ru-RU') === rawTag.toLocaleLowerCase('ru-RU'),
      );
      const tag = canonical?.[0] ?? rawTag;
      if (tag.toLocaleLowerCase('ru-RU') === '#хит') {
        result.mainEvent = true;
        continue;
      }
      const mapped = canonical?.[1];
      if (mapped?.length) result.directionSlugs.push(...mapped);
      else if (tag.toLocaleLowerCase('ru-RU') !== '#абафи ша'.replace(' ', '').toLocaleLowerCase('ru-RU')) {
        result.tags.push(rawTag.slice(1));
      }
    }

    result.directionSlugs = [...new Set(result.directionSlugs)];
    result.tags = [...new Set(result.tags)];
  }

  /** Text inference is only a fallback when approved hashtags did not provide a direction. */
  private inferDirectionsFromText(text: string, result: ParsedMaxPost) {
    if (result.directionSlugs.length > 0) return;
    const rules: Array<[RegExp, string[]]> = [
      [/\b(?:1с|1c|бухгалтерия\s*8|зуп|erp)\b/i, ['1c']],
      [/\b(?:54[-‑–— ]?фз|ккт|касс[аы]|онлайн[- ]?касс)/i, ['54fz', 'kassy']],
      [/\b(?:маркировк|честн(?:ый|ого)\s+знак)/i, ['marking']],
      [/\bегаи[сз]\b/i, ['egais']],
      [/\bофд\b/i, ['ofd']],
      [/\bндс\b/i, ['nds']],
      [/\b(?:усн|аусн|псн|патент|осно|нпд|самозанят|есхн|система\s+налогообложения)\b/i, ['sno', 'taxes']],
      [/\b(?:налог|фнс|отчетност|страхов(?:ые|ых)\s+взнос|рсв|зарплат|кадр|трудов(?:ое|ого)\s+законодательств|бухгалтерск)/i, ['taxes']],
    ];
    for (const [pattern, slugs] of rules) {
      if (pattern.test(text)) result.directionSlugs.push(...slugs);
    }
    result.directionSlugs = [...new Set(result.directionSlugs)];
  }

  private parseDate(text: string, postDate: Date | undefined, result: ParsedMaxPost) {
    const label = '(?:Когда|Дата(?:\\s+проведения)?|📅|🗓)';
    const multiDay = text.match(new RegExp(`${label}\\s*:?\\s*(\\d{1,2})[–\\-—](\\d{1,2})\\s+([а-яА-ЯёЁ]+)(?:\\s+(\\d{4}))?`, 'i'));
    if (multiDay) {
      const [, d1, d2, monthStr, explicitYear] = multiDay;
      const month = this.parseMonthRu(monthStr);
      if (month !== null) {
        const year = explicitYear ? Number(explicitYear) : this.inferYear(month, postDate);
        result.startDate = this.safeDate(year, month, Number(d1));
        result.endDate = this.safeDate(year, month, Number(d2));
      }
    }

    if (!result.startDate) {
      const single = text.match(new RegExp(`${label}\\s*:?\\s*(\\d{1,2})\\s+([а-яА-ЯёЁ]+)(?:\\s+(\\d{4}))?(?:\\s+года?)?(?:,?\\s*(?:в\\s*)?(\\d{1,2}[.:]\\d{2})\\s*(?:\\(МСК\\)|МСК)?)?`, 'i'));
      if (single) {
        const [, day, monthStr, explicitYear, time] = single;
        const month = this.parseMonthRu(monthStr);
        if (month !== null) {
          const year = explicitYear ? Number(explicitYear) : this.inferYear(month, postDate);
          result.startDate = this.safeDate(year, month, Number(day));
          if (time) result.startTime = this.normalizeTime(time);
        }
      }
    }

    if (!result.startDate) {
      const numeric = text.match(new RegExp(`${label}\\s*:?\\s*(\\d{1,2})[./](\\d{1,2})(?:[./](\\d{2,4}))?(?:,?\\s*(?:в\\s*)?(\\d{1,2}[.:]\\d{2}))?`, 'i'));
      if (numeric) {
        const [, day, monthNumber, rawYear, time] = numeric;
        const month = Number(monthNumber) - 1;
        const year = rawYear ? Number(rawYear.length === 2 ? `20${rawYear}` : rawYear) : this.inferYear(month, postDate);
        result.startDate = this.safeDate(year, month, Number(day));
        if (time) result.startTime = this.normalizeTime(time);
      }
    }

    // Some channel posts use a bare calendar line without a label.
    if (!result.startDate) {
      const loose = text.match(/(?:^|\n)\s*(?:📅|🗓)?\s*(\d{1,2})\s+([а-яА-ЯёЁ]+)(?:\s+(\d{4}))?(?:,?\s*(?:в\s*)?(\d{1,2}[.:]\d{2}))?(?:\s*\(МСК\))?/im);
      if (loose) {
        const [, day, monthStr, explicitYear, time] = loose;
        const month = this.parseMonthRu(monthStr);
        if (month !== null) {
          const year = explicitYear ? Number(explicitYear) : this.inferYear(month, postDate);
          result.startDate = this.safeDate(year, month, Number(day));
          if (time) result.startTime = this.normalizeTime(time);
        }
      }
    }

    if (!result.startTime) {
      const separateTime = text.match(/(?:Время|Начало|⏰)\s*:?\s*(\d{1,2}[.:]\d{2})/i)
        ?? text.match(/(?:^|\n)\s*(\d{1,2}[.:]\d{2})\s*(?:\(МСК\)|МСК)(?:\s|$)/im);
      if (separateTime) result.startTime = this.normalizeTime(separateTime[1]);
    }
  }

  private parseFormatLocation(text: string, result: ParsedMaxPost) {
    const formatLine = text.match(/Формат\s*:\s*([^\n]+)/i)?.[1]?.trim();
    const whereLine = text.match(/Где\s*:\s*([^\n]+)/i)?.[1]?.trim();
    const value = formatLine ?? whereLine;

    if (value && /онлайн|online|дистанцион/i.test(value)) {
      result.format = 'ONLINE';
      result.city = 'Онлайн';
      return;
    }

    const venueMatch = text.match(/Формат\s*:\s*(.+),\s*г\.?\s*([^,\n]+),\s*([^\n]+)/i);
    if (venueMatch) {
      result.format = 'OFFLINE';
      result.venue = venueMatch[1].trim();
      result.city = venueMatch[2].trim();
      result.address = venueMatch[3].trim();
      return;
    }

    const whereRussia = text.match(/Где\s*:\s*Россия,\s*([^,\n]+)(?:,\s*([^\n]+))?/i);
    if (whereRussia) {
      result.format = 'OFFLINE';
      result.city = whereRussia[1].trim();
      result.address = whereRussia[2]?.trim() ?? null;
      return;
    }

    if (value) {
      result.format = 'OFFLINE';
      result.city = value.replace(/^(?:очно|офлайн)\s*[\/,;-]?\s*/i, '').trim() || value;
      return;
    }

    if (/\b(?:вебинар|онлайн[- ]?встреча|онлайн[- ]?курс|прямой\s+эфир)\b/i.test(text)) {
      result.format = 'ONLINE';
      result.city = 'Онлайн';
    }
  }

  private parsePrice(text: string, result: ParsedMaxPost) {
    const priceMatch = text.match(/Стоимость\s*:\s*([^\n]+)/i);
    if (!priceMatch) return;
    const raw = priceMatch[1].trim();
    if (/бесплатно|0\s*(?:₽|руб)/i.test(raw)) {
      result.priceType = 'FREE';
      result.priceText = 'Бесплатно';
    } else {
      result.priceType = 'PAID';
      result.priceText = raw;
    }
  }

  private parseSpeaker(lines: string[], result: ParsedMaxPost) {
    const speakerLine = lines.find((line) => line.startsWith('🎙') || /\[микрофон\]/i.test(line) || /^Спикер\s*:/i.test(line));
    if (speakerLine) {
      result.speaker = speakerLine
        .replace(/^🎙(?:️)?\s*/, '')
        .replace(/\[микрофон\]\s*/i, '')
        .replace(/^Спикер\s*:\s*/i, '')
        .trim();
    }
  }

  private parseEventUrl(text: string, result: ParsedMaxPost) {
    const markdownLink = text.match(/\[(здесь|тут|зарегистрироваться|регистрация|подробнее|участвовать)\]\((https?:\/\/[^)]+)\)/i);
    if (markdownLink) {
      result.eventUrl = markdownLink[2];
      return;
    }
    const keywordUrl = text.match(/(?:здесь|тут|зарегистрироваться|регистрация|подробнее|участвовать)[\s\S]*?(https?:\/\/[^\s)\]}]+)/i);
    if (keywordUrl) {
      result.eventUrl = keywordUrl[1].replace(/[.,;!?]+$/, '');
      return;
    }
    const allUrls = text.match(/https?:\/\/[^\s)\]}]+/gi) ?? [];
    const externalUrl = allUrls.find((url) => !/max\.ru\/(?:join|id)/i.test(url));
    if (externalUrl) result.eventUrl = externalUrl.replace(/[.,;!?]+$/, '');
  }

  private extractDescription(lines: string[]): string | null {
    const structured = /^(?:📅|🗓|⏰|Когда|Дата|Время|Начало|Формат|Где|Стоимость|Спикер)\s*:/i;
    const description = lines
      .slice(1)
      .filter((line) => !structured.test(line) && !line.startsWith('#') && !line.startsWith('🎙'))
      .join(' ')
      .trim();
    return description || null;
  }

  private validate(result: ParsedMaxPost) {
    if (!result.title) this.addAttention(result, 'Заголовок не найден');
    if (!result.startDate) this.addAttention(result, 'Дата не найдена');
    if (!result.startTime) this.addAttention(result, 'Время не указано');
    if (!result.eventUrl) this.addAttention(result, 'Ссылка на регистрацию не найдена');
    if (!result.format) this.addAttention(result, 'Формат не определён');
    if (!result.city) this.addAttention(result, 'Город или признак «Онлайн» не определён');
    if (result.directionSlugs.length === 0) this.addAttention(result, 'Направление не определено по хэштегам или тексту');
  }

  private addAttention(result: ParsedMaxPost, reason: string) {
    result.needsAttention = true;
    if (!result.attentionReasons.includes(reason)) result.attentionReasons.push(reason);
  }

  private inferYear(month: number, postDate?: Date): number {
    const reference = postDate ?? new Date();
    let year = reference.getUTCFullYear();
    if (month < reference.getUTCMonth() - 6) year += 1;
    return year;
  }

  private safeDate(year: number, month: number, day: number): Date | null {
    const date = new Date(Date.UTC(year, month, day, 12, 0, 0));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
      this.logger.warn(`Invalid MAX event date: ${day}.${month + 1}.${year}`);
      return null;
    }
    return date;
  }

  private normalizeTime(value: string): string {
    const [hours, minutes] = value.replace('.', ':').split(':').map(Number);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private parseMonthRu(monthStr: string): number | null {
    const months: Record<string, number> = {
      января: 0, январь: 0,
      февраля: 1, февраль: 1,
      марта: 2, март: 2,
      апреля: 3, апрель: 3,
      мая: 4, май: 4,
      июня: 5, июнь: 5,
      июля: 6, июль: 6,
      августа: 7, август: 7,
      сентября: 8, сентябрь: 8,
      октября: 9, октябрь: 9,
      ноября: 10, ноябрь: 10,
      декабря: 11, декабрь: 11,
    };
    return months[monthStr.toLocaleLowerCase('ru-RU')] ?? null;
  }
}
