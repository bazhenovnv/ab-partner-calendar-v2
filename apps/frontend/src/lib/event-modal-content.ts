import type { PublicEvent } from '@/types/event';

const SERVICE_LABEL =
  '(?:когда|дата(?:\\s+и\\s+время)?|время(?:\\s+проведения)?|начало|место(?:\\s+проведения)?|адрес|формат|стоимость|цена|участие|спикер(?:ы)?|ведущ(?:ий|ая)|онлайн)';
const OPTIONAL_MARKERS = '[\\s📅🗓⏰🕐📍🌐💻🏢💰💵🎙️🎤•▪▫–—-]*';
const BLOCK_TAGS = 'h1|h2|h3|h4|h5|h6|p|div|li|blockquote';

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function normalizeComparableText(value?: string | null): string {
  if (!value) return '';

  return decodeBasicEntities(value)
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\*\*|__|~~/g, '')
    .replace(/[«»"'`]/g, '')
    .replace(/[ \t\r\n]+/g, ' ')
    .trim()
    .toLocaleLowerCase('ru-RU');
}

function withoutTerminalPunctuation(value: string): string {
  return value.replace(/[.!?…]+$/, '').trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanSpeaker(value?: string | null): string {
  return value?.split(/\s+[—–-]\s+/)[0]?.trim() ?? '';
}

function normalizeTime(value?: string | null): string {
  return (value ?? '')
    .toLocaleLowerCase('ru-RU')
    .replace(/\s+/g, '')
    .replace(/[()]/g, '');
}

function isRepeatedEventMetadata(value: string, event: PublicEvent): boolean {
  const text = normalizeComparableText(value).replace(
    /^[\s📅🗓⏰🕐📍🌐💻🏢💰💵🎙️🎤•▪▫–—-]+/,
    '',
  );
  if (!text) return true;

  const title = normalizeComparableText(event.title);
  if (
    title &&
    withoutTerminalPunctuation(text) === withoutTerminalPunctuation(title)
  ) {
    return true;
  }

  if (
    /^(?:онлайн|офлайн|бесплатно|платно|при\s+регистрации|по\s+запросу|уточняется)$/i.test(
      text,
    )
  ) {
    return true;
  }

  if (
    new RegExp(`^${SERVICE_LABEL}\\s*[:：—–-]`, 'i').test(text)
  ) {
    return true;
  }

  const speaker = normalizeComparableText(cleanSpeaker(event.speaker));
  if (
    speaker &&
    (text === speaker ||
      text === `спикер ${speaker}` ||
      text === `спикеры ${speaker}` ||
      text === `ведущий ${speaker}` ||
      text === `ведущая ${speaker}`)
  ) {
    return true;
  }

  const eventTime = normalizeTime(event.startTime);
  if (eventTime) {
    const candidateTime = normalizeTime(text);
    const timePattern = new RegExp(
      `^(?:время|начало)?${escapeRegExp(eventTime)}(?:[–—-]\\d{1,2}:\\d{2})?(?:мск)?$`,
      'i',
    );

    if (timePattern.test(candidateTime)) {
      return true;
    }
  }

  return false;
}

function removeRepeatedBlocks(value: string, event: PublicEvent): string {
  const blockPattern = new RegExp(
    `<(${BLOCK_TAGS})(?:\\s[^>]*)?>([\\s\\S]*?)<\\/\\1>`,
    'gi',
  );

  return value.replace(blockPattern, (block, _tag: string, inner: string) =>
    isRepeatedEventMetadata(inner, event) ? '' : block,
  );
}

function removeRepeatedPlainLines(value: string, event: PublicEvent): string {
  return value
    .split(/\r?\n/)
    .filter((line) => !isRepeatedEventMetadata(line, event))
    .join('\n');
}

function removeRepeatedBreakSegments(value: string, event: PublicEvent): string {
  return value.replace(
    /(^|<br\s*\/?\s*>)([^<>]*?)(?=<br\s*\/?\s*>|$)/gi,
    (segment, separator: string, text: string) =>
      isRepeatedEventMetadata(text, event) ? separator : segment,
  );
}

/**
 * Removes data already rendered by the structured modal UI while preserving
 * editorial body copy. This also cleans historical MAX records where the raw
 * post was stored wholesale in fullDescription.
 */
export function cleanEventModalDescription(
  value: string | null | undefined,
  event: PublicEvent,
): string {
  if (!value) return '';

  let result = value;

  result = removeRepeatedBlocks(result, event);
  result = removeRepeatedBreakSegments(result, event);
  result = removeRepeatedPlainLines(result, event);

  // Defensive cleanup for decorated service lines that may contain nested tags.
  result = result.replace(
    new RegExp(
      `<(${BLOCK_TAGS})[^>]*>${OPTIONAL_MARKERS}(?:<[^>]+>${OPTIONAL_MARKERS})*${SERVICE_LABEL}\\s*[:：—–-][\\s\\S]*?<\\/\\1>`,
      'gi',
    ),
    '',
  );
  result = result.replace(
    new RegExp(
      `(?:^|\\n)${OPTIONAL_MARKERS}${SERVICE_LABEL}\\s*[:：—–-][^\\n]*(?=\\n|$)`,
      'gim',
    ),
    '\n',
  );
  result = result.replace(
    new RegExp(
      `<br\\s*\\/?\\s*>${OPTIONAL_MARKERS}(?:<[^>]+>${OPTIONAL_MARKERS})*${SERVICE_LABEL}\\s*[:：—–-][\\s\\S]*?(?=<br\\s*\\/?\\s*>|<\\/(?:p|div|li)>|$)`,
      'gi',
    ),
    '',
  );

  // Registration blocks and messenger links are actions, not description copy.
  result = result.replace(
    /<(p|div|li)[^>]*>[\s\S]*?(?:зарегистрир|регистрац|записаться|для\s+участия|принять\s+участие|подать\s+заявку|ссылка\s+для\s+регистрации)[\s\S]*?<\/\1>/gi,
    '',
  );
  result = result.replace(
    /<a\b[^>]*href=["'][^"']*(?:max\.ru|t\.me|telegram\.me|telegram\.dog)[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,
    '',
  );
  result = result.replace(
    /(?:зарегистрир\w*|регистрац\w*|записаться|ссылка\s+для\s+регистрации|для\s+участия)[\s\S]{0,400}?https?:\/\/[^\s<>"']+(?:\s*[?&]?\s*mid\s*=\s*[A-Za-z0-9_-]+)?/gi,
    '',
  );
  result = result.replace(
    /https?:\/\/(?:www\.)?(?:max\.ru|t\.me|telegram\.me|telegram\.dog)\/[^\s<>"']+/gi,
    '',
  );
  result = result.replace(
    /(?:\?|&|&amp;)?\s*mid\s*=\s*[A-Za-z0-9_-]+/gi,
    '',
  );
  result = result.replace(
    /(?:зарегистрир\w*|регистрац\w*|записаться|ссылка\s+для\s+регистрации|для\s+участия)[^.!?<]*(?:[.!?]|$)/gi,
    '',
  );

  result = result.replace(
    /(?:\s|&nbsp;|<br\s*\/?>)*(?:#[A-Za-zА-Яа-яЁё0-9_-]+(?:\s|&nbsp;|<br\s*\/?>)*){2,}$/gi,
    '',
  );

  return result
    .replace(/<p[^>]*>\s*(?:&nbsp;|<br\s*\/?\s*>)*\s*<\/p>/gi, '')
    .replace(/(?:<br\s*\/?\s*>[\s\u00a0]*){3,}/gi, '<br><br>')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Both main and regular events prefer the dedicated square modal artwork.
 * Original and card variants remain fallbacks for historical records.
 */
export function getEventModalImageUrl(event: PublicEvent): string | null {
  const image = event.images?.[0];
  if (!image) return null;

  if (event.mainEvent) {
    return (
      image.modalUrl ??
      image.mainEventUrl ??
      image.originalUrl ??
      image.eventCardUrl ??
      image.thumbnailUrl ??
      null
    );
  }

  return (
    image.modalUrl ??
    image.originalUrl ??
    image.eventCardUrl ??
    image.thumbnailUrl ??
    image.mainEventUrl ??
    null
  );
}
