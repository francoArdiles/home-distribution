import registry from '../data/detailSchemas/index.js';

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
 * Placeholder for future schema migrations.
 * Returns the detail unchanged if fromVersion === toVersion.
 */
export const migrateDetail = (detail, _fromVersion, _toVersion) => {
  return { ...detail };
};
