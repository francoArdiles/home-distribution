import React from 'react';
import { Layer, Text } from 'react-konva';

const CardinalLayer = ({ width, height, northAtTop = true }) => {
  const cx = width / 2;
  const cy = height / 2;

  const nY = northAtTop ? 10  : height - 20;
  const sY = northAtTop ? height - 20 : 10;

  const cardinals = [
    { text: 'N', x: cx, y: nY,          fill: '#CC0000', fontSize: 16, fontStyle: 'bold' },
    { text: 'S', x: cx, y: sY,          fill: '#555',    fontSize: 14 },
    { text: 'E', x: width - 20, y: cy,  fill: '#555',    fontSize: 14 },
    { text: 'O', x: 10,         y: cy,  fill: '#555',    fontSize: 14 },
  ];

  return (
    <Layer>
      {cardinals.map(({ text, ...props }) => (
        <Text
          key={text}
          text={text}
          data-testid="cardinal-label"
          align="center"
          {...props}
        />
      ))}
    </Layer>
  );
};

export default CardinalLayer;
