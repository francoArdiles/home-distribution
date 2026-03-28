# Fase 2: Elementos arrastrables básicos

## Objetivo
Implementar los elementos que el usuario puede colocar en el terreno: casa, piscina, huertos, gallineros, árboles frutales, etc. Estos elementos deben ser arrastrables, redimensionables y tener propiedades específicas.

## Detalles de implementación

### Requisitos funcionales
- Biblioteca de elementos predefinidos con formas estándar (rectángulo, círculo, polígono) y dimensiones típicas.
- Cada elemento tiene:
  - Nombre identificativo
  - Forma geométrica (rectángulo, círculo, polígono)
  - Dimensiones base (ancho, alto, radio)
  - Color de relleno y borde por defecto
  - Etiqueta opcional
  - Propiedades específicas (ej: necesidades de sol, agua, espacio mínimo)
- Capacidad para arrastrar y soltar elementos dentro del terreno.
- Redimensionamiento de elementos mediante handles (esquinas y/o lados).
- Rotación opcional de elementos (para alineación específica).
- Duplicar elementos (copiar/pegar o Ctrl+drag).
- Eliminar elementos (tecla Delete o botón en menú contextual).
- Los elementos deben quedar dentro del límite del terreno (colisión detectada).
- Mostrar guías de alineación cuando un elemento se acerque a otro o al borde del terreno.

### Tecnologías sugeridas
- Extender la librería de canvas usada en Fase 1 (Konva.js/Fabric.js tiene built-in support para objetos arrastrables y redimensionables).
- Definir cada elemento como un objeto con propiedades y métodos específicos.

### Componentes principales
1. **ElementLibraryPanel**: Panel lateral o desplegable que muestra todos los elementos disponibles.
2. **ElementItem**: Representación visual de cada elemento en la biblioteca (miniatura + nombre).
3. **PlacedElement**: Instancia de un elemento que ha sido colocado en el terreno.
4. **SelectionHandler**: Maneja qué elemento está actualmente seleccionado para edición.
5. **SnapGuidelines**: Líneas temporales que aparecen durante el arrastre para alineación.

### Tipos de elementos iniciales (MVP)
| Elemento | Forma | Dimensiones típicas | Propiedades especiales |
|----------|-------|---------------------|------------------------|
| Casa | Rectángulo | 8x10m, 10x12m | Necesita acceso, sombra parcial deseada |
| Piscina | Rectángulo/Círculo | 4x8m, 5m diámetro | Necesita nivelación, acceso eléctrico/agua |
| Huerto | Rectángulo | 2x4m por bancal | Necesita 6+ horas sol directo, buen drenaje |
| Gallinero | Rectángulo | 2x3m | Necesita sombra, protección depredadores |
| Árbol frutal | Círculo (copa) | 3-5m diámetro copa | Necesita espacio para raíces, sol pleno |
| Área de compost | Rectángulo | 1x1m | Necesita acceso, sombra parcial |
| Área de recreación | Libre | Variable | Espacio libre para actividades |
| Sendero | Línea/Polígono | Ancho 0.8-1.2m | Conecta elementos, material antideslizante |

### Estado de datos para elementos
```javascript
elementDefinition = {
  id: string, // tipo de elemento (ej: "casa", "piscina")
  name: string, // nombre legible
  shape: "rectangle" | "circle" | "polygon",
  defaultWidth: number, // en metros
  defaultHeight: number, // en metros (ignorado para círculo)
  defaultRadius: number, // para círculo
  color: string, // color de relleno por defecto
  borderColor: string,
  borderWidth: number,
  properties: {
    sunNeeds: "full" | "partial" | "shade", // necesidades de sol
    waterNeeds: "low" | "medium" | "high",
    minSpacing: number, // distancia mínima a otros elementos
    height: number, // altura del elemento (para visualización 3D opcional)
    // ... otras propiedades específicas
  }
}

placedElement = {
  id: string, // UUID único de esta instancia
  definitionId: string, // referencia a elementDefinition
  position: {x: number, y: number}, // posición en el lienzo (centro o esquina según forma)
  width: number, // ancho actual en metros
  height: number, // alto actual en metros (ignorado para círculo)
  radius: number, // radio actual para círculo
  rotation: number, // en grados (0 = sin rotación)
  properties: { ... }, // propiedades sobrescritas por el usuario
  label: string, // nombre personalizado dado por el usuario
  isSelected: boolean
}
```

### Algoritmos y cálculos
- **Detección de colisión**: Verificar si un elemento está completamente dentro del terreno y no se superpone con otros elementos.
  - Para rectángulos: algoritmo de separación de ejes (SAT) o simplemente verificar límites.
  - Para círculos: distancia entre centros < suma de radios.
  - Para polígonos: más complejo, podría usar bibliotecas de geometría o aproximar con bounding box inicialmente.
- **Snapping**: Durante el arrastre, si el elemento está cerca (ej: <15px) de otro elemento o borde, alinear su posición.
- **Redimensionamiento**: Actualizar ancho/alto/radio basado en la posición del handle siendo arrastrado.
- **Rotación**: Aplicar matriz de transformación al renderizar el elemento.

### Eventos de usuario
- **En biblioteca**:
  - `click` en ElementItem: seleccionar ese tipo de elemento para colocar.
  - `click` en lienzo (con elemento seleccionado): crear nueva instancia del elemento en esa posición.
- **En elemento colocado**:
  - `click`: seleccionar elemento para edición.
  - `drag` (cuando está seleccionado): mover elemento.
  - `drag` en handle de redimensionamiento: cambiar tamaño.
  - `drag` en handle de rotación: cambiar ángulo.
  - `keydown Delete`: eliminar elemento seleccionado.
  - `dblclick`: editar etiqueta o propiedades.
- **Controles globales**:
  - `Ctrl+C/V`: copiar/pegar elemento seleccionado.
  - `Ctrl+Z/Y`: deshacer/rehacer (opcional para MVP).

### Consideraciones de usabilidad
- Feedback visual claro al seleccionar un elemento (bordes resaltados, handles visibles).
- Cursor cambia según el área sobre el elemento (mover, redimensionar, rotar).
- Mostrar dimensiones actuales mientras se redimensiona.
- Prevenir colocar elementos fuera del terreno (rebote o corrección automática).
- Opción para alinear elementos a una cuadrícula de diseño.
- Menú contextual (click derecho) con opciones: duplicar, eliminar, propiedades, enviar al frente/atrás.

### Pruebas unitarias sugeridas
- Crear instancia de cada tipo de elemento desde su definición.
- Verificar que las dimensiones por defecto se aplican correctamente.
- Probar funciones de colisión: dentro/fuera del terreno, solapamiento con otros elementos.
- Simular eventos de arrastre y verificar actualización de posición.
- Probar snapping a bordes y otros elementos.
- Verificar que la rotación no afecta las dimensiones lógicas (solo la representación visual).

### Extensiones futuras (post-MVP)
- Elementos personalizables: permitir al usuario crear sus propios tipos de elementos.
- Elementos complejos: invernaderos, terrazas, decks con formas específicas.
- Elementos con dependencias: ej: bomba de agua necesita estar cerca de piscina y fuente de energía.
- Visualización 3D básica o vista en elevación.
- Simulación de sombras proyectadas por elementos a diferentes horas del día.