import React from 'react';
import { Layer, Circle, Line } from 'react-konva';
import { getSolarPosition, getSolarPathForDay } from '../utils/solarUtils.js';

// Minimum arc radius in meters when no terrain is defined
const MIN_ARC_RADIUS_METERS = 25;

/**
 * Compute the terrain bounding radius in meters (centroid → farthest vertex).
 * Returns MIN_ARC_RADIUS_METERS when there are fewer than 3 points.
 */
const terrainBoundingRadiusMeters = (terrainPoints, baseScale) => {
  if (!terrainPoints || terrainPoints.length < 3) return MIN_ARC_RADIUS_METERS;
  const cx = terrainPoints.reduce((s, p) => s + p.x, 0) / terrainPoints.length;
  const cy = terrainPoints.reduce((s, p) => s + p.y, 0) / terrainPoints.length;
  const maxDist = Math.max(...terrainPoints.map(p => Math.hypot(p.x - cx, p.y - cy)));
  const radiusM = maxDist / baseScale;
  return Math.max(MIN_ARC_RADIUS_METERS, radiusM * 1.3); // 30% margin beyond terrain edge
};

/**
 * Compute the terrain centroid (stage pixel coords) from layer-pixel polygon points.
 * Falls back to screen center when no terrain is defined.
 */
const computeCenter = (terrainPoints, scale, position, width, height) => {
  if (!terrainPoints || terrainPoints.length === 0) {
    return { x: width / 2, y: height / 2 };
  }
  const lx = terrainPoints.reduce((s, p) => s + p.x, 0) / terrainPoints.length;
  const ly = terrainPoints.reduce((s, p) => s + p.y, 0) / terrainPoints.length;
  return {
    x: lx * scale + position.x,
    y: ly * scale + position.y,
  };
};

/**
 * Maps solar azimuth + elevation to canvas (x, y) stage coords,
 * anchored at `center` with `radius` in stage pixels.
 * elevation 0° → edge of arc, 90° → center
 */
const sunToStage = (azimuth, elevation, center, radius) => {
  const azRad = (azimuth * Math.PI) / 180;
  const dist = radius * (1 - Math.max(0, elevation) / 90);
  return {
    x: center.x + Math.sin(azRad) * dist,
    y: center.y - Math.cos(azRad) * dist,
  };
};

const SolarPathLayer = ({
  solarConfig,
  width,
  height,
  scale,
  position,
  baseScale,
  terrainPoints = [],
}) => {
  const { location, dateTime, displayOptions } = solarConfig;
  const { showSolarPath, showCurrentSun } = displayOptions;

  // Reference point: terrain centroid in stage pixels
  const center = computeCenter(terrainPoints, scale, position, width, height);

  // Arc radius adapts to terrain size, then scales with zoom
  const arcRadiusMeters = terrainBoundingRadiusMeters(terrainPoints, baseScale);
  const pathRadius = arcRadiusMeters * baseScale * scale;

  const utcOffset = location.utcOffset ?? 0;

  // Solar path for the day — iterate local hours so labels show local time
  const dayDate = new Date(Date.UTC(dateTime.year, dateTime.month, dateTime.day, 12));
  const hourlyPath = getSolarPathForDay(dayDate, location.latitude, location.longitude, 1, utcOffset);
  const abovePath = hourlyPath.filter(e => e.aboveHorizon);

  // Current sun position — convert local hour to UTC before querying SunCalc
  const currentDate = new Date(
    Date.UTC(dateTime.year, dateTime.month, dateTime.day, dateTime.hour - utcOffset, dateTime.minute)
  );
  const currentPos = getSolarPosition(currentDate, location.latitude, location.longitude);
  const currentStage = sunToStage(currentPos.azimuth, currentPos.elevation, center, pathRadius);

  // Path as flat array
  const pathPoints = abovePath.flatMap(e => {
    const { x, y } = sunToStage(e.azimuth, e.elevation, center, pathRadius);
    return [x, y];
  });

  return (
    <Layer>
      {/* Reference marker at terrain centroid */}
      <Circle
        data-testid="solar-reference"
        x={center.x}
        y={center.y}
        radius={6}
        fill="#FFD700"
        stroke="#FF8C00"
        strokeWidth={2}
        opacity={0.9}
      />

      {/* Solar path arc */}
      {showSolarPath && pathPoints.length >= 4 && (
        <Line
          data-testid="solar-path"
          points={pathPoints}
          stroke="#FFA500"
          strokeWidth={2}
          tension={0.3}
          lineCap="round"
          lineJoin="round"
          opacity={0.8}
        />
      )}

      {/* Hour markers along the arc */}
      {showSolarPath && abovePath.map(e => {
        const { x, y } = sunToStage(e.azimuth, e.elevation, center, pathRadius);
        return (
          <Circle
            key={e.hour}
            data-testid="solar-hour-marker"
            x={x} y={y}
            radius={4}
            fill="#FFD700"
            opacity={0.85}
          />
        );
      })}

      {/* Current sun position */}
      {showCurrentSun && (
        <Circle
          data-testid="solar-current"
          x={currentStage.x}
          y={currentStage.y}
          radius={10}
          fill={currentPos.elevation >= 0 ? '#FFD700' : '#555'}
          stroke={currentPos.elevation >= 0 ? '#FF8C00' : '#333'}
          strokeWidth={2}
          opacity={currentPos.elevation >= 0 ? 1 : 0.5}
        />
      )}
    </Layer>
  );
};

export default SolarPathLayer;
