export const NETWORK_COLORS = {
  electrical: '#F59E0B',
  water:      '#3B82F6',
  drainage:   '#16A34A',
  combined:   '#8B5CF6',
};

// Short 2-3 char code shown inside the SVG icon
export const NET_ICON_CODES = {
  'main-panel':          'TP',
  'junction-box':        'CJ',
  'outlet':              'E',
  'outlet-special':      'E*',
  'switch':              'Int',
  'light-point':         'Luz',
  'water-entry':         'EA',
  'water-tap':           'Ll',
  'boiler':              'Cal',
  'shower-head':         'Du',
  'sink':                'Lav',
  'washing-machine':     'Lav',
  'wc':                  'WC',
  'drain-exit':          'SD',
  'wc-drain':            'DWC',
  'shower-drain':        'DSi',
  'sink-drain':          'DLa',
  'floor-drain':         'Sum',
  'washing-drain':       'DLv',
  'cleanout':            'TI',
  'inspection-chamber':  'CD',
};

export const NETWORK_ELEMENT_TYPES = [
  // Electrical
  { type: 'main-panel',         label: 'Tablero principal',      network: 'electrical', defaultProps: { amperes: 63 } },
  { type: 'junction-box',       label: 'Caja de conexion',       network: 'electrical', defaultProps: { maxOutputs: 3 } },
  { type: 'outlet',             label: 'Enchufe',                network: 'electrical', defaultProps: { amperes: 15 } },
  { type: 'outlet-special',     label: 'Enchufe especial',       network: 'electrical', defaultProps: { amperes: 20, label: '' } },
  { type: 'switch',             label: 'Interruptor',            network: 'electrical', defaultProps: { poles: 1 } },
  { type: 'light-point',        label: 'Punto de luz',           network: 'electrical', defaultProps: { type: 'ceiling' } },
  // Water
  { type: 'water-entry',        label: 'Entrada de agua',        network: 'water',      defaultProps: { pressure: null } },
  { type: 'water-tap',          label: 'Llave de agua',          network: 'water',      defaultProps: { tempType: 'cold' } },
  { type: 'boiler',             label: 'Calefon / caldera',      network: 'water',      defaultProps: {} },
  // Combined (water + drainage)
  { type: 'shower-head',        label: 'Ducha',                  network: 'combined',   defaultProps: { tempType: 'both' } },
  { type: 'sink',               label: 'Lavamanos / lavaplatos', network: 'combined',   defaultProps: { tempType: 'both' } },
  { type: 'washing-machine',    label: 'Lavadora',               network: 'combined',   defaultProps: {} },
  { type: 'wc',                 label: 'WC',                     network: 'combined',   defaultProps: {} },
  // Drainage
  { type: 'drain-exit',         label: 'Salida de desague',      network: 'drainage',   defaultProps: {} },
  { type: 'wc-drain',           label: 'Desague WC',             network: 'drainage',   defaultProps: { diameter: 100 } },
  { type: 'shower-drain',       label: 'Sifon de ducha',         network: 'drainage',   defaultProps: { diameter: 50 } },
  { type: 'sink-drain',         label: 'Sifon de lavamanos',     network: 'drainage',   defaultProps: { diameter: 50 } },
  { type: 'floor-drain',        label: 'Sumidero',               network: 'drainage',   defaultProps: { diameter: 50 } },
  { type: 'washing-drain',      label: 'Desague lavadora',       network: 'drainage',   defaultProps: { diameter: 50 } },
  { type: 'cleanout',           label: 'Tapon de inspeccion',    network: 'drainage',   defaultProps: {} },
  { type: 'inspection-chamber', label: 'Camara domiciliaria',    network: 'drainage',   defaultProps: {} },
];

export const getNetworkElementDef = (type) =>
  NETWORK_ELEMENT_TYPES.find(d => d.type === type) ?? null;

export const NETWORK_GROUPS = [
  { key: 'electrical', label: 'Electricidad', types: NETWORK_ELEMENT_TYPES.filter(t => t.network === 'electrical') },
  { key: 'water',      label: 'Agua',         types: NETWORK_ELEMENT_TYPES.filter(t => t.network === 'water') },
  { key: 'combined',   label: 'Agua+Desague', types: NETWORK_ELEMENT_TYPES.filter(t => t.network === 'combined') },
  { key: 'drainage',   label: 'Desague',      types: NETWORK_ELEMENT_TYPES.filter(t => t.network === 'drainage') },
];
