import SunCalc from 'suncalc';

/**
 * Convert suncalc azimuth (radians, S=0, W=positive) to geographic convention:
 * degrees, N=0, E=90, S=180, W=270 (clockwise from North).
 */
const toGeoAzimuth = (suncalcAzimuth) => {
  const deg = (suncalcAzimuth * 180) / Math.PI + 180;
  return ((deg % 360) + 360) % 360;
};

/**
 * Get solar position (azimuth + elevation) for a given date/time and location.
 * @param {Date} date
 * @param {number} latitude  - degrees, -90 to 90
 * @param {number} longitude - degrees, -180 to 180
 * @returns {{ azimuth: number, elevation: number }} azimuth in [0,360), elevation in degrees
 */
export const getSolarPosition = (date, latitude, longitude) => {
  const pos = SunCalc.getPosition(date, latitude, longitude);
  return {
    azimuth: toGeoAzimuth(pos.azimuth),
    elevation: pos.altitude * (180 / Math.PI),
  };
};

/**
 * Get solar positions for every `intervalHours` hours during a full day.
 * @param {Date}   date          - any Date; year/month/day used, time ignored
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} intervalHours - step in hours (default 1)
 * @returns {Array<{hour, azimuth, elevation, aboveHorizon}>}
 */
export const getSolarPathForDay = (date, latitude, longitude, intervalHours = 1) => {
  const result = [];
  const steps = Math.round(24 / intervalHours);
  for (let i = 0; i < steps; i++) {
    const hour = i * intervalHours;
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0, 0)
    );
    const pos = getSolarPosition(d, latitude, longitude);
    result.push({
      hour,
      azimuth: pos.azimuth,
      elevation: pos.elevation,
      aboveHorizon: pos.elevation >= 0,
    });
  }
  return result;
};

/**
 * Get sunrise time for a given date and location.
 * @returns {{ hour: number, minute: number } | null}
 */
export const getSunrise = (date, latitude, longitude) => {
  const times = SunCalc.getTimes(date, latitude, longitude);
  if (!times.sunrise || isNaN(times.sunrise.getTime())) return null;
  return {
    hour: times.sunrise.getUTCHours(),
    minute: times.sunrise.getUTCMinutes(),
  };
};

/**
 * Get sunset time for a given date and location.
 * @returns {{ hour: number, minute: number } | null}
 */
export const getSunset = (date, latitude, longitude) => {
  const times = SunCalc.getTimes(date, latitude, longitude);
  if (!times.sunset || isNaN(times.sunset.getTime())) return null;
  return {
    hour: times.sunset.getUTCHours(),
    minute: times.sunset.getUTCMinutes(),
  };
};

/**
 * Convert a geographic azimuth (degrees, N=0, E=90, S=180, W=270) to a 2D unit vector.
 * Canvas convention: North = up (y decreases), East = right (x increases).
 * @param {number} azimuthDeg
 * @returns {{ x: number, y: number }}
 */
export const azimuthToVector = (azimuthDeg) => {
  const rad = (azimuthDeg * Math.PI) / 180;
  return {
    x: Math.sin(rad),   // E component
    y: -Math.cos(rad),  // N component (inverted for canvas)
  };
};
