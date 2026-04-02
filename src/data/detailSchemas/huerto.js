export default {
  _schema: 'huerto',
  version: 1,
  fields: [
    { key: 'cropType',    label: 'Tipo de cultivo', type: 'select', options: [
      'hortalizas', 'frutales', 'hierbas', 'flores', 'mixto',
    ]},
    { key: 'irrigation',  label: 'Riego',           type: 'select', options: [
      'manual', 'goteo', 'aspersión', 'ninguno',
    ]},
    { key: 'substrate',   label: 'Sustrato',        type: 'select', options: [
      'tierra natural', 'compost', 'tierra + compost', 'sustrato hidropónico',
    ]},
    { key: 'seasons',     label: 'Estaciones activas', type: 'list', itemSchema: [
      { key: 'season', label: 'Estación', type: 'select', options: ['primavera', 'verano', 'otoño', 'invierno'] },
    ]},
    { key: 'notes',       label: 'Notas',           type: 'text' },
  ],
  defaults: { cropType: 'hortalizas', irrigation: 'goteo', substrate: 'tierra + compost', seasons: [], notes: '' },
};
