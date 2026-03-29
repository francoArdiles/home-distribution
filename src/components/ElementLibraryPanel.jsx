import React from 'react';
import { elementDefinitions } from '../data/elementDefinitions.js';

const ElementLibraryPanel = ({ onSelectElement, selectedElementType }) => {
  return (
    <div className="element-library-panel" style={{ padding: '8px', borderRight: '1px solid #ccc' }}>
      <h3>Elementos</h3>
      {elementDefinitions.map(el => (
        <button
          key={el.id}
          aria-pressed={selectedElementType === el.id ? 'true' : 'false'}
          className={selectedElementType === el.id ? 'active' : ''}
          onClick={() => onSelectElement(el.id)}
          style={{
            display: 'block',
            width: '100%',
            marginBottom: '4px',
            padding: '6px',
            backgroundColor: selectedElementType === el.id ? el.color : '#f5f5f5',
            border: `1px solid ${el.borderColor}`,
            cursor: 'pointer',
          }}
        >
          {el.name}
        </button>
      ))}
    </div>
  );
};

export default ElementLibraryPanel;
