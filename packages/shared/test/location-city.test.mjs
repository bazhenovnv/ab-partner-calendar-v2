import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  extractCityFromEventLocation,
  extractRegionFromEventLocation,
  isPlausibleCityName,
} from '../dist/index.js';

describe('event location city extraction', () => {
  test('extracts city from a Russian address', () => {
    assert.equal(
      extractCityFromEventLocation({
        cityName: 'Зеленоградск',
        address: 'ул. Московская, 50, Зеленоградск, Калининградская обл.',
      }),
      'Зеленоградск',
    );
  });

  test('extracts Moscow from a city plus venue label', () => {
    assert.equal(
      extractCityFromEventLocation({
        cityName: 'Москва, Центр событий РБК',
      }),
      'Москва',
    );
  });

  test('canonicalizes inflected Moscow in hybrid label using candidates', () => {
    assert.equal(
      extractCityFromEventLocation(
        { cityName: 'Очно в Москве / онлайн-трансляция' },
        ['Москва'],
      ),
      'Москва',
    );
  });

  test('keeps a direct city even when the address contains venue details', () => {
    assert.equal(
      extractCityFromEventLocation({
        cityName: 'Москва',
        address: 'ул. Петровка, д. 15, стр. 1, 2-й этаж, Малый конференц-зал',
      }),
      'Москва',
    );
  });

  test('extracts region without treating it as a city', () => {
    assert.equal(
      extractRegionFromEventLocation({
        address: 'ул. Московская, 50, Зеленоградск, Калининградская обл.',
      }),
      'Калининградская обл.',
    );
  });

  test('rejects production non-city and venue values', () => {
    for (const value of [
      'Онлайн',
      'Очно',
      '4-й Лесной пер.',
      'ст1',
      'Экспофорум',
      'офлайн + онлайн',
      'Малый конференц-зал',
      'Очно в Москве / онлайн-трансляция',
    ]) {
      assert.equal(isPlausibleCityName(value), false, value);
    }
  });
});
