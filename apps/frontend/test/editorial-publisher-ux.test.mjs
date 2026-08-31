import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const publisherPath = new URL('../src/app/admin/editorial/EditorialPublisher.tsx', import.meta.url);
const stylesPath = new URL('../src/app/admin/editorial/editorial-v2.module.css', import.meta.url);

const [publisher, styles] = await Promise.all([
  readFile(publisherPath, 'utf8'),
  readFile(stylesPath, 'utf8'),
]);

test('editorial publisher renders MAX and Telegram as vertical columns', () => {
  assert.match(publisher, /ChannelColumn title="Макс"/);
  assert.match(publisher, /ChannelColumn title="ТГ"/);
  assert.match(publisher, /Макс - \"АБ Афиша бухгалтера простая\"/);
  assert.match(publisher, /Макс - \"АБ\| Афиша бухгалтера\"/);
  assert.match(styles, /\.channelColumns[\s\S]*grid-template-columns:\s*repeat\(2/);
  assert.match(styles, /\.channelColumnList[\s\S]*flex-direction:\s*column/);
});

test('editorial publisher has one common preview with full images', () => {
  assert.match(publisher, /Общий предварительный просмотр/);
  assert.doesNotMatch(publisher, /previewPlatform/);
  assert.doesNotMatch(publisher, /previewTabs/);
  assert.match(styles, /\.previewImage[\s\S]*height:\s*auto/);
  assert.match(styles, /\.previewImage[\s\S]*object-fit:\s*contain/);
});

test('editorial publisher keeps successful uploads and exposes scheduling controls', () => {
  assert.match(publisher, /const failures: string\[\] = \[\]/);
  assert.match(publisher, /if \(uploaded\.length\)/);
  assert.match(publisher, /input\.value = ''/);
  assert.match(publisher, /Время размещения/);
  assert.match(publisher, /Разместить сейчас/);
  assert.match(publisher, /Запланировать/);
  assert.match(publisher, /\/editorial\/posts\/\$\{id\}\/schedule/);
});
