# Fase 4: Medidas y relaciones espaciales

## Objetivo
Implementar herramientas de medición y análisis de relaciones espaciales entre elementos, permitiendo al usuario verificar distancias, áreas y cumplimiento de requisitos de separación para asegurar un diseño funcional y conforme a normas.

## Detalles de implementación

### Requisitos funcionales
- Medir distancia entre cualquier par de elementos (borde a borde, centro a centro, o punto específico).
- Medir distancia desde un elemento hasta el límite del terreno.
- Calcular área de zonas personalizadas definidas por el usuario (ej: área de cultivo efectiva).
- Mostrar medidas en tiempo real al mover o redimensionar elementos.
- Herramienta de regla manual para medir distancias arbitrarias en el terreno.
- Indicadores visuales cuando se viola una distancia mínima requerida (ej: entre casa y límite de propiedad).
- Capacidad para definir y guardar reglas de distancia personalizadas (ej: "mínimo 3m entre gallinero y casa").
- Visualización de áreas de influencia o zonas de servicio alrededor de elementos (ej: radio de acción de una manguera).
- Medición de ángulos entre elementos o líneas de referencia.
- Deteción de accesos y caminos mínimos entre elementos (ancho de pasillo suficiente).
- Superposición de cuadrícula de medida para alineación precisa.

### Tecnologías sugeridas
- Extender el canvas existente con capas de medición y herramientas de análisis.
- Utilizar algoritmos de geometría computacional para cálculos de distancia entre formas.
- State management para almacenar reglas de distancia, mediciones activas y capas de visualización.

### Componentes principales
1. **MeasurementToolkit**: Panel con herramientas de medición (regla, cinta, transportador, área).
2. **DistanceCalculator**: Servicio que computa distancias entre diferentes tipos de elementos y formas.
3. **ConstraintValidator**: Verifica si el diseño cumple con reglas de distancia y separación definidas.
4. **MeasurementOverlay**: Capa de dibujo que muestra líneas de medida, etiquetas y indicadores de validación.
5. **ZoneDefiner**: Permite al usuario definir zonas personalizadas para cálculo de área o aplicación de reglas específicas.
6. **GridOverlay**: Capa de cuadrícula ajustable para referencia de medida y alineación.

### Tipos de mediciones
| Tipo de medida | Descripción | Unidades | Visualización |
|----------------|-------------|----------|---------------|
| Distancia elemento-elemento | Borde más cercano entre dos elementos | m/cm | Línea punteada con etiqueta |
| Distancia elemento-terreno | Distancia desde elemento hasta límite más cercano del terreno | m/cm | Línea desde elemento hasta borde |
| Distancia centro-centro | Entre centros de masa de dos elementos | m/cm | Línea entre puntos centrales |
| Distancia punto-punto | Entre dos puntos arbitrarios definidos por usuario | m/cm | Línea recta con puntos finales |
| Área poligonal | Área de una zona definida por vértices | m² | Región sombreada con etiqueta de área |
| Área elemental | Área ocupada por un elemento específico | m² | Etiqueta dentro del elemento |
| Ángulo entre líneas | Ángulo formado por tres puntos o dos líneas | grados | Arco con etiqueta de ángulo |
| Ancho de paso | Espacio libre entre dos elementos o entre elemento y borde | m/cm | Región resaltada si es insuficiente |

### Estructuras de datos
```javascript
measurementConfig = {
  activeTool: "none" | "distance" | "area" | "angle" | "radius",
  showMeasurements: boolean,
  showConstraints: boolean,
  gridVisible: boolean,
  gridSize: number, // en metros
  snapToGrid: boolean,
  constraints: [  // reglas de distancia definidas por usuario o por defecto
    {
      id: string,
      name: string, // ej: "Separación mínima casa-límite"
      type: "min-distance" | "max-distance" | "exact-distance",
      source: { elementId: string, side: "any" | "specific" }, // o "terrain"
      target: { elementId: string, side: "any" | "specific" }, // o "terrain"
      value: number, // en metros
      tolerance: number, // margen de error permitido
      enabled: boolean
    }
  ],
  activeMeasurements: [  // mediciones actualmente dibujadas
    {
      id: string,
      type: "distance" | "area" | "angle",
      start: {x: number, y: number},
      end: {x: number, y: number},
      points: [ {x: number, y: number} ], // para polígonos o múltiples puntos
      value: number, // resultado calculado
      unit: "m" | "cm" | "degrees",
      valid: boolean // si cumple con restricciones aplicables
    }
  ]
}

terrainConstraints = [  // reglas inherentes al terreno o normas locales
  {
    type: "setback", //退让距离
    from: "terrain-boundary",
    value: number, // distancia mínima desde límite
    zones: [ "front", "back", "left", "right" ] // qué lados aplican
  },
  {
    type: "height-limit",
    value: number, // altura máxima
    area: "whole-terrain" | "zone-id"
  }
]
```

### Algoritmos y cálculos
- **Distancia entre dos puntos**: Fórmula de distancia euclidiana estándar.
- **Distancia punto a segmento de línea**: Proyección ortogonal y verificación de si el punto cae dentro del segmento.
- **Distancia entre dos rectángulos**: 
  - Si se solapan: distancia = 0
  - Si no: mínima distancia entre cualquiera de los 4 vértices de un rectángulo y los lados del otro (o viceversa)
  - Algoritmo eficiente: calcular distancia en eje X y eje Y por separado, luego combinar.
- **Distancia punto a polígono**: Distancia mínima al cualquier segmento del polígono.
- **Distancia entre dos círculos**: |distancia entre centros - (radio1 + radio2)| (positivo si se solapan, negativo si están separados).
- **Distancia entre rectángulo y círculo**: Más complejo; aproximar verificando distancia del centro del círculo al rectángulo, luego ajustar por radios.
- **Cálculo de área poligonal**: Fórmula del shoelace (mismo que para el terreno).
- **Cálculo de área de intersección**: Para zonas de overlap (opcional, podría usar aproximación por muestreo o bibliotecas de geometría).
- **Validación de restricciones**: Para cada regla activa, calcular la distancia relevante y comparar con el valor umbral.
- **Snapping a cuadrícula**: Redondear coordenadas al múltiplo más cercano del tamaño de cuadrícula.
- **Cálculo de ancho de paso**: Encontrar el segmento más corto de espacio libre entre dos obstáculos (elementos o terreno) - problema de camino más corto en espacio libre.

### Eventos de usuario
- **En MeasurementToolkit**:
  - `click` en herramienta de regla: activar modo de medición de distancia punto-a-punto.
  - `click` en herramienta de área: activar modo de definición de polígono para cálculo de área.
  - `click` en herramienta de ángulo: activar modo de medición de ángulo (tres puntos).
  - `click` en herramienta de radio: activar modo de medición de distancia desde punto central.
  - `click` en botón "Limpiar mediciones": borrar todas las mediciones activas.
  - `click` en botón "Aplicar restricciones predeterminadas": cargar reglas de distancia comunes.
- **Durante medición activa**:
  - `click` en lienzo: agregar punto de medición (primer punto, segundo punto, etc. según herramienta).
  - `dblclick`: finalizar medición (para polígonos de área) o calcular resultado inmediato.
  - `escape`: cancelar medición actual.
  - `movement del mouse`: actualizar vista previa de la medida mientras se dibuja.
- **En ConstraintValidator/UI**:
  - `click` en indicador de violación: mostrar detalles de qué regla se viola y sugerir correcciones.
  - `dblclick` en restricción listada: editar sus parámetros.
  - `click` en checkbox junto a restricción: habilitar/deshabilitar temporalmente.
- **Controles globales**:
  - Tecla `M`: alternar herramienta de medida.
  - Tecla `G`: mostrar/ocultar cuadrícula.
  - Tecla `S`: activar/desactivar snapping a cuadrícula.
  - Rueda del mouse: zoom en lienzo (si se implementa).
  - Arrastre con botón medio o espacio: pan del lienzo.

### Consideraciones de usabilidad
- Feedback visual inmediato durante la creación de mediciones (línea que sigue al cursor).
- Unidades configurables (metros, centímetros, pies, pulgadas) con conversión automática.
- Precisión ajustable en la visualización (ej: mostrar 2 decimales).
- Colores semánticos: verde para medidas válidas, rojo para violaciones de restricción, azul para medidas informativas.
- Evitar saturación visual: option para mostrar solo medidas activas o todas las mediciones guardadas.
- Mediciones "fantasma": líneas tenues que muestran distancia constante mientras se arrastra un elemento (ej: distancia desde elemento seleccionado hasta límite más cercano).
- Tooltips detallados al pasar el cursor sobre una medida: mostrando fórmula utilizada, puntos exactos, etc.
- Modo de medición continua: dejar herramienta activa para múltiples mediciones seguidas.
- Guardado de mediciones frecuentes como plantillas (ej: "distancia ideal para fila de árboles").
- Integración con elementos: al seleccionar un elemento, mostrar automáticamente sus distancias críticas (a casa, límite, etc.).
- Advertencia si se intenta medir fuera del terreno o en áreas no definidas.

### Pruebas unitarias sugeridas
- Probar funciones de distancia entre todas las combinaciones de formas (punto-punto, punto-linea, punto-rectángulo, punto-círculo, rectángulo-rectángulo, rectángulo-círculo, círculo-círculo).
- Verificar que la distancia entre formas que se solapan es cero o negativa (según convención).
- Probar cálculo de área de polígonos conocidos (triángulo rectángulo, cuadrado, polígono irregular).
- Validar que las restricciones de distancia se evalúan correctamente:
  - Distancia exactamente igual al límite: válida
  - Distancia ligeramente por debajo: inválida
  - Distancia ligeramente por encima: válida
- Probar snapping a cuadrícula: coordenadas se redondean correctamente.
- Simular edición de restricciones y verificar que se aplican/desaplican correctamente.
- Probar que las mediciones se mantienen correctas al hacer zoom/pan del lienzo (si se implementa).
- Verificar que las mediciones de área son invariantes bajo traslación (mover todo el diseño no cambia áreas).

### Integración con fases anteriores
- **Con Fase 1 (Terreno)**: Las distancias al terreno usan el polígono de límite definido en esta fase.
- **Con Fase 2 (Elementos)**: Cada tipo de elemento puede tener restricciones predeterminadas asociadas (ej: árboles frutales necesitan mínimo 2m de separación).
- **Con Fase 3 (Solar)**: Las mediciones pueden combinarse con análisis solar (ej: "verificar que el huerto recibe mínimo 6h sol directo Y está a más de 1m de cualquier camino").

### Extensiones futuras (post-MVP)
- **Análisis de accesibilidad**: verificar que hay un camino de ancho mínimo entre todos los elementos esenciales y la entrada de la casa.
- **Simulación de flujo de trabajo**: modelar rutas típicas (ej: de casa a huerto a gallinero a compost) y optimizar para distancia mínima.
- **Deteción de conflictos**: identificar situaciones donde cumplir una restricción hace imposible otra (ej: requerir tanto distancia mínima a límite como orientación solar específica).
- **Optimización automática**: usar algoritmos de búsqueda para sugerir posiciones de elementos que maximicen cumplimiento de restricciones.
- **Integración con normas locales**: cargar reglas de distancia basado en código de construcción municipal o regulaciones de zonificación.
- **Medición de volumen**: para elementos 3D como terrazas elevadas o pozos.
- **Análisis de corte y relleno**: calcular volumen de tierra que necesita moverse para nivelar áreas.
- **Integración con herramientas de diseño profesional**: exportar mediciones y restricciones a formato compatible con software de paisajismo o arquitectura.