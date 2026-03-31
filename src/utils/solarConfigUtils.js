const now = new Date();

export const defaultSolarConfig = {
  location: {
    latitude: 40.4168,
    longitude: -3.7038,
    cityName: 'Madrid',
    utcOffset: 1,
  },
  dateTime: {
    year: now.getFullYear(),
    month: now.getMonth(),
    day: now.getDate(),
    hour: 12,
    minute: 0,
  },
  displayOptions: {
    showCardinals: true,
    showSolarPath: true,
    showCurrentSun: true,
    showShadows: false,
    northAtTop: true,
  },
};

/**
 * Deep-merge a partial solarConfig into the current config.
 * Only the top-level keys provided in `partial` are merged; nested objects are shallow-merged.
 * Does NOT mutate `current`.
 */
export const mergeSolarConfig = (current, partial) => ({
  ...current,
  location: { ...current.location, ...(partial.location ?? {}) },
  dateTime: { ...current.dateTime, ...(partial.dateTime ?? {}) },
  displayOptions: { ...current.displayOptions, ...(partial.displayOptions ?? {}) },
});
