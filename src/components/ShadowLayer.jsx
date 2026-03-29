import React from 'react';
import { Layer, Line } from 'react-konva';
import { getSolarPosition } from '../utils/solarUtils.js';
import { getShadowPolygon } from '../utils/shadowUtils.js';

const ShadowLayer = ({ elements = [], solarConfig, scale, position, baseScale }) => {
  const { location, dateTime, displayOptions } = solarConfig;

  if (!displayOptions.showShadows) return <Layer />;

  const currentDate = new Date(
    Date.UTC(dateTime.year, dateTime.month, dateTime.day, dateTime.hour, dateTime.minute)
  );
  const { azimuth, elevation } = getSolarPosition(currentDate, location.latitude, location.longitude);

  // No shadows at night
  if (elevation <= 0) return <Layer />;

  const bs = baseScale * scale;

  return (
    <Layer>
      {elements.map(el => {
        const polygon = getShadowPolygon(el, elevation, azimuth);
        if (!polygon || polygon.length < 3) return null;

        // Convert meters → stage pixels
        const points = polygon.flatMap(p => [
          p.x * bs + position.x,
          p.y * bs + position.y,
        ]);

        return (
          <Line
            key={el.id}
            data-testid="shadow-polygon"
            points={points}
            closed
            fill="rgba(0,0,0,0.3)"
            opacity={0.4}
            listening={false}
          />
        );
      })}
    </Layer>
  );
};

export default ShadowLayer;
