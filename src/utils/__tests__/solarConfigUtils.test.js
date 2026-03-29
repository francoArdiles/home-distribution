import { describe, test, expect } from 'vitest';
import { mergeSolarConfig, defaultSolarConfig } from '../solarConfigUtils.js';

describe('defaultSolarConfig', () => {
  test('tiene location con latitude y longitude', () => {
    expect(typeof defaultSolarConfig.location.latitude).toBe('number');
    expect(typeof defaultSolarConfig.location.longitude).toBe('number');
    expect(typeof defaultSolarConfig.location.cityName).toBe('string');
  });
  test('tiene dateTime con year, month, day, hour, minute', () => {
    const { dateTime } = defaultSolarConfig;
    ['year', 'month', 'day', 'hour', 'minute'].forEach(k => {
      expect(typeof dateTime[k]).toBe('number');
    });
  });
  test('tiene displayOptions con booleanos', () => {
    const { displayOptions } = defaultSolarConfig;
    ['showCardinals', 'showSolarPath', 'showCurrentSun', 'showShadows', 'northAtTop'].forEach(k => {
      expect(typeof displayOptions[k]).toBe('boolean');
    });
  });
});

describe('mergeSolarConfig', () => {
  test('merge parcial de location actualiza solo los campos provistos', () => {
    const result = mergeSolarConfig(defaultSolarConfig, {
      location: { latitude: 19.43, longitude: -99.13, cityName: 'Ciudad de México' },
    });
    expect(result.location.latitude).toBe(19.43);
    expect(result.location.longitude).toBe(-99.13);
    expect(result.location.cityName).toBe('Ciudad de México');
    // dateTime sin cambios
    expect(result.dateTime).toEqual(defaultSolarConfig.dateTime);
  });

  test('merge parcial de dateTime actualiza solo los campos provistos', () => {
    const result = mergeSolarConfig(defaultSolarConfig, { dateTime: { hour: 15 } });
    expect(result.dateTime.hour).toBe(15);
    expect(result.dateTime.year).toBe(defaultSolarConfig.dateTime.year);
  });

  test('merge parcial de displayOptions', () => {
    const result = mergeSolarConfig(defaultSolarConfig, {
      displayOptions: { showShadows: true },
    });
    expect(result.displayOptions.showShadows).toBe(true);
    expect(result.displayOptions.showCardinals).toBe(defaultSolarConfig.displayOptions.showCardinals);
  });

  test('no muta el objeto original', () => {
    const original = JSON.parse(JSON.stringify(defaultSolarConfig));
    mergeSolarConfig(defaultSolarConfig, { location: { latitude: 99 } });
    expect(defaultSolarConfig.location.latitude).toBe(original.location.latitude);
  });

  test('retorna nuevo objeto (no la misma referencia)', () => {
    const result = mergeSolarConfig(defaultSolarConfig, {});
    expect(result).not.toBe(defaultSolarConfig);
  });

  test('merge sin partial retorna copia del config original', () => {
    const result = mergeSolarConfig(defaultSolarConfig, {});
    expect(result).toEqual(defaultSolarConfig);
  });
});
