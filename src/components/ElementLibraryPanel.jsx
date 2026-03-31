import React, { useState } from 'react';
import { getElementsByCategory } from '../data/elementDefinitions.js';
import { categories } from '../data/categories.js';

const ElementLibraryPanel = ({ onSelectElement, selectedElementType, customDefinitions = [] }) => {
  const [expandedCategory, setExpandedCategory] = useState(null);

  const handleCategoryClick = (categoryId) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  return (
    <div className="element-library-panel" style={{ padding: '8px', borderRight: '1px solid #ccc', minWidth: '150px' }}>
      <h3>Elementos</h3>
      {categories.map(cat => (
        <div key={cat.id} style={{ marginBottom: '12px' }}>
          <button
            onClick={() => handleCategoryClick(cat.id)}
            style={{
              fontWeight: 'bold',
              marginBottom: '4px',
              color: cat.color,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 0',
            }}
          >
            <span style={{
              display: 'inline-block',
              transition: 'transform 0.2s ease-out',
              transform: expandedCategory === cat.id ? 'rotate(90deg)' : 'rotate(0deg)',
            }}>
              ▶
            </span>
            {cat.icon} {cat.name}
          </button>
          <div style={{
            overflow: 'hidden',
            transition: 'max-height 0.3s ease-out, opacity 0.2s ease-out',
            maxHeight: expandedCategory === cat.id ? '500px' : '0px',
            opacity: expandedCategory === cat.id ? 1 : 0,
            visibility: expandedCategory === cat.id ? 'visible' : 'hidden',
          }}>
            {[
              ...getElementsByCategory(cat.id),
              ...customDefinitions.filter(d => d.category === cat.id),
            ].map(el => (
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
                {el.name}{el.isCustom ? ' ✦' : ''}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ElementLibraryPanel;
