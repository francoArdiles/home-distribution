import React from 'react';
import { Layer, Circle, Line } from 'react-konva';
import { getSolarPosition, getSolarPathForDay, azimuthToVector } from '../utils/solarUtils.js';

/**
 * Maps a solar position (azimuth, elevation) to canvas (x, y) coordinates.
 * The sun arc is drawn as a hemisphere around the canvas center.
 * Higher elevation → closer to center; lower elevation → closer to edge.
 */
const sunToCanvas = (azimuth, elevation, cx, cy, radius) => {
  const azRad = (azimuth * Math.PI) / 180;
  // Normalize: elevation 0° = edge of circle, 90° = center
  const dist = radius * (1 - elevation / 90);
  return {
    x: cx + Math.sin(azRad) * dist,
    y: cy - Math.cos(azRad) * dist,
  };
};

const SolarPathLayer = ({ solarConfig, width, height, scale, position, baseScale }) => {
  const { location, dateTime, displayOptions } = solarConfig;
  const { showSolarPath, showCurrentSun } = displayOptions;

  const cx = width / 2;
  const cy = height / 2;
  const pathRadius = Math.min(width, height) * 0.4;

  // Build solar path for the day
  const dayDate = new Date(Date.UTC(dateTime.year, dateTime.month, dateTime.day, 12));
  const hourlyPath = getSolarPathForDay(dayDate, location.latitude, location.longitude, 1);
  const abovePath = hourlyPath.filter(e => e.aboveHorizon);

  // Current sun position
  const currentDate = new Date(
    Date.UTC(dateTime.year, dateTime.month, dateTime.day, dateTime.hour, dateTime.minute)
  );
  const currentPos = getSolarPosition(currentDate, location.latitude, location.longitude);

  // Build flat points array for the path Line
  const pathPoints = abovePath.flatMap(e => {
    const { x, y } = sunToCanvas(e.azimuth, e.elevation, cx, cy, pathRadius);
    return [x, y];
  });

  return (
    <Layer>
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
      {showSolarPath && abovePath.map(e => {
        const { x, y } = sunToCanvas(e.azimuth, e.elevation, cx, cy, pathRadius);
        return (
          <Circle
            key={e.hour}
            data-testid="solar-hour-marker"
            x={x} y={y}
            radius={4}
            fill="#FFD700"
            opacity={0.9}
          />
        );
      })}
      {showCurrentSun && currentPos.elevation >= 0 && (
        <Circle
          data-testid="solar-current"
          x={sunToCanvas(currentPos.azimuth, currentPos.elevation, cx, cy, pathRadius).x}
          y={sunToCanvas(currentPos.azimuth, currentPos.elevation, cx, cy, pathRadius).y}
          radius={10}
          fill="#FFD700"
          stroke="#FF8C00"
          strokeWidth={2}
          opacity={1}
        />
      )}
      {showCurrentSun && currentPos.elevation < 0 && (
        // Still render marker but below horizon indicator (at edge)
        <Circle
          data-testid="solar-current"
          x={cx} y={cy + pathRadius}
          radius={8}
          fill="#555"
          opacity={0.5}
        />
      )}
    </Layer>
  );
};

export default SolarPathLayer;
