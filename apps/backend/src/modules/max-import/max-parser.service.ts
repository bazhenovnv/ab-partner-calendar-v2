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

  // Detect collection posts (multiple events) — must NOT auto-import
  isCollectionPost(text: string): boolean {
    const collectionMarkers = [
      /ПОДБОРКА\s+(НЕДЕЛИ|МЕСЯЦА|ДНЯ)/i,
      /АБ АФИША БУХГАЛТЕРА[:：]\s*ЧТО ПОСМОТРЕТЬ/i,
    ];
    return collectionMarkers.some((re) => re.test(text));
  }

  parse(text: string, postDate?: Date): ParsedMaxPost {
    const result: ParsedMaxPost = {
      title: null,
      shortDescription: null,
      fullDescription: null,
      startDate: null,
      endDate: null,
      startTime: null,
      timezone: 'Europe/Moscow',
      format: null,
      city: null,
      address: null,
      venue: null,
      eventUrl: null,
      priceType: null,
      priceText: null,
      speaker: null,
      mainEvent: false,
      directionSlugs: [],
      tags: [],
      needsAttention: false,
      attentionReasons: [],
    };

    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    // Title: first non-empty line (uppercase or regular)
    result.title = lines[0] ?? null;

    // Hashtags
    const hashtagLine = lines.find((l) => l.startsWith('#'));
    const hashtags = hashtagLine ? hashtagLine.match(/#[\wА-яЁё]+/g) ?? [] : [];

    for (const tag of hashtags) {
      if (tag === '#Хит') {
        result.mainEvent = true;
      }
      const mapped = HASHTAG_TO_DIRECTIONS[tag];
      if (mapped && mapped.length > 0) {
        result.directionSlugs.push(...mapped);
      } else if (tag !== '#АБАфиша' && tag !== '#Хит') {
        result.tags.push(tag.replace('#', ''));
      }
    }
    result.directionSlugs = [...new Set(result.directionSlugs)];

    // Date parsing
    this.parseDate(text, postDate, result);

    // Format / location
    this.parseFormatLocation(text, result);

    // Price
    this.parsePrice(text, result);

    // Speaker (🎙 or [микрофон])
    this.parseSpeaker(lines, result);

    // Event URL (from "здесь", "тут", "зарегистрироваться" etc)
    this.parseEventUrl(text, result);

    // Description: everything between title and structured fields
    result.shortDescription = this.extractDescription(lines);

    // Validation
    this.validate(result);

    return result;
  }

  private parseDate(text: string, postDate: Date | undefined, result: ParsedMaxPost) {
    // Format: "Когда: 7–8 июля 2026 года" (multi-day)
    const multiDay = text.match(/Когда:\s*(\d+)[–\-—](\d+)\s+([а-яА-Я]+)\s+(\d{4})\s+года?/i);
    if (multiDay) {
      const [, d1, d2, monthStr, year] = multiDay;
      const month = this.parseMonthRu(monthStr);
      if (month !== null) {
        result.startDate = new Date(+year, month, +d1);
        result.endDate = new Date(+year, month, +d2);
      }
      return;
    }

    // Format: "Когда: 8 июля, 11:00 (МСК)"
    const single = text.match(/Когда:\s*(\d{1,2})\s+([а-яА-Я]+)(?:,\s*(\d{2}:\d{2})\s*\(МСК\))?/i);
    if (single) {
      const [, day, monthStr, time] = single;
      const month = this.parseMonthRu(monthStr);
      if (month !== null) {
        const year = postDate?.getFullYear() ?? new Date().getFullYear();
        result.startDate = new Date(year, month, +day);
        if (time) result.startTime = time;
      } else {
        result.needsAttention = true;
        result.attentionReasons.push('Не удалось распознать месяц');
      }
      return;
    }

    if (!result.startDate) {
      result.needsAttention = true;
      result.attentionReasons.push('Дата не найдена');
    }
  }

  private parseFormatLocation(text: string, result: ParsedMaxPost) {
    // "Формат: Онлайн"
    if (/Формат:\s*Онлайн/i.test(text)) {
      result.format = 'ONLINE';
      result.city = 'Онлайн';
      return;
    }

    // "Формат: <Venue>, г. <City>, <Address>"
    const venueMatch = text.match(/Формат:\s*(.+),\s*г\.\s*([^,]+),\s*(.+)/);
    if (venueMatch) {
      result.format = 'OFFLINE';
      result.venue = venueMatch[1].trim();
      result.city = venueMatch[2].trim();
      result.address = venueMatch[3].trim();
      return;
    }

    // "Где: Россия, Санкт-Петербург"
    const whereMatch = text.match(/Где:\s*Россия,\s*(.+)/i);
    if (whereMatch) {
      result.format = 'OFFLINE';
      result.city = whereMatch[1].trim();
      return;
    }

    // "Где: <city>" without Russia
    const whereSimple = text.match(/Где:\s*(.+)/i);
    if (whereSimple) {
      result.format = 'OFFLINE';
      result.city = whereSimple[1].trim();
    }
  }

  private parsePrice(text: string, result: ParsedMaxPost) {
    const priceMatch = text.match(/Стоимость:\s*(.+)/i);
    if (!priceMatch) return;

    const raw = priceMatch[1].trim();
    if (/бесплатно/i.test(raw)) {
      result.priceType = 'FREE';
      result.priceText = 'Бесплатно';
    } else {
      result.priceType = 'PAID';
      result.priceText = raw;
    }
  }

  private parseSpeaker(lines: string[], result: ParsedMaxPost) {
    // Emoji mic or [микрофон]
    const speakerLine = lines.find(
      (l) => l.startsWith('🎙') || /\[микрофон\]/i.test(l),
    );
    if (speakerLine) {
      result.speaker = speakerLine.replace(/^🎙\s*/, '').replace(/\[микрофон\]\s*/i, '').trim();
    }
  }

  private parseEventUrl(text: string, result: ParsedMaxPost) {
    // Look for markdown links like [здесь](url) or [тут](url)
    const mdLink = text.match(/\[(здесь|тут|зарегистрироваться|подробнее|участвовать)\]\(([^)]+)\)/i);
    if (mdLink) {
      result.eventUrl = mdLink[2];
      return;
    }

    // Plain URL after registration keywords
    const plainUrl = text.match(
      /(?:здесь|тут|зарегистрироваться|подробнее)[\s\S]*?(https?:\/\/[^\s\n]+)/i,
    );
    if (plainUrl) {
      result.eventUrl = plainUrl[1];
    }
  }

  private extractDescription(lines: string[]): string | null {
    // Skip title (line 0), skip lines with structured fields, skip hashtags
    const structuredPrefixes = ['Когда:', 'Формат:', 'Где:', 'Стоимость:', '#'];
    const descLines = lines.slice(1).filter(
      (l) => !structuredPrefixes.some((p) => l.startsWith(p)) && !l.startsWith('🎙'),
    );
    const desc = descLines.join(' ').trim();
    return desc || null;
  }

  private validate(result: ParsedMaxPost) {
    if (!result.title) {
      result.needsAttention = true;
      result.attentionReasons.push('Заголовок не найден');
    }
    if (!result.startDate) {
      result.needsAttention = true;
      result.attentionReasons.push('Дата не найдена');
    }
    if (!result.startTime && result.startDate) {
      result.needsAttention = true;
      result.attentionReasons.push('Время не указано');
    }
    if (!result.eventUrl) {
      result.needsAttention = true;
      result.attentionReasons.push('Ссылка на регистрацию не найдена');
    }
  }

  private parseMonthRu(monthStr: string): number | null {
    const months: Record<string, number> = {
      января: 0, февраля: 1, марта: 2, апреля: 3, мая: 4, июня: 5,
      июля: 6, августа: 7, сентября: 8, октября: 9, ноября: 10, декабря: 11,
    };
    return months[monthStr.toLowerCase()] ?? null;
  }
}
