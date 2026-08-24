import { Injectable } from '@nestjs/common';
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

const VENUE_PREFIX = /^(?:отель|гостиниц|бизнес[-\s]?центр|бц\b|конференц|центр\b|зал\b|офис\b|ресторан\b|кафе\b)/i;
const STREET_PART = /^(?:ул\.?|улица|проспект|пр-т|пер\.?|переулок|шоссе|наб\.?|набережная|бульвар|бул\.?|пл\.?|площадь|д\.?\s*\d|дом\b)/i;
const REGION_PART = /(?:обл\.?|область|край|респ\.?|республика|автономн|округ|ао)$/i;

function cleanLocationPart(value: string) {
  return value.trim().replace(/^(?:г\.|город)\s*/i, '').trim();
}

function repairVenueFirstLocation(result: ParsedMaxPost) {
  if (result.format !== 'OFFLINE' || !result.city || !result.address) return;
  if (!VENUE_PREFIX.test(result.city)) return;

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

@Injectable()
export class MaxParserService extends BaseMaxParserService {
  override parse(
    text: string,
    postDate?: Date,
    supplementalUrls: string[] = [],
  ): ParsedMaxPost {
    const result = super.parse(text, postDate, supplementalUrls);
    repairVenueFirstLocation(result);

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
