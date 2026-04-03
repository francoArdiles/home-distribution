export default {
  _schema: 'casa',
  version: 1,
  layout: 'two-column',
  fields: [
    { key: 'floors',       label: 'Pisos',          type: 'number', unit: '', min: 1,  max: 5,  integer: true },
    { key: 'bedrooms',     label: 'Dormitorios',    type: 'number', unit: '', min: 0,  max: 20, integer: true },
    { key: 'bathrooms',    label: 'Baños',           type: 'number', unit: '', min: 0,  max: 20, integer: true },
    { key: 'roofType',     label: 'Tipo de techo',  type: 'select', options: [
      'plano', 'a dos aguas', 'a cuatro aguas', 'shed',
    ]},
    { key: 'construction', label: 'Construcción',   type: 'select', options: [
      'hormigón', 'madera', 'adobe', 'steel frame', 'mixto',
    ]},
    { key: 'notes',        label: 'Notas',          type: 'text' },
  ],
  defaults: { floors: 1, bedrooms: 3, bathrooms: 1, roofType: 'a dos aguas', construction: 'hormigón', notes: '' },
};
