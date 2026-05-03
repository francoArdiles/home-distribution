import registry from '../data/detailSchemas/index.js';
import { DEFAULT_LAYERS } from '../data/detailSchemas/casa.js';

/**
 * Returns the DetailSchema for a given definitionId, or null if not registered.
 */
export const getDetailSchema = (definitionId) => {
  return registry[definitionId] ?? null;
};

/**
 * Creates a detail object with default values for a given definitionId.
 * Returns null if no schema is registered.
 */
export const createDefaultDetail = (definitionId) => {
  const schema = getDetailSchema(definitionId);
  if (!schema) return null;
  return {
    _schema: `${schema._schema}@${schema.version}`,
    ...schema.defaults,
  };
};

/**
 * Validates a detail object against a schema.
 * Returns an array of { field, message } error objects.
 */
export const validateDetail = (detail, schema) => {
  if (!detail || !schema) return [];
  const errors = [];

  for (const field of schema.fields) {
    const value = detail[field.key];
    if (value === undefined || value === null) continue;

    if (field.type === 'number') {
      if (field.min !== undefined && value < field.min) {
        errors.push({ field: field.key, message: `${field.label} debe ser al menos ${field.min}${field.unit ?? ''}` });
      }
      if (field.max !== undefined && value > field.max) {
        errors.push({ field: field.key, message: `${field.label} no puede superar ${field.max}${field.unit ?? ''}` });
      }
    }

    if (field.type === 'select') {
      if (field.options && !field.options.includes(value)) {
        errors.push({ field: field.key, message: `${field.label}: opción "${value}" no es válida` });
      }
    }
  }

  return errors;
};

/**
 * Migrates a detail object to the current schema version.
 * Each case fills in missing fields with safe defaults (never removes fields).
 * Returns a new object; the original is not mutated.
 */
export const migrateDetail = (detail) => {
  if (!detail || !detail._schema) return detail;
  const [schemaId, vStr] = detail._schema.split('@');
  const fromVersion = parseInt(vStr ?? '1', 10);
  const schema = registry[schemaId];
  if (!schema) return detail; // unknown schema, preserve as-is
  if (fromVersion >= schema.version) return detail; // already current

  let d = { ...detail };

  if (schemaId === 'casa') {
    if (fromVersion < 3) {
      d.doors           = d.doors           ?? [];
      d.windows         = d.windows         ?? [];
      d.rooms           = d.rooms           ?? [];
      d.guides          = d.guides          ?? [];
      d.networkElements = d.networkElements ?? [];
      d.networkSegments = d.networkSegments ?? [];
      d.layers          = d.layers          ?? { ...DEFAULT_LAYERS };
      d.backgroundImage = d.backgroundImage ?? null;
      d._schema = 'casa@3';
    }
  }

  return d;
};
