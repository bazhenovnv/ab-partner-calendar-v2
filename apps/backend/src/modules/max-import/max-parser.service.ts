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

@Injectable()
export class MaxParserService extends BaseMaxParserService {
  override parse(
    text: string,
    postDate?: Date,
    supplementalUrls: string[] = [],
  ): ParsedMaxPost {
    const result = super.parse(text, postDate, supplementalUrls);
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
