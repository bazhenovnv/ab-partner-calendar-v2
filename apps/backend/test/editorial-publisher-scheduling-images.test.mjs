import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const controllerPath = new URL('../src/modules/editorial/editorial.controller.ts', import.meta.url);
const imageServicePath = new URL('../src/modules/editorial/editorial-image.service.ts', import.meta.url);
const schedulerPath = new URL('../src/modules/editorial/editorial-scheduler.service.ts', import.meta.url);

const [controller, imageService, scheduler] = await Promise.all([
  readFile(controllerPath, 'utf8'),
  readFile(imageServicePath, 'utf8'),
  readFile(schedulerPath, 'utf8'),
]);

test('editorial upload preserves the full image instead of cropping it', () => {
  assert.match(imageService, /fit:\s*'contain'/);
  assert.doesNotMatch(imageService, /fit:\s*'cover'/);
  assert.match(imageService, /flatten\(\{ background: '#ffffff' \}\)/);
  assert.match(imageService, /SUPPORTED_FORMATS/);
});

test('editorial upload uses the robust image service and allows large photos', () => {
  assert.match(controller, /EditorialImageService/);
  assert.match(controller, /40 \* 1024 \* 1024/);
  assert.match(controller, /template \|\| 'original'/);
});

test('editorial scheduled publishing is explicit and claims due posts atomically', () => {
  assert.match(controller, /@Post\('posts\/:id\/schedule'\)/);
  assert.match(scheduler, /@Cron\('\*\/15 \* \* \* \* \*'\)/);
  assert.match(scheduler, /status:\s*'SCHEDULED'/);
  assert.match(scheduler, /updateMany\(\{/);
  assert.match(scheduler, /status:\s*'PUBLISHING'/);
  assert.match(scheduler, /this\.editorial\.publish\(post\.id, post\.channelKeys\)/);
});
