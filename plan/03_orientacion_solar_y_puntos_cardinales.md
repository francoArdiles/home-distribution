# Fase 3: Orientación solar y puntos cardinales

## Objetivo
Implementar la visualización de la trayectoria solar y los puntos cardinales en el lienzo, permitiendo al usuario entender cómo la luz solar afecta diferentes áreas del terreno durante el día y según la estación.

## Detalles de implementación

### Requisitos funcionales
- Permitir al usuario especificar la ubicación geográfica (latitud, longitud) del terreno.
  - Opción para detección automática mediante API de geolocalización (con permiso del usuario).
  - Opción para entrada manual de coordenadas.
  - Base de datos de ciudades predefinidas para selección rápida.
- Permitir especificar la fecha y hora para el cálculo de la posición solar.
  - Selector de fecha (día del año).
  - Selector de hora (0-23 horas).
  - Opciones predefinidas: solsticio de invierno, equinoccio, solsticio de verano, hora actual.
- Mostrar claramente los puntos cardinales (Norte, Sur, Este, Oeste) en el lienzo.
  - Indicador visual de Norte (flecha o etiqueta "N").
  - Rotación opcional del lienzo para alinear el Norte con la parte superior de la pantalla.
- Calcular y mostrar la trayectoria del sol para la ubicación y fecha seleccionadas.
  - Ruta del sol desde el amanecer hasta el atardecer.
  - Posición del sol en intervalos regulares (ej: cada hora).
  - Ángulo de altura (elevación) y acimut del sol en cada punto.
- Visualizar el área de sombra proyectada por los elementos colocados en el terreno.
  - Basado en la altura de los elementos y la posición actual del sol.
  - Actualización dinámica al mover elementos o cambiar la hora.
- Indicar zonas de sol pleno, sombra parcial y sombra total según la hora y posición de elementos.
- Permitir al usuario definir umbrales de horas de sol directo requeridas para diferentes tipos de cultivo.

### Tecnologías sugeridas
- **Cálculos solares**: Librería como `suncalc` (JavaScript) o implementación basada en fórmulas astronómicas (ecuaciones de Spencer, algoritmo de NOAA).
- **Visualización**: Extender el canvas existente para dibujar:
  - Líneas o arcos que representan la trayectoria solar.
  - Puntos que indican la posición del sol en horas específicas.
  - Sombras proyectadas como polígonos o áreas semitransparentes.
  - Indicadores cardinales (texto y/o flechas).
- **State management**: Almacenar ubicación, fecha/hora y configuración solar en el estado de la aplicación.

### Componentes principales
1. **SolarController**: Maneja los cálculos de posición solar basada en ubicación y tiempo.
2. **LocationSelector**: Componente para elegir o ingresar coordenadas geográficas.
3. **TimeSelector**: Componente para seleccionar fecha y hora.
4. **SolarOverlay**: Capa de dibujo en el canvas que muestra:
   - Trayectoria solar (línea o puntos)
   - Posición actual del sol
   - Indicadores cardinales
   - Sombras proyectadas por elementos
5. **ShadowCalculator**: Calcula las sombras proyectadas por cada elemento basado en su forma, tamaño, altura y posición del sol.
6. **SunExposureAnalyzer**: Analiza cuántas horas de sol directo recibe cada punto del terreno (o cada elemento) durante el día.

### Estructuras de datos
```javascript
solarConfig = {
  location: {
    latitude: number,  // -90 a 90
    longitude: number, // -180 a 180
    altitude: number,  // opcional, en metros sobre el nivel del mar
    cityName: string   // para display
  },
  dateTime: {
    year: number,
    month: number,     // 0-11
    day: number,       // 1-31
    hour: number,      // 0-23
    minute: number     // 0-59
  },
  displayOptions: {
    showCardinals: boolean,
    showSolarPath: boolean,
    showCurrentSun: boolean,
    showShadows: boolean,
    showExposureZones: boolean,
    northAtTop: boolean // rotar lienzo para que Norte esté arriba
  }
}

solarData = {
  sunrise: { time: Date, azimuth: number, elevation: number },
  sunset: { time: Date, azimuth: number, elevation: number },
  solarNoon: { time: Date, azimuth: number, elevation: number },
  hourlyPositions: [  // array de posiciones solares por hora
    {
      time: Date,
      azimuth: number,   // ángulo desde el Norte en sentido horario (0-360)
      elevation: number, // ángulo sobre el horizonte (0-90)
      vector: { x: number, y: number } // unidad vector en el plano del terreno
    }
  ]
}

shadowData = {
  elementId: string,
  shadowPolygon: [ {x: number, y: number} ], // vértices del polígono de sombra
  length: number, // longitud de la sombra
  direction: number // dirección de la sombra (azimut opuesto al sol)
}

exposureData = {
  point: {x: number, y: number}, // coordenada en el terreno
  sunHours: number, // horas de sol directo recibidas
  shadingFactors: [ {elementId: string, shadowImpact: number} ] // qué elementos causan sombra y cuánto
}
```

### Algoritmos y cálculos
- **Cálculo de posición solar**:
  - Usar algoritmos establecidos como el de NOAA Solar Calculator o la librería `suncalc`.
  - Entrada: fecha, hora, latitud, longitud.
  - Salida: acimut (azimuth) y elevación (elevation) del sol.
- **Conversión a coordenadas del lienzo**:
  - El acimut determina la dirección del sol en el plano del terreno (0° = Norte, 90° = Este, etc.).
  - La elevación afecta la longitud de la sombra: longitud_sombra = altura_elemento / tan(elevación).
  - Para dibujar la trayectoria solar: calcular posiciones solares para cada hora del día y mapear a coordenadas del lienzo.
- **Cálculo de sombras**:
  - Para cada elemento, determinar su forma y dimensiones.
  - Projectar cada vértice del elemento en la dirección opuesta al sol por una distancia igual a (altura / tan(elevación)).
  - El polígono resultante es la sombra proyectada.
  - Para elementos complejos (no poligonales), aproximar con su bounding box o usar múltiples puntos.
- **Análisis de exposición solar**:
  - Opcional: dividir el terreno en una cuadrícula de puntos.
  - Para cada punto, verificar si está dentro de la sombra de cualquier elemento en cada hora del día.
  - Contar horas donde el punto no está en sombra (sol directo).
  - Alternativa más eficiente: calcular la unión de todas las sombras para cada hora y restar del terreno total.

### Eventos de usuario
- **En LocationSelector**:
  - `change` en selector de ciudad: actualizar latitud/longitud.
  - `click` en botón "Usar ubicación actual": solicitar permiso de geolocalización y actualizar.
  - `input` en campos de lat/long: validar y actualizar configuración.
- **En TimeSelector**:
  - `change` en selector de fecha: actualizar día/mes/año.
  - `change` en selector de hora: actualizar hora/minuto.
  - `click` en botones predefinidos (solsticio, equinoccio, ahora): establecer valores correspondientes.
- **En el canvas/SolarOverlay**:
  - `click` en indicador cardinal: opcional para rotar la vista.
  - `hover` sobre posición solar mostrada: mostrar tooltip con hora y ángulos.
  - `hover` sobre área sombreada: mostrar qué elemento proyecta esa sombra y su altura.
- **Controles globales**:
  - Tecla de acceso rápido para mostrar/ocultar overlay solar.
  - Slider para avanzar/retroceder el tiempo en tiempo real (simulación del día).

### Consideraciones de usabilidad
- Feedback claro cuando se cambia la ubicación o hora (re-cálculo y re-renderizado inmediato).
- Visualización intuitiva de la trayectoria solar: usar un color distintivo (amarillo/naranja) con suficiente contraste.
- Sombras mostradas como áreas semitransparentes (ej: gris oscuro con 30-50% opacidad) para ver el terreno debajo.
- Indicadores cardinales discretos pero visibles (flecha delgada con texto "N" en un borde del lienzo).
- Opción para fijar la orientación del terreno (evitar que gire al cambiar ubicación si el usuario ya tiene elementos colocados).
- Tooltips informativos al pasar el cursor sobre elementos del overlay solar.
- Advertencia si la ubicación está muy cerca de los polos (donde los cálculos solares se vuelven extremos).
- Modo nocturno: cuando no hay sol, mostrar fase lunar opcional o simplemente indicar "sin sol".

### Pruebas unitarias sugeridas
- Probar el cálculo de posición solar contra valores conocidos (ej: ecuatorial en equinoccio, polar en solsticio).
- Verificar que la conversión de acimut/elevación a vector 2D es correcta.
- Probar cálculo de sombras para formas simples (rectángulo, círculo) con sol en posiciones conocidas.
- Verificar que la longitud de la sombra es inversamente proporcional a la tangente de la elevación.
- Probar que al mediodía solar (en hemisferio norte), la sombra apunta exactamente al Norte.
- Simular cambio de ubicación y verificar que los ángulos cardinales se actualizan correctamente.
- Probar el análisis de exposición solar con escenarios simples (un elemento bloqueando el sol parcialmente).

### Extensiones futuras (post-MVP)
- **Análisis estacional**: mostrar cómo cambia la exposición solar a lo largo del año para planificación de cultivos perennes.
- **Mapa de calor de exposición**: visualización por colores de las horas de sol directo recibidas en cada punto del terreno.
- **Recomendaciones automáticas**: sugerir ubicaciones óptimas para elementos basado en sus necesidades de sol y el análisis de exposición.
- **Integración con datos climáticos**: usar historial de nubosidad o precipitación para ajustar estimaciones de crecimiento.
- **Simulación de crecimiento de plantas**: mostrar cómo crecerían árboles y arbustos con el tiempo y su impacto futuro en sombras.
- **Modo realidad aumentada**: superponer la información solar sobre la vista de la cámara del dispositivo en el terreno real.
- **Integración con herramientas de diseño**: exportar análisis solar a formato compatible con software de arquitectura paisajista.