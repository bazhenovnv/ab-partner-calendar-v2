import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  extractCityFromEventLocation,
  isPlausibleCityName,
} from '../dist/index.js';

describe('event location city extraction', () => {
  test('extracts city from venue-first Russian address', () => {
    assert.equal(
      extractCityFromEventLocation({
        cityName: 'Отель "Королева Луиза"',
        venue: 'Отель "Королева Луиза"',
        address: 'ул. Московская, 50, Зеленоградск, Калининградская обл.',
      }),
      'Зеленоградск',
    );
  });

  test('extracts Moscow from a hybrid format label', () => {
    assert.equal(
      extractCityFromEventLocation({
        cityName: 'Очно в Москве / онлайн-трансляция',
      }),
      'Москве',
    );
  });

  test('prefers catalogue spelling for inflected hybrid labels', () => {
    assert.equal(
      extractCityFromEventLocation(
        { cityName: 'Очно в Москве / онлайн-трансляция' },
        ['Москва'],
      ),
      'Москва',
    );
  });

  test('keeps city-first offline locations', () => {
    assert.equal(
      extractCityFromEventLocation({
        cityName: 'Тюмень',
        address: 'ул. 25 Октября, 23а, ст1',
      }),
      'Тюмень',
    );
  });

  test('does not classify venue and format labels as cities', () => {
    assert.equal(isPlausibleCityName('Отель "Королева Луиза"'), false);
    assert.equal(isPlausibleCityName('Очно в Москве / онлайн-трансляция'), false);
    assert.equal(isPlausibleCityName('Онлайн'), false);
  });
});
