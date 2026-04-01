import React, { useState } from 'react';
import { getElementsByCategory } from '../data/elementDefinitions.js';
import { categories } from '../data/categories.js';

const ElementLibraryPanel = ({ onSelectElement, selectedElementType, customDefinitions = [] }) => {
  const [expandedCategory, setExpandedCategory] = useState(null);

  const handleCategoryClick = (categoryId) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  return (
    <div className="element-library-panel p-2 border-r border-gray-300 min-w-[155px] overflow-y-auto bg-gray-50">
      <h3 className="text-sm font-bold mb-2 text-gray-700 uppercase tracking-wide">Elementos</h3>
      {categories.map(cat => (
        <div key={cat.id} className="mb-2">
          <button
            onClick={() => handleCategoryClick(cat.id)}
            className="w-full flex items-center gap-1 py-1 bg-transparent border-none cursor-pointer font-semibold text-sm hover:opacity-80 transition-opacity"
            style={{ color: cat.color }}
          >
            <span
              className="inline-block transition-transform duration-200"
              style={{ transform: expandedCategory === cat.id ? 'rotate(90deg)' : 'rotate(0deg)' }}
            >
              ▶
            </span>
            {cat.icon} {cat.name}
          </button>
          <div
            className="overflow-hidden"
            style={{
              transition: 'max-height 0.3s ease-out, opacity 0.2s ease-out',
              maxHeight: expandedCategory === cat.id ? '500px' : '0px',
              opacity: expandedCategory === cat.id ? 1 : 0,
              visibility: expandedCategory === cat.id ? 'visible' : 'hidden',
            }}
          >
            {[
              ...getElementsByCategory(cat.id),
              ...customDefinitions.filter(d => d.category === cat.id),
            ].map(el => (
              <button
                key={el.id}
                draggable
                aria-pressed={selectedElementType === el.id ? 'true' : 'false'}
                className={selectedElementType === el.id ? 'active' : ''}
                onClick={() => onSelectElement(el.id)}
                onDragStart={(e) => {
                  e.dataTransfer.setData('elementType', el.id);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  marginBottom: '4px',
                  padding: '5px 8px',
                  backgroundColor: selectedElementType === el.id ? el.color : '#f9fafb',
                  border: `1px solid ${el.borderColor}`,
                  cursor: 'grab',
                  borderRadius: '3px',
                  fontSize: '12px',
                  textAlign: 'left',
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
