import type { PublicEvent } from '@/types/event';

const SERVICE_LABEL =
  '(?:когда|дата(?:\\s+и\\s+время)?|время(?:\\s+проведения)?|начало|место(?:\\s+проведения)?|адрес|формат|стоимость|цена|участие|спикер(?:ы)?|ведущ(?:ий|ая)|онлайн)';
const OPTIONAL_MARKERS = '[\\s📅🗓⏰🕐📍🌐💻🏢💰💵🎙️🎤•▪▫–—-]*';
const BLOCK_TAGS = 'h1|h2|h3|h4|h5|h6|p|div|li|blockquote';
const SPEAKER_MARKER_SOURCE = '(?:🎙️?|🎤️?)';
const SPEAKER_WORD_SOURCE = "[A-ZА-ЯЁ][A-Za-zА-Яа-яЁё'’.-]+";
const SPEAKER_NAME_SOURCE =
  `${SPEAKER_WORD_SOURCE}(?:\\s+${SPEAKER_WORD_SOURCE}){1,4}`;
const INVALID_SPEAKER =
  /^(?:при\s+регистрации|уточняется|по\s+запросу|не\s+указан(?:о|а)?|бесплатно|платно)$/i;

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (match, hex: string) => {
      try {
        return String.fromCodePoint(Number.parseInt(hex, 16));
      } catch {
        return match;
      }
    })
    .replace(/&#(\d+);?/g, (match, decimal: string) => {
      try {
        return String.fromCodePoint(Number.parseInt(decimal, 10));
      } catch {
        return match;
      }
    })
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function htmlToPlainText(value?: string | null): string {
  if (!value) return '';

  return decodeBasicEntities(value)
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:p|div|li|blockquote|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeComparableText(value?: string | null): string {
  if (!value) return '';

  return htmlToPlainText(value)
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

function collectMatches(value: string, pattern: RegExp): RegExpExecArray[] {
  const matches: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;

  pattern.lastIndex = 0;

  while ((match = pattern.exec(value)) !== null) {
    matches.push(match);

    if (match[0].length === 0) {
      pattern.lastIndex += 1;
    }
  }

  return matches;
}

function normalizeSpeakerName(value?: string | null): string | null {
  if (!value) return null;

  const candidate = decodeBasicEntities(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/^[\s🎙️🎤•▪▫–—-]+/, '')
    .replace(/^(?:спикер(?:ы)?|ведущ(?:ий|ая))\s*[:：—–-]?\s*/i, '')
    .split(/\s+[—–-]\s+/)[0]
    ?.replace(/[,:;.!?]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!candidate || INVALID_SPEAKER.test(candidate)) return null;

  if (!new RegExp(`^${SPEAKER_NAME_SOURCE}$`).test(candidate)) {
    return null;
  }

  return candidate;
}

function appendSpeaker(target: string[], value?: string | null): void {
  const speaker = normalizeSpeakerName(value);
  if (!speaker) return;

  const comparable = speaker.toLocaleLowerCase('ru-RU');
  if (
    target.some(
      (current) => current.toLocaleLowerCase('ru-RU') === comparable,
    )
  ) {
    return;
  }

  target.push(speaker);
}

function appendSpeakersFromSource(target: string[], value?: string | null): void {
  const plainText = htmlToPlainText(value);
  if (!plainText) return;

  const markerPattern = new RegExp(SPEAKER_MARKER_SOURCE, 'g');
  const markers = collectMatches(plainText, markerPattern);

  markers.forEach((marker, index) => {
    const start = (marker.index ?? 0) + marker[0].length;
    const end = markers[index + 1]?.index ?? plainText.length;
    appendSpeaker(target, plainText.slice(start, end));
  });

  const titledSpeakerPattern = new RegExp(
    `(${SPEAKER_NAME_SOURCE})\\s+[—–-]\\s+`,
    'g',
  );

  for (const match of collectMatches(plainText, titledSpeakerPattern)) {
    appendSpeaker(target, match[1]);
  }

  for (const line of plainText.split('\n')) {
    const labelled = line.match(
      /^\s*(?:спикер(?:ы)?|ведущ(?:ий|ая))\s*[:：—–-]\s*(.+)$/i,
    );
    if (!labelled) continue;

    for (const part of labelled[1].split(
      /\s*(?:;|\||,\s*(?=[A-ZА-ЯЁ]))\s*/,
    )) {
      appendSpeaker(target, part);
    }
  }
}

/**
 * Returns every public speaker available in the structured field or imported
 * description. Historical MAX records may contain several microphone-prefixed
 * speaker blocks even when the legacy `speaker` column contains only one name.
 */
export function getEventModalSpeakers(event: PublicEvent): string[] {
  const speakers: string[] = [];

  appendSpeakersFromSource(speakers, event.speaker);
  appendSpeakersFromSource(speakers, event.fullDescription);
  appendSpeakersFromSource(speakers, event.shortDescription);

  if (speakers.length === 0 && event.speaker) {
    for (const part of event.speaker.split(
      /\s*(?:\r?\n|;|\||,\s*(?=[A-ZА-ЯЁ]))\s*/,
    )) {
      appendSpeaker(speakers, part);
    }
  }

  return speakers;
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

  const speakers = getEventModalSpeakers(event).map(normalizeComparableText);
  if (
    speakers.some(
      (speaker) =>
        speaker &&
        (text === speaker ||
          text === `спикер ${speaker}` ||
          text === `спикеры ${speaker}` ||
          text === `ведущий ${speaker}` ||
          text === `ведущая ${speaker}`),
    )
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
 * Truncates each editorial block at the first microphone marker. It handles
 * literal emoji, variation selectors, numeric HTML entities and nested spans.
 */
function removeInlineSpeakerFragments(value: string): string {
  let result = decodeBasicEntities(value);
  const blockPattern = new RegExp(
    `<(${BLOCK_TAGS})([^>]*)>([\\s\\S]*?)<\\/\\1>`,
    'gi',
  );
  const markerPattern = new RegExp(SPEAKER_MARKER_SOURCE);

  result = result.replace(
    blockPattern,
    (block, tag: string, attributes: string, inner: string) => {
      const markerIndex = inner.search(markerPattern);
      if (markerIndex < 0) return block;

      const editorialPrefix = htmlToPlainText(inner.slice(0, markerIndex));
      return editorialPrefix
        ? `<${tag}${attributes}>${escapeHtml(editorialPrefix)}</${tag}>`
        : '';
    },
  );

  result = result.replace(
    new RegExp(`${SPEAKER_MARKER_SOURCE}[^\\r\\n]*(?=\\r?\\n|$)`, 'g'),
    '',
  );
  result = result.replace(
    new RegExp(
      `\\s+(?:спикер(?:ы)?|ведущ(?:ий|ая))\\s*[:：—–-]\\s*[\\s\\S]*?(?=<\\/(?:${BLOCK_TAGS})>|\\r?\\n|$)`,
      'gi',
    ),
    '',
  );

  return result;
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

  let result = removeInlineSpeakerFragments(value);

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

  result = removeInlineSpeakerFragments(result);

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
