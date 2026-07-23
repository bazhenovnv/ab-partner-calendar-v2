'use client';

import DOMPurify from 'dompurify';

const EVENT_ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
  'h2',
  'h3',
  'h4',
] as const;

const EVENT_ALLOWED_ATTR = [
  'href',
  'title',
  'target',
  'rel',
] as const;

let hooksConfigured = false;

function configureHooks(): void {
  if (hooksConfigured) return;

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (!(node instanceof Element)) return;
    if (node.tagName.toLowerCase() !== 'a') return;

    const href = node.getAttribute('href');

    if (!href) {
      node.removeAttribute('target');
      node.removeAttribute('rel');
      return;
    }

    if (node.getAttribute('target') === '_blank') {
      node.setAttribute('rel', 'noopener noreferrer');
      return;
    }

    node.removeAttribute('target');
    node.removeAttribute('rel');
  });

  hooksConfigured = true;
}

/**
 * Очищает HTML мероприятия от потенциально опасной разметки.
 *
 * Фильтрация регистрационных фраз, Telegram/MAX-ссылок и CTA
 * выполняется отдельно функцией sanitizeDescription().
 */
export function sanitizeEventHtml(value?: string | null): string {
  if (!value) return '';

  configureHooks();

  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [...EVENT_ALLOWED_TAGS],
    ALLOWED_ATTR: [...EVENT_ALLOWED_ATTR],

    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,

    FORBID_TAGS: [
      'script',
      'style',
      'iframe',
      'object',
      'embed',
      'form',
      'input',
      'button',
      'textarea',
      'select',
      'option',
      'link',
      'meta',
      'base',
      'svg',
      'math',
    ],

    FORBID_ATTR: [
      'style',
      'src',
      'srcset',
      'ping',
      'download',
      'formaction',
      'xlink:href',
    ],
  });
}
