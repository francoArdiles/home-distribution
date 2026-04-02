export default {
  _schema: 'piscina',
  version: 1,
  fields: [
    { key: 'depth',   label: 'Profundidad',   type: 'number', unit: 'm', min: 0.5, max: 5 },
    { key: 'steps',   label: 'Escalones',     type: 'list',   itemSchema: [
      { key: 'width', label: 'Ancho', type: 'number', unit: 'm', min: 0.3, max: 3 },
      { key: 'depth', label: 'Alto',  type: 'number', unit: 'm', min: 0.1, max: 1 },
    ]},
    { key: 'lining',  label: 'Revestimiento', type: 'select', options: [
      'hormigón', 'fibra de vidrio', 'liner', 'azulejo',
    ]},
    { key: 'heated',  label: 'Con calefacción', type: 'boolean' },
  ],
  defaults: { depth: 1.5, steps: [], lining: 'hormigón', heated: false },
};
