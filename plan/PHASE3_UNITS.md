# Fase 3: Orientación Solar y Puntos Cardinales — Unidades de Trabajo TDD

Basado en `03_orientacion_solar_y_puntos_cardinales.md`. Cada unidad sigue el ciclo RED → GREEN → REFACTOR.

## Estado

| Unit ID | Descripción | Dependencias | Estado |
|---------|-------------|--------------|--------|
| **F3-U1** | `solarUtils.js` — posición solar (azimut + elevación) | — | ⬜ Pendiente |
| **F3-U2** | `shadowUtils.js` — cálculo de sombras por elemento | F3-U1 | ⬜ Pendiente |
| **F3-U3** | `solarConfig` data model + estado en App | — | ⬜ Pendiente |
| **F3-U4** | `LocationSelector` component | F3-U3 | ⬜ Pendiente |
| **F3-U5** | `TimeSelector` component | F3-U3 | ⬜ Pendiente |
| **F3-U6** | `CardinalLayer` — puntos cardinales en canvas | F3-U3 | ⬜ Pendiente |
| **F3-U7** | `SolarPathLayer` — trayectoria + posición actual del sol | F3-U1, F3-U3 | ⬜ Pendiente |
| **F3-U8** | `ShadowLayer` — sombras de elementos en canvas | F3-U2, F3-U3 | ⬜ Pendiente |
| **F3-U9** | Panel solar (integra LocationSelector + TimeSelector) | F3-U4, F3-U5 | ⬜ Pendiente |
| **F3-U10** | Integración en App + toggle overlay solar | F3-U6, F3-U7, F3-U8, F3-U9 | ⬜ Pendiente |

---

## F3-U1: `solarUtils.js` — cálculo de posición solar

**Archivos:**
- `src/utils/solarUtils.js`
- `src/utils/__tests__/solarUtils.test.js`

**Funciones a implementar:**
```js
getSolarPosition(date, latitude, longitude)
// → { azimuth: number, elevation: number }

getSolarPathForDay(date, latitude, longitude, intervalHours = 1)
// → Array<{ hour: number, azimuth: number, elevation: number, aboveHorizon: boolean }>

getSunrise(date, latitude, longitude)
// → { hour: number, minute: number } | null  (null en días sin amanecer/puesta)

getSunset(date, latitude, longitude)
// → { hour: number, minute: number } | null

azimuthToVector(azimuth)
// → { x: number, y: number }  (Norte = up = { x:0, y:-1 })
```

**Dependencia:** Instalar `suncalc` (`npm install suncalc`).

**Tests (RED first):**
- `getSolarPosition` en equinoccio (21 mar) mediodía solar en ecuador (lat=0, lon=0) → elevación ≈ 90°, azimut ≈ 180°
- `getSolarPosition` en solsticio verano (21 jun) mediodía en Madrid (lat=40.4, lon=-3.7) → elevación > 60°
- `getSolarPosition` con elevación < 0 → sol bajo el horizonte (noche)
- `getSolarPathForDay` retorna array; entradas con `aboveHorizon: true` tienen `elevation >= 0`
- `getSolarPathForDay` en día con 24h de sol (lat=70, solsticio verano) → todos `aboveHorizon: true`
- `azimuthToVector(0)` → `{ x: 0, y: -1 }` (Norte = arriba en canvas)
- `azimuthToVector(90)` → `{ x: 1, y: 0 }` (Este = derecha)
- `azimuthToVector(180)` → `{ x: 0, y: 1 }` (Sur = abajo)
- `azimuthToVector(270)` → `{ x: -1, y: 0 }` (Oeste = izquierda)
- `getSunrise` / `getSunset` retornan objetos con `hour` y `minute` para latitud normal

**Notas de implementación:**
- `suncalc.getPosition(date, lat, lng)` → `{ azimuth (rad, S=0), altitude (rad) }`
- Convertir `suncalc` azimuth (radianes, Sur=0, sentido horario→ positivo es oeste) a convención geográfica:
  ```js
  const azimuthGeo = ((suncalc.azimuth * 180 / Math.PI) + 180) % 360; // Norte=0, E=90, S=180, O=270
  const elevation = suncalc.altitude * 180 / Math.PI;
  ```
- `suncalc.getTimes(date, lat, lng)` → `{ sunrise, sunset, solarNoon, ... }`

---

## F3-U2: `shadowUtils.js` — cálculo de sombras

**Archivos:**
- `src/utils/shadowUtils.js`
- `src/utils/__tests__/shadowUtils.test.js`

**Funciones a implementar:**
```js
getShadowLength(elementHeight, elevation)
// → number (metros) — Infinity cuando elevation <= 0

getShadowPolygon(element, elevation, azimuth)
// → Array<{x, y}> — polígono de sombra en metros

getShadowDirection(azimuth)
// → number — dirección opuesta al sol (azimut + 180) % 360
```

**Tests (RED first):**
- `getShadowLength(10, 45)` → ≈ 10 (tan(45°) = 1)
- `getShadowLength(10, 30)` → ≈ 17.32 (tan(30°) ≈ 0.577)
- `getShadowLength(10, 90)` → ≈ 0 (sol cenital)
- `getShadowLength(10, 0)` → `Infinity` (sol en el horizonte)
- `getShadowLength(10, -5)` → `Infinity` (sol bajo el horizonte)
- `getShadowDirection(45)` → 225
- `getShadowDirection(270)` → 90
- `getShadowPolygon` con rect + sol al sur (azimut=180) → sombra al norte del rectángulo
- `getShadowPolygon` con rect + elevación=90 → sombra vacía o con longitud ≈ 0
- `getShadowPolygon` para rect: retorna array de 4 puntos
- `getShadowPolygon` para circle: retorna array de ≥ 4 puntos (elipse aproximada)

**Notas de implementación:**
- `element` tiene: `{ x, y, width, height, radius, shape, elementHeight }` (elementHeight en metros, default 3m)
- Para rectángulo: proyectar los 4 vértices en la dirección de la sombra por `shadowLength`
- Para círculo: proyectar el centro + radio en la dirección de la sombra → elipse
- La dirección de la sombra es `azimuthToVector((azimuth + 180) % 360)`

---

## F3-U3: `solarConfig` — data model + estado en App

**Archivos modificados:**
- `src/App.jsx` — nuevo estado `solarConfig` y `solarVisible`

**Estructura:**
```js
const defaultSolarConfig = {
  location: {
    latitude: 40.4168,   // Madrid por defecto
    longitude: -3.7038,
    cityName: 'Madrid',
  },
  dateTime: {
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    day: new Date().getDate(),
    hour: 12,
    minute: 0,
  },
  displayOptions: {
    showCardinals: true,
    showSolarPath: true,
    showCurrentSun: true,
    showShadows: false,
    northAtTop: true,
  },
};
```

**Tests:**
- Función pura `mergeSolarConfig(current, partial)` → deep merge correcto
- `mergeSolarConfig` con `partial.location` reemplaza solo los campos provistos
- `mergeSolarConfig` no muta el objeto original

**Archivos:**
- `src/utils/solarConfigUtils.js` — `mergeSolarConfig`
- `src/utils/__tests__/solarConfigUtils.test.js`

---

## F3-U4: `LocationSelector` component

**Archivos:**
- `src/components/LocationSelector.jsx`
- `src/components/__tests__/LocationSelector.test.jsx`

**Props:** `{ location, onChange }`

**Ciudades predefinidas (mínimo 5):**
```js
const PRESET_CITIES = [
  { name: 'Madrid', latitude: 40.4168, longitude: -3.7038 },
  { name: 'Buenos Aires', latitude: -34.6037, longitude: -58.3816 },
  { name: 'Ciudad de México', latitude: 19.4326, longitude: -99.1332 },
  { name: 'Santiago de Chile', latitude: -33.4489, longitude: -70.6693 },
  { name: 'Bogotá', latitude: 4.7110, longitude: -74.0721 },
];
```

**Tests (RED first):**
- Renderiza selector `<select>` con las ciudades predefinidas
- Cambiar ciudad llama `onChange` con `{ latitude, longitude, cityName }`
- Renderiza inputs numéricos para latitud y longitud
- Cambiar latitud manualmente llama `onChange` con nueva latitud y `cityName: 'Custom'`
- Latitud inválida (> 90 o < -90) NO llama `onChange`
- Longitud inválida (> 180 o < -180) NO llama `onChange`
- La ciudad actual se refleja como `value` del `<select>`

---

## F3-U5: `TimeSelector` component

**Archivos:**
- `src/components/TimeSelector.jsx`
- `src/components/__tests__/TimeSelector.test.jsx`

**Props:** `{ dateTime, onChange }`

**Tests (RED first):**
- Renderiza input de fecha (o tres selects: día/mes/año)
- Renderiza input/slider de hora (0-23)
- Cambiar hora llama `onChange` con nuevo `dateTime`
- Botón "Solsticio Verano" establece month=5 (junio), day=21
- Botón "Solsticio Invierno" establece month=11 (diciembre), day=21
- Botón "Equinoccio" establece month=2 (marzo), day=21
- Botón "Ahora" establece fecha y hora actuales (verificar que llama `onChange`)
- Valor del slider refleja `dateTime.hour`

---

## F3-U6: `CardinalLayer` — puntos cardinales en canvas

**Archivos:**
- `src/components/CardinalLayer.jsx`
- `src/components/__tests__/CardinalLayer.test.jsx`

**Props:** `{ width, height, northAtTop }`

**Tests (usando mock de react-konva igual que TerrainCanvas.test.jsx):**
- Renderiza 4 etiquetas: "N", "S", "E", "O"
- "N" está en la parte superior del canvas (y pequeño) cuando `northAtTop=true`
- "S" está en la parte inferior (y grande) cuando `northAtTop=true`
- Cada etiqueta tiene `data-testid="cardinal-label"`
- Con `northAtTop=false` las posiciones de N/S se invierten (N abajo, S arriba)

**Notas de implementación:**
- Usar `<Text>` de react-konva para las etiquetas
- Posiciones: N → `{ x: width/2, y: 10 }`, S → `{ x: width/2, y: height-20 }`, E → `{ x: width-20, y: height/2 }`, O → `{ x: 10, y: height/2 }`
- "N" con color rojo distintivo, resto gris oscuro

---

## F3-U7: `SolarPathLayer` — trayectoria solar

**Archivos:**
- `src/components/SolarPathLayer.jsx`
- `src/components/__tests__/SolarPathLayer.test.jsx`

**Props:** `{ solarConfig, width, height, scale, position, baseScale }`

**Tests:**
- Renderiza arco/línea de trayectoria solar (`data-testid="solar-path"`)
- Renderiza marcadores de hora para posiciones sobre el horizonte (`data-testid="solar-hour-marker"`)
- Renderiza marcador de posición actual del sol (`data-testid="solar-current"`)
- Con `showSolarPath=false` en displayOptions → no renderiza la trayectoria
- Con `showCurrentSun=false` → no renderiza marcador actual
- Posición del sol en pantalla calculada correctamente desde azimut (verificar data-x, data-y)

**Notas de implementación:**
- La trayectoria solar en el canvas 2D se representa como una curva o polilínea
- Mapeo de azimut/elevación a canvas: el centro del canvas es el centro del terreno
  ```js
  // azimuth 0=N, 90=E, 180=S, 270=O
  // En canvas: Norte = arriba (y decrece), Este = derecha (x crece)
  const sunX = cx + Math.sin(azimuthRad) * radius * (1 - elevation/90);
  const sunY = cy - Math.cos(azimuthRad) * radius * (1 - elevation/90);
  ```
- El radio del arco solar puede ser un porcentaje del tamaño del canvas (ej: `min(width, height) * 0.4`)

---

## F3-U8: `ShadowLayer` — sombras en canvas

**Archivos:**
- `src/components/ShadowLayer.jsx`
- `src/components/__tests__/ShadowLayer.test.jsx`

**Props:** `{ elements, solarConfig, scale, position, baseScale }`

**Tests:**
- Con `showShadows=false` → no renderiza nada
- Con `showShadows=true` y elementos colocados → renderiza polígonos de sombra (`data-testid="shadow-polygon"`)
- Número de polígonos = número de elementos con `elementHeight > 0`
- Con sol bajo el horizonte (elevation < 0) → no renderiza sombras
- Sombra de elemento en `{ x:5, y:5 }` con sol al sur (azimut=180°) → polígono al norte del elemento (y menor)
- `opacity` del polígono es < 1 (semitransparente)

**Notas de implementación:**
- Usar `getShadowPolygon` de `shadowUtils.js`
- Convertir metros a píxeles: `px = meter * baseScale * scale + position.x`
- Konva `<Line closed={true} fill="rgba(0,0,0,0.3)" points={flatArray} />`

---

## F3-U9: `SolarPanel` — panel de control solar

**Archivos:**
- `src/components/SolarPanel.jsx`
- `src/components/__tests__/SolarPanel.test.jsx`

**Props:** `{ solarConfig, onConfigChange, onClose }`

**Tests:**
- Renderiza `LocationSelector` y `TimeSelector`
- Renderiza checkboxes para las `displayOptions` (showCardinals, showSolarPath, showShadows, etc.)
- Checkbox "Mostrar sombras" llama `onConfigChange` con `displayOptions.showShadows` alternado
- Checkbox "Norte arriba" llama `onConfigChange` con `displayOptions.northAtTop` alternado
- Botón "Cerrar" llama `onClose`
- Muestra resumen: hora del amanecer y atardecer para la ubicación/fecha configurada
- Renderiza con encabezado "Configuración Solar"

---

## F3-U10: Integración en App + toggle overlay

**Archivos modificados:**
- `src/App.jsx` — estado `solarVisible`, `solarConfig`; paso de props a TerrainCanvas
- `src/components/Toolbar.jsx` — botón "☀ Solar"
- `src/components/TerrainCanvas.jsx` — renderizar CardinalLayer, SolarPathLayer, ShadowLayer dentro del Stage

**Estado nuevo en App:**
```js
const [solarVisible, setSolarVisible] = useState(false);
const [solarPanelOpen, setSolarPanelOpen] = useState(false);
const [solarConfig, setSolarConfig] = useState(defaultSolarConfig);
```

**Tests:**
- Toolbar renderiza botón "Solar" cuando `finished=true`
- Click en botón "Solar" → toggle de `solarVisible`
- Con `solarVisible=true`: CardinalLayer presente en el canvas
- Con `solarVisible=false`: CardinalLayer ausente
- `handleSolarConfigChange` actualiza `solarConfig` usando `mergeSolarConfig`
- Tecla `S` (cuando `finished=true`) → alterna `solarVisible` (acceso rápido)

---

## Integración final en App.jsx

```jsx
<TerrainCanvas
  ...existingProps...
  solarVisible={solarVisible}
  solarConfig={solarConfig}
/>

{solarPanelOpen && (
  <SolarPanel
    solarConfig={solarConfig}
    onConfigChange={handleSolarConfigChange}
    onClose={() => setSolarPanelOpen(false)}
  />
)}
```

Dentro de `TerrainCanvas` (Stage), después de `PlacedElementsLayer`:
```jsx
{solarVisible && solarConfig.displayOptions.showCardinals && (
  <CardinalLayer width={stageWidth} height={stageHeight} northAtTop={solarConfig.displayOptions.northAtTop} />
)}
{solarVisible && solarConfig.displayOptions.showSolarPath && (
  <SolarPathLayer solarConfig={solarConfig} width={stageWidth} height={stageHeight} scale={scale} position={position} baseScale={baseScale} />
)}
{solarVisible && solarConfig.displayOptions.showShadows && (
  <ShadowLayer elements={placedElements} solarConfig={solarConfig} scale={scale} position={position} baseScale={baseScale} />
)}
```

---

## Notas de implementación

### Instalación de dependencia
```bash
npm install suncalc
```

### Mock de `suncalc` en tests
```js
vi.mock('suncalc', () => ({
  default: {
    getPosition: vi.fn(() => ({ azimuth: 0, altitude: Math.PI / 4 })),
    getTimes: vi.fn(() => ({
      sunrise: new Date('2024-06-21T06:00:00'),
      sunset: new Date('2024-06-21T21:00:00'),
      solarNoon: new Date('2024-06-21T13:30:00'),
    })),
  },
}));
```

### Convención de coordenadas en canvas
- Norte = arriba en canvas (`y` decrece)
- Este = derecha (`x` crece)
- Azimut: 0° = Norte, 90° = Este, 180° = Sur, 270° = Oeste

### Mock de react-konva para nuevos componentes
Agregar al mock existente:
```js
Line: ({ points, closed, fill, opacity, ...props }) => (
  <div data-testid="konva-line" data-points={JSON.stringify(points)} data-fill={fill} data-opacity={opacity} {...props} />
),
```

---

*Documento generado el 2026-03-29. Actualizar estado de cada unidad al completarla.*
