import { Injectable } from '@nestjs/common';
import {
  extractCityFromEventLocation,
  isPlausibleCityName,
  looksLikeVenueLocation,
} from '@ab-afisha/shared';
import {
  MaxParserService as BaseMaxParserService,
  type ParsedMaxPost,
} from './max-parser-v2.service';

const CYRILLIC_DIRECTION_HINTS: Array<{
  pattern: RegExp;
  slugs: string[];
}> = [
  {
    pattern: /(?:автоусн|аусн|усн|псн|осно|нпд|есхн|налогооблож)/i,
    slugs: ['sno', 'taxes'],
  },
  {
    pattern: /(?:фнс|налогов|ндфл|прибыл|декларац|провер)/i,
    slugs: ['taxes'],
  },
  {
    pattern: /(?:ндс)/i,
    slugs: ['nds', 'taxes'],
  },
  {
    pattern: /(?:бухгалтерск|бухуч[её]т|фсбу|инвентаризац|активов)/i,
    slugs: ['accounting'],
  },
  {
    pattern: /(?:отч[её]тност|рсв|ефс-?1|сфр)/i,
    slugs: ['reporting'],
  },
  {
    pattern: /(?:кадр|персонал|работодател|трудов|(?:^|[^a-z])hr(?:[^a-z]|$))/i,
    slugs: ['personnel', 'labor-law'],
  },
  {
    pattern: /(?:зарплат|страхов[^\n]*взнос)/i,
    slugs: ['payroll'],
  },
  {
    pattern: /(?:эдо|эпд|этрн|документооборот)/i,
    slugs: ['edo'],
  },
  {
    pattern: /(?:1с|автоматизац|искусственн[^\n]*интеллект|(?:^|\s)ии(?:\s|$))/i,
    slugs: ['automation'],
  },
  {
    pattern: /(?:финанс|денежн|бюджет|ликвидност)/i,
    slugs: ['finance'],
  },
  {
    pattern: /(?:управлен|бизнес|предпринимател|стратег)/i,
    slugs: ['business'],
  },
  {
    pattern: /(?:право|юрист|судебн|договор)/i,
    slugs: ['legal'],
  },
  {
    pattern: /(?:касс|ккт|54-?фз|офд)/i,
    slugs: ['kassy'],
  },
  {
    pattern: /(?:маркировк|честный знак)/i,
    slugs: ['marking'],
  },
  {
    pattern: /(?:маркетплейс|wildberries|ozon|яндекс маркет)/i,
    slugs: ['marketplaces'],
  },
  {
    pattern: /(?:закупк|тендер|44-?фз|223-?фз)/i,
    slugs: ['procurement'],
  },
  {
    pattern: /(?:логистик|грузоперевоз|транспорт)/i,
    slugs: ['logistics'],
  },
];

const VENUE_TOKEN_END = '(?=$|[\\s,;:()])';
const VENUE_PREFIX = new RegExp(
  `^(?:отель${VENUE_TOKEN_END}|гостиниц|бизнес[-\\s]?центр${VENUE_TOKEN_END}|бц${VENUE_TOKEN_END}|конференц|центр${VENUE_TOKEN_END}|зал${VENUE_TOKEN_END}|офис${VENUE_TOKEN_END}|ресторан${VENUE_TOKEN_END}|кафе${VENUE_TOKEN_END}|экспофорум${VENUE_TOKEN_END}|экспоцентр${VENUE_TOKEN_END}|экспо${VENUE_TOKEN_END})`,
  'i',
);
const STREET_PART = /^(?:ул\.?|улица|проспект|пр-т|пер\.?|переулок|шоссе|наб\.?|набережная|бульвар|бул\.?|пл\.?|площадь|д\.?\s*\d|дом\b)/i;
const REGION_PART = /(?:обл\.?|область|край|респ\.?|республика|автономн|округ|ао)$/i;
const HYBRID_PATTERN = /(?:(?:онлайн|online)\s*(?:\+|\/)\s*(?:офлайн|offline|очно)|(?:офлайн|offline|очно)\s*(?:\+|\/)\s*(?:онлайн|online))/i;
const PHYSICAL_FORMAT_PATTERN = /^(?:очно|офлайн|offline)(?:\b|\s|$)/i;

function cleanLocationPart(value: string) {
  return value.trim().replace(/^(?:г\.|город)\s*/i, '').trim();
}

function setAttention(result: ParsedMaxPost, reasons: string[]) {
  result.attentionReasons = [...new Set(reasons.filter(Boolean))];
  result.needsAttention = result.attentionReasons.length > 0;
}

function applyPhysicalWhereValue(whereValue: string, result: ParsedMaxPost) {
  const normalized = whereValue.replace(/^Россия\s*,\s*/i, '').trim();
  const parts = normalized
    .split(',')
    .map(cleanLocationPart)
    .filter(Boolean);

  result.city = null;
  result.address = null;
  result.venue = null;

  if (parts.length === 0) return;

  const first = parts[0];
  const second = parts[1] ?? '';

  // Venue-first wording is common in MAX: "Экспофорум, Санкт-Петербург".
  // Resolve it directly instead of first misclassifying the city as venue and
  // relying on a later swap that can duplicate the city into result.venue.
  if (
    VENUE_PREFIX.test(first) &&
    second &&
    isPlausibleCityName(second) &&
    !looksLikeVenueLocation(second) &&
    !STREET_PART.test(second) &&
    !REGION_PART.test(second)
  ) {
    result.venue = first;
    result.city = second;
    const addressTail = parts.slice(2).join(', ').trim();
    if (addressTail) result.address = addressTail;
    return;
  }

  result.city = first;
  const details = parts.slice(1).join(', ').trim();
  if (!details) return;

  const parentheticalAddress = details.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
  if (parentheticalAddress) {
    result.venue = parentheticalAddress[1].trim();
    result.address = parentheticalAddress[2].trim();
    return;
  }

  if (STREET_PART.test(details)) {
    result.address = details;
    return;
  }

  const detailParts = details
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const addressTail = detailParts.length > 1
    ? detailParts.slice(1).join(', ')
    : '';

  if (addressTail && STREET_PART.test(addressTail)) {
    result.venue = detailParts[0];
    result.address = addressTail;
    return;
  }

  result.venue = details;
}

function repairHybridLocation(text: string, result: ParsedMaxPost) {
  const formatValue = text.match(/Формат\s*:\s*([^\n]+)/i)?.[1]?.trim() ?? '';
  if (!HYBRID_PATTERN.test(formatValue)) return;

  // Base parser historically collapsed hybrid events into ONLINE and used the
  // literal "онлайн + офлайн" as a city. Keep the manual-review flag, but
  // normalize the format and physical location before the event reaches admin.
  (result as unknown as { format: string | null }).format = 'HYBRID';
  const reasons = [...result.attentionReasons];

  const whereValue = text.match(/Где\s*:\s*([^\n]+)/i)?.[1]?.trim() ?? '';
  if (!whereValue) {
    result.city = null;
    result.address = null;
    result.venue = null;
    reasons.push('Место очного участия гибридного события не определено');
    setAttention(result, reasons);
    return;
  }

  applyPhysicalWhereValue(whereValue, result);
  setAttention(result, reasons);
}

function repairVenueFirstLocation(result: ParsedMaxPost) {
  const format = (result as unknown as { format: string | null }).format;
  if (format !== 'OFFLINE' && format !== 'HYBRID') return;
  if (!result.city || !VENUE_PREFIX.test(result.city)) return;

  // Legacy/base-parser fallback for formats that do not use the structured
  // separate Формат/Где path handled by applyPhysicalWhereValue().
  if (result.venue && !result.address && !VENUE_PREFIX.test(result.venue)) {
    const venue = result.city;
    result.city = cleanLocationPart(result.venue);
    result.venue = venue;
    return;
  }

  if (!result.address) return;

  const parts = result.address
    .split(',')
    .map(cleanLocationPart)
    .filter(Boolean);
  if (parts.length < 2) return;

  let regionIndex = parts.findIndex((part) => REGION_PART.test(part));
  if (regionIndex < 0) regionIndex = parts.length;

  for (let index = regionIndex - 1; index >= 0; index -= 1) {
    const candidate = parts[index];
    if (/^\d+[а-яa-z/-]*$/i.test(candidate)) continue;
    if (STREET_PART.test(candidate) || REGION_PART.test(candidate)) continue;
    if (!/[а-яёa-z]/i.test(candidate)) continue;

    result.venue = result.venue ?? result.city;
    result.city = candidate;
    return;
  }
}

function validatePhysicalLocation(result: ParsedMaxPost) {
  const format = (result as unknown as { format: string | null }).format;
  if (format !== 'OFFLINE' && format !== 'HYBRID') return;

  const rawCity = result.city?.trim() ?? '';
  const inferredCity = extractCityFromEventLocation({
    cityName: result.city,
    address: result.address,
    venue: result.venue,
  });

  if (!inferredCity || !isPlausibleCityName(inferredCity)) {
    if (rawCity && looksLikeVenueLocation(rawCity) && !result.venue?.trim()) {
      result.venue = rawCity;
    }
    result.city = null;
    setAttention(result, [
      ...result.attentionReasons,
      'Город очного участия не определён или требует проверки',
    ]);
    return;
  }

  result.city = inferredCity;
}

@Injectable()
export class MaxParserService extends BaseMaxParserService {
  override parse(
    text: string,
    postDate?: Date,
    supplementalUrls: string[] = [],
  ): ParsedMaxPost {
    const result = super.parse(text, postDate, supplementalUrls);

    // Structured MAX posts commonly put the delivery mode and physical place
    // on separate lines: "Формат: Очно" followed by "Где: Москва". Parse the
    // Где value deterministically before canonical city validation.
    const formatValue = text.match(/Формат\s*:\s*([^\n]+)/i)?.[1]?.trim() ?? '';
    const whereValue = text.match(/Где\s*:\s*([^\n]+)/i)?.[1]?.trim() ?? '';
    if (
      whereValue &&
      PHYSICAL_FORMAT_PATTERN.test(formatValue) &&
      !HYBRID_PATTERN.test(formatValue)
    ) {
      (result as unknown as { format: string | null }).format = 'OFFLINE';
      applyPhysicalWhereValue(whereValue, result);
    }

    repairHybridLocation(text, result);
    repairVenueFirstLocation(result);
    validatePhysicalLocation(result);

    const usedFallback =
      result.directionSlugs.length === 1 &&
      result.directionSlugs[0] === 'accounting' &&
      result.tags.includes('auto-direction-fallback');

    if (!usedFallback) return result;

    const inferred = CYRILLIC_DIRECTION_HINTS.flatMap((hint) =>
      hint.pattern.test(text) ? hint.slugs : [],
    );

    if (inferred.length === 0) return result;

    result.directionSlugs = [...new Set(inferred)];
    result.tags = result.tags.filter(
      (tag) => tag !== 'auto-direction-fallback',
    );
    return result;
  }
}

export type { ParsedMaxPost };
