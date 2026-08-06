export interface EventLocationSource {
  cityName?: string | null;
  venue?: string | null;
  address?: string | null;
}

const NON_CITY_VALUES = new Set([
  'онлайн',
  'online',
  'очно',
  'офлайн',
  'offline',
  'дистанционно',
  'гибридный формат',
]);

const COUNTRY_VALUES = new Set([
  'россия',
  'рф',
  'russia',
]);

const VENUE_MARKERS = [
  'отель',
  'гостиниц',
  'бизнес-центр',
  'бизнес центр',
  'конференц',
  'центр событий',
  'лекторий',
  'офис',
  'зал',
  'площадк',
  'рбк',
  'ресторан',
  'кафе',
  'театр',
  'музей',
];

const STREET_PREFIX = /^(?:ул\.?|улица|проспект|пр-т|пер\.?|переулок|шоссе|наб\.?|набережная|бульвар|бул\.?|пл\.?|площадь|проезд|аллея|тракт)\b/i;
const HOUSE_PART = /^(?:(?:д\.?|дом|корп\.?|корпус|стр\.?|строение|лит\.?|офис)\s*)?\d+[а-яa-z]?(?:[-/]\d+[а-яa-z]?)?(?:\s*(?:корп\.?|к\.?|стр\.?|лит\.?)\s*\d+[а-яa-z]?)?$/i;
const REGION_PART = /(?:обл(?:асть)?\.?|край|респ(?:ублика)?\.?|автономн(?:ая|ый)\s+(?:область|округ)|ао|федеральн(?:ый|ого)\s+округ|район|р-н)$/i;
const FORMAT_WORDS = /(?:онлайн|online|офлайн|offline|очно|дистанционно|трансляц)/i;

export function normalizeLocationValue(value: string): string {
  return value
    .trim()
    .replace(/^(?:г\.|город)\s*/i, '')
    .replace(/[«»]/g, '"')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('ru');
}

export function splitLocationParts(value: string): string[] {
  return value
    .split(/\s*(?:,|;|\|)\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function looksLikeVenueLocation(value: string): boolean {
  const normalized = normalizeLocationValue(value);
  return VENUE_MARKERS.some((marker) => normalized.includes(marker));
}

export function isNonCityLocationValue(value: string): boolean {
  const normalized = normalizeLocationValue(value);
  return (
    NON_CITY_VALUES.has(normalized) ||
    COUNTRY_VALUES.has(normalized) ||
    FORMAT_WORDS.test(normalized)
  );
}

function looksLikeStreetOrHouse(value: string): boolean {
  const normalized = value.trim();
  return (
    STREET_PREFIX.test(normalized) ||
    HOUSE_PART.test(normalized) ||
    /\d/.test(normalized)
  );
}

function looksLikeRegion(value: string): boolean {
  return REGION_PART.test(value.trim());
}

function cleanCityCandidate(value: string): string {
  return value
    .trim()
    .replace(/^(?:г\.|город)\s*/i, '')
    .replace(/[.!?;:]+$/, '')
    .trim();
}

export function isPlausibleCityName(value: string): boolean {
  const candidate = cleanCityCandidate(value);
  if (!candidate || candidate.length < 2 || candidate.length > 80) return false;
  if (isNonCityLocationValue(candidate)) return false;
  if (looksLikeVenueLocation(candidate)) return false;
  if (looksLikeStreetOrHouse(candidate)) return false;
  if (looksLikeRegion(candidate)) return false;
  return /[А-Яа-яЁёA-Za-z]/.test(candidate);
}

function extractHybridCity(value: string): string | null {
  const offlineInCity = value.match(
    /(?:очно|офлайн|offline)\s+(?:в\s+)?(?:г\.\s*)?([^/+;,()]+?)(?=\s*(?:\/|\+|и\s+(?:онлайн|online)|$))/i,
  );
  const firstCandidate = cleanCityCandidate(offlineInCity?.[1] ?? '');
  if (isPlausibleCityName(firstCandidate)) return firstCandidate;

  const cityBeforeOnline = value.match(
    /^\s*(?:г\.\s*)?([^/+;,()]+?)\s*(?:\/|\+)\s*(?:онлайн|online)/i,
  );
  const secondCandidate = cleanCityCandidate(cityBeforeOnline?.[1] ?? '');
  if (isPlausibleCityName(secondCandidate)) return secondCandidate;

  return null;
}

function findCatalogueCity(
  values: string[],
  catalogueCityNames: string[],
): string | null {
  const candidates = catalogueCityNames
    .map(cleanCityCandidate)
    .filter(isPlausibleCityName)
    .sort((a, b) => b.length - a.length);

  for (const city of candidates) {
    const normalizedCity = normalizeLocationValue(city);
    for (const value of values) {
      const parts = splitLocationParts(value);
      if (
        parts.some((part) => normalizeLocationValue(part) === normalizedCity) ||
        normalizeLocationValue(value).startsWith(`${normalizedCity} (`)
      ) {
        return city;
      }
    }
  }

  return null;
}

function extractCityFromValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const hybridCity = extractHybridCity(trimmed);
  if (hybridCity) return hybridCity;

  const explicitCity = trimmed.match(
    /(?:^|[,;])\s*(?:г\.|город)\s*([^,;]+)/i,
  );
  const explicitCandidate = cleanCityCandidate(explicitCity?.[1] ?? '');
  if (isPlausibleCityName(explicitCandidate)) return explicitCandidate;

  const parts = splitLocationParts(trimmed);
  if (parts.length === 1) {
    const directCandidate = cleanCityCandidate(parts[0]);
    return isPlausibleCityName(directCandidate) ? directCandidate : null;
  }

  const firstCandidate = cleanCityCandidate(parts[0]);
  if (isPlausibleCityName(firstCandidate)) return firstCandidate;

  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const candidate = cleanCityCandidate(parts[index]);
    if (isPlausibleCityName(candidate)) return candidate;
  }

  return null;
}

export function extractCityFromEventLocation(
  source: EventLocationSource,
  catalogueCityNames: string[] = [],
): string | null {
  const values = [source.cityName, source.address, source.venue]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim());

  if (values.length === 0) return null;

  const catalogueCity = findCatalogueCity(values, catalogueCityNames);
  if (catalogueCity) return catalogueCity;

  const sourcePriority = [source.cityName, source.address, source.venue];
  for (const value of sourcePriority) {
    if (!value?.trim()) continue;
    const city = extractCityFromValue(value);
    if (city) return city;
  }

  return null;
}
