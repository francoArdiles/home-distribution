/**
 * Project serialization / deserialization.
 *
 * Format version history:
 *   1 — initial: terrain points, elements, solar config, measurement config
 *   2 — added: entrance, terrainMeta (future area label, etc.)
 *
 * Backwards compatibility rules:
 *   - Unknown top-level keys are preserved as-is on import (round-trip safe).
 *   - Missing keys are filled with safe defaults so old files open without errors.
 *   - The `version` field is always written; readers only reject files with
 *     CURRENT_MAJOR > file's major version (breaking change).
 */

export const CURRENT_VERSION = '2.0.0';
const CURRENT_MAJOR = 2;

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/**
 * Serializes the full project state to a JSON string.
 *
 * @param {{
 *   points: Array<{x,y}>,
 *   finished: boolean,
 *   entrance: {edgeIndex,position,width}|null,
 *   placedElements: Array,
 *   solarConfig: object,
 *   measurementConfig: object,
 * }} state
 * @returns {string} Formatted JSON
 */
export const exportProject = (state) => {
  const {
    points = [],
    finished = false,
    entrance = null,
    placedElements = [],
    solarConfig = null,
    measurementConfig = null,
    customDefinitions = [],
    paths = [],
  } = state;

  const doc = {
    version: CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    terrain: {
      points,
      finished,
      entrance,
    },
    elements: placedElements,
    paths,
    solar: solarConfig,
    measurements: measurementConfig,
    customDefinitions,
  };

  return JSON.stringify(doc, null, 2);
};

/**
 * Triggers a browser download of the project as a .hdist.json file.
 */
export const downloadProject = (state, filename = 'proyecto.hdist.json') => {
  const json = exportProject(state);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export class ProjectImportError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProjectImportError';
  }
}

/**
 * Parses and validates a JSON string produced by exportProject.
 * Returns a normalized state object with safe defaults for any missing field.
 *
 * @param {string} jsonString
 * @returns {{
 *   version: string,
 *   terrain: { points, finished, entrance },
 *   elements: Array,
 *   solar: object|null,
 *   measurements: object|null,
 * }}
 * @throws {ProjectImportError} on parse failure or incompatible major version
 */
export const importProject = (jsonString) => {
  let doc;
  try {
    doc = JSON.parse(jsonString);
  } catch {
    throw new ProjectImportError('El archivo no es un JSON válido.');
  }

  if (!doc || typeof doc !== 'object') {
    throw new ProjectImportError('Formato de archivo no reconocido.');
  }

  // Version check — only reject if major version is higher than we support
  const fileVersion = doc.version || '1.0.0';
  const fileMajor = parseInt(fileVersion.split('.')[0], 10);
  if (fileMajor > CURRENT_MAJOR) {
    throw new ProjectImportError(
      `El archivo fue creado con una versión más reciente (${fileVersion}). Actualiza la aplicación para abrirlo.`
    );
  }

  // Normalize terrain section (v1 had flat points array at top level)
  let terrain;
  if (doc.terrain && typeof doc.terrain === 'object') {
    terrain = doc.terrain;
  } else {
    // v1 fallback: reconstruct from flat fields
    terrain = {
      points: doc.points ?? [],
      finished: doc.finished ?? false,
      entrance: null,
    };
  }

  return {
    version: fileVersion,
    terrain: {
      points: Array.isArray(terrain.points) ? terrain.points : [],
      finished: terrain.finished ?? false,
      entrance: terrain.entrance ?? null,
    },
    elements: Array.isArray(doc.elements) ? doc.elements : [],
    paths: Array.isArray(doc.paths) ? doc.paths : [],
    solar: doc.solar ?? null,
    measurements: doc.measurements ?? null,
    customDefinitions: Array.isArray(doc.customDefinitions) ? doc.customDefinitions : [],
    // Preserve any unknown top-level keys for forward compatibility
    _extra: Object.fromEntries(
      Object.entries(doc).filter(([k]) =>
        !['version', 'exportedAt', 'terrain', 'elements', 'paths', 'solar', 'measurements', 'customDefinitions'].includes(k)
      )
    ),
  };
};

/**
 * Opens a file picker and resolves with the parsed project, or rejects with
 * ProjectImportError / native error.
 *
 * @returns {Promise<ReturnType<importProject>>}
 */
export const openProjectFile = () =>
  new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.hdist.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return reject(new ProjectImportError('No se seleccionó ningún archivo.'));
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          resolve(importProject(e.target.result));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new ProjectImportError('Error al leer el archivo.'));
      reader.readAsText(file);
    };
    input.click();
  });
