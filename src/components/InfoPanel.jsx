import React from 'react';

const InfoPanel = ({ points, finished, area, perimeter, baseScale }) => {
  return (
    <div style={{ padding: '8px', background: '#fff', border: '1px solid #ccc', minWidth: '200px' }}>
      <div><strong>Área:</strong> {area.toFixed(1)} m²</div>
      <div><strong>Perímetro:</strong> {perimeter.toFixed(1)} m</div>
      <div>{finished ? 'Polígono cerrado' : 'Polígono abierto'}</div>
      {points.length > 0 && (
        <div>
          <strong>Vértices:</strong>
          <ul style={{ margin: 0, paddingLeft: '16px' }}>
            {points.map((p, i) => (
              <li key={i}>
                ({(p.x / baseScale).toFixed(1)}, {(p.y / baseScale).toFixed(1)})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default InfoPanel;
