import React from 'react';
import { getSectionView } from './sectionViewRegistry.js';

// ---------------------------------------------------------------------------
// Field renderers
// ---------------------------------------------------------------------------

function NumberField({ field, value, onChange }) {
  const step   = field.integer ? 1 : 0.1;
  const parse  = field.integer ? parseInt : parseFloat;
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        data-field={field.key}
        value={value ?? ''}
        min={field.min}
        max={field.max}
        step={step}
        onChange={(e) => onChange(field.key, parse(e.target.value, 10))}
        className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
      />
      {field.unit && <span className="text-xs text-gray-500">{field.unit}</span>}
    </div>
  );
}

function TextField({ field, value, onChange }) {
  return (
    <input
      type="text"
      data-field={field.key}
      value={value ?? ''}
      onChange={(e) => onChange(field.key, e.target.value)}
      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
    />
  );
}

function SelectField({ field, value, onChange }) {
  return (
    <select
      data-field={field.key}
      value={value ?? ''}
      onChange={(e) => onChange(field.key, e.target.value)}
      className="border border-gray-300 rounded px-2 py-1 text-sm"
    >
      {field.options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}

function BooleanField({ field, value, onChange }) {
  return (
    <input
      type="checkbox"
      data-field={field.key}
      checked={value ?? false}
      onChange={(e) => onChange(field.key, e.target.checked)}
      className="accent-blue-600"
    />
  );
}

function ListField({ field, value = [], onListChange }) {
  const items = value ?? [];

  const addItem = () => {
    const newItem = Object.fromEntries(field.itemSchema.map((f) => [f.key, f.type === 'number' ? 0 : '']));
    onListChange(field.key, [...items, newItem]);
  };

  const deleteItem = (idx) => {
    onListChange(field.key, items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx, subKey, subValue) => {
    const updated = items.map((item, i) => i === idx ? { ...item, [subKey]: subValue } : item);
    onListChange(field.key, updated);
  };

  return (
    <div>
      {items.map((item, idx) => (
        <div key={idx} data-testid={`list-item-${field.key}-${idx}`} className="flex items-center gap-2 mb-1 pl-2 border-l-2 border-gray-200">
          {field.itemSchema.map((subField) => (
            <div key={subField.key} className="flex items-center gap-1">
              <span className="text-xs text-gray-500">{subField.label}</span>
              <input
                type="number"
                data-field={`${field.key}.${idx}.${subField.key}`}
                value={item[subField.key] ?? ''}
                step={0.1}
                onChange={(e) => updateItem(idx, subField.key, parseFloat(e.target.value))}
                className="w-16 border border-gray-300 rounded px-1 py-0.5 text-xs"
              />
              {subField.unit && <span className="text-xs text-gray-400">{subField.unit}</span>}
            </div>
          ))}
          <button
            data-testid={`list-delete-${field.key}-${idx}`}
            onClick={() => deleteItem(idx)}
            className="text-red-400 hover:text-red-600 text-xs ml-1"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        data-testid={`list-add-${field.key}`}
        onClick={addItem}
        className="mt-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-300 rounded px-2 py-0.5"
      >
        + Agregar
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DetailPanel
// ---------------------------------------------------------------------------

/**
 * Props:
 *   element  — placed element object (has .detail and .label)
 *   schema   — DetailSchema from getDetailSchema(), or null
 *   onChange — (newDetail) => void
 *   onClose  — () => void
 */
export default function DetailPanel({ element, schema, onChange, onClose }) {
  const detail = element?.detail ?? {};

  const handleFieldChange = (key, value) => {
    onChange({ ...detail, [key]: value });
  };

  const handleListChange = (key, newList) => {
    onChange({ ...detail, [key]: newList });
  };

  const schemaName  = schema?._schema?.split('@')[0] ?? null;
  const SectionView = schemaName ? getSectionView(schemaName) : null;
  const twoColumn   = schema?.layout === 'two-column' && SectionView;

  const fieldsBlock = !schema ? (
    <p className="text-gray-500 text-xs">Sin detalle disponible para este elemento.</p>
  ) : (
    <div className="space-y-3">
      {schema.fields.map((field) => (
        <div key={field.key}>
          <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
          {field.type === 'number' && (
            <NumberField field={field} value={detail[field.key]} onChange={handleFieldChange} />
          )}
          {field.type === 'text' && (
            <TextField field={field} value={detail[field.key]} onChange={handleFieldChange} />
          )}
          {field.type === 'select' && (
            <SelectField field={field} value={detail[field.key]} onChange={handleFieldChange} />
          )}
          {field.type === 'boolean' && (
            <BooleanField field={field} value={detail[field.key]} onChange={handleFieldChange} />
          )}
          {field.type === 'list' && (
            <ListField field={field} value={detail[field.key]} onListChange={handleListChange} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className={`text-sm ${twoColumn ? 'min-w-[480px]' : 'p-3 min-w-[260px] max-w-xs'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span className="font-semibold text-gray-800">{element?.label ?? 'Elemento'}</span>
        <button
          data-testid="detail-panel-close"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 text-base leading-none"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>

      {twoColumn ? (
        <div data-testid="detail-layout-two-col" className="flex h-full">
          {/* Columna de campos — angosta */}
          <div data-testid="detail-fields-col" className="w-52 shrink-0 p-3 border-r border-gray-100 overflow-y-auto">
            {fieldsBlock}
          </div>
          {/* Columna de vistas — ocupa el espacio restante */}
          <div data-testid="detail-views-col" className="flex-1 p-3 overflow-auto min-w-0">
            <SectionView element={element} detail={detail} />
          </div>
        </div>
      ) : (
        <div className="p-3">
          {SectionView && <SectionView element={element} detail={detail} />}
          {fieldsBlock}
        </div>
      )}
    </div>
  );
}
