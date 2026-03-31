# Manual de uso — Home Distribution

Aplicación web para diseñar la distribución de elementos en un terreno autosustentable. Permite dibujar el polígono del terreno, colocar elementos (casa, huertos, gallineros, etc.), analizar orientación solar, medir distancias y validar restricciones de separación entre elementos.

---

## Índice

1. [Flujo general de uso](#1-flujo-general-de-uso)
2. [Dibujar el terreno](#2-dibujar-el-terreno)
3. [Ajustar el terreno](#3-ajustar-el-terreno)
4. [Elementos disponibles](#4-elementos-disponibles)
5. [Colocar y manipular elementos](#5-colocar-y-manipular-elementos)
6. [Cuadrícula y ajuste a la rejilla](#6-cuadrícula-y-ajuste-a-la-rejilla)
7. [Orientación solar](#7-orientación-solar)
8. [Medidas y herramientas de distancia](#8-medidas-y-herramientas-de-distancia)
9. [Restricciones espaciales](#9-restricciones-espaciales)
10. [Atajos de teclado](#10-atajos-de-teclado)

---

## 1. Flujo general de uso

```
Dibujar terreno → Finalizar terreno → Colocar elementos → Analizar y ajustar
```

1. Haz clic en el canvas para añadir vértices del terreno.
2. Cuando tengas al menos 3 puntos, presiona **Enter** o el botón **Finalizar terreno**.
3. Selecciona elementos del panel izquierdo y haz clic en el canvas para colocarlos.
4. Usa las herramientas de Solar, Medidas y Restricciones para analizar el diseño.

---

## 2. Dibujar el terreno

El terreno es un polígono irregular que representa los límites reales del predio.

### Cómo dibujar

- **Clic en el canvas** → añade un vértice
- El polígono se dibuja en orden: cada clic agrega un punto al final de la secuencia
- Una línea azul punteada muestra el segmento en construcción hacia el cursor
- Si el nuevo punto **causaría una auto-intersección**, la línea se vuelve **roja** y el punto no se añade

### Controles durante el dibujo

| Acción | Resultado |
|---|---|
| Clic en canvas | Añadir vértice |
| **Enter** | Finalizar terreno (requiere ≥ 3 puntos) |
| **Backspace** / **Delete** | Eliminar el último punto |
| **Escape** | Borrar todos los puntos y empezar de cero |

### Tooltips de segmento

Al pasar el cursor sobre un lado del polígono aparece una etiqueta con la longitud de ese segmento en metros.

### Métricas en tiempo real

El panel lateral muestra el área (m²) y el perímetro (m) del polígono mientras se dibuja.

### Navegación en el canvas

| Acción | Resultado |
|---|---|
| Arrastra con el ratón (sin punto) | Desplazar (pan) el canvas |
| Rueda del ratón | Zoom hacia el cursor (0.1× a 10×) |

---

## 3. Ajustar el terreno

Una vez finalizado el terreno, sus vértices quedan fijos. Si necesitas modificar la forma:

1. Haz clic en **Ajustar terreno** en la barra de herramientas (se resalta en amarillo).
2. Arrastra cualquier vértice (círculo rojo) a su nueva posición.
3. Las métricas de área y perímetro se actualizan en tiempo real.
4. Haz clic en **Ajustar terreno** de nuevo para salir del modo de edición.

> **Nota**: mientras está activo el modo de ajuste no se pueden colocar nuevos elementos.

---

## 4. Elementos disponibles

| Elemento | Forma | Tamaño por defecto | Descripción |
|---|---|---|---|
| **Casa** | Rectángulo | 10 × 8 m | Vivienda principal |
| **Piscina** | Rectángulo | 8 × 4 m | Piscina o estanque |
| **Huerto** | Rectángulo | 4 × 2 m | Cama de cultivo |
| **Gallinero** | Rectángulo | 3 × 2 m | Recinto para aves |
| **Árbol Frutal** | Círculo | Ø 4 m (radio 2 m) | Árbol con copa circular |
| **Área de Compost** | Rectángulo | 1 × 1 m | Zona de compostaje |
| **Área de Recreación** | Rectángulo | 6 × 6 m | Zona de juego o descanso |
| **Sendero** | Rectángulo | 5 × 1 m | Camino o pasillo |

Cada elemento tiene un color, borde y propiedades ecológicas (necesidades de sol/agua, separación mínima recomendada) definidos en la biblioteca.

---

## 5. Colocar y manipular elementos

### Colocar

1. Selecciona un tipo de elemento en el panel izquierdo.
2. Haz clic dentro del terreno para colocarlo. Si el elemento no cabe íntegramente dentro del polígono, el clic se ignora.

### Seleccionar

Haz clic sobre un elemento → aparece resaltado en azul con asas (handles) de manipulación.

### Mover

Arrastra el elemento. Si la nueva posición queda fuera del terreno, vuelve a su posición original.

### Redimensionar

Cuando un elemento está seleccionado aparecen asas blancas en los bordes/esquinas:

- **Rectángulos**: 4 asas en las esquinas (tl, tr, br, bl). Al arrastrar una esquina, la esquina opuesta queda fija como ancla.
- **Círculos**: 1 asa en el borde derecho. El radio se calcula por la distancia desde el centro.
- El tamaño mínimo es **0.5 m** en cualquier dimensión.
- El redimensionado funciona correctamente con elementos rotados.

### Rotar

Cuando un elemento está seleccionado aparece un asa dorada **sobre** el elemento. Arrástrala en cualquier dirección para rotar. El ángulo se mide desde el norte (arriba), en sentido horario (0°–360°).

### Ver dimensiones (hover)

Al pasar el cursor sobre un elemento sin seleccionarlo aparecen etiquetas azules mostrando:

- **Rectángulos**: ancho (borde superior) y alto (borde derecho), en metros.
- **Círculos**: diámetro (sobre el círculo).

Las etiquetas se alinean con la orientación del elemento.

### Eliminar

Con un elemento seleccionado: **Delete** o **Backspace**.

### Duplicar

Con un elemento seleccionado: **Ctrl + D** → crea una copia desplazada 1 m en X e Y.

---

## 6. Cuadrícula y ajuste a la rejilla

- Botón **Mostrar cuadrícula** / **Ocultar cuadrícula**: activa líneas grises cada 10 m.
- Con la cuadrícula visible, el **snap** se activa automáticamente: al colocar o mover elementos, la posición se redondea al metro más cercano.

---

## 7. Orientación solar

Activa con el botón **Solar** (o tecla **S** cuando el terreno está finalizado). Se abre un panel lateral con configuración y opciones de visualización.

### Capas visuales

| Capa | Descripción |
|---|---|
| **Puntos cardinales** | N, S, E, O en las esquinas del canvas |
| **Trayectoria solar** | Arco dorado mostrando el recorrido del sol durante el día |
| **Marcadores de hora** | Puntos dorados cada hora (solo las horas sobre el horizonte) |
| **Posición actual del sol** | Círculo dorado grande en la posición del sol para la fecha/hora seleccionada |
| **Sombras** | Polígonos negros semitransparentes proyectados por cada elemento según la elevación del sol |

El arco de la trayectoria está centrado en el **centroide del terreno** y escala con el zoom.

### Configuración de ubicación

- Seleccionar entre 6 ciudades predefinidas: Madrid, Buenos Aires, Ciudad de México, Santiago de Chile, Bogotá, Lima.
- Introducir latitud y longitud manualmente para cualquier ubicación.

### Configuración de fecha y hora

- Selector de fecha (año/mes/día).
- Slider de hora (0–23 h UTC).
- Botones de preset: **Solsticio de verano** (21 jun), **Solsticio de invierno** (21 dic), **Equinoccio** (21 mar), **Ahora** (fecha y hora actual del sistema).

### Opciones de visualización

Cada capa puede mostrarse u ocultarse independientemente con checkboxes en el panel.

---

## 8. Medidas y herramientas de distancia

Activa con el botón **Medidas** (o tecla **M** para la herramienta de regla). Se abre el panel de herramientas de medición.

### Herramienta Regla (distancia)

Mide la distancia en línea recta entre dos puntos:

1. Haz clic en **Regla** (o presiona **M**).
2. Haz clic en el primer punto del canvas.
3. Haz clic en el segundo punto.
4. Aparece una línea azul con la distancia en metros.

Para cancelar una medición en curso: **Escape**.

### Herramienta Área

Mide el área de un polígono trazado manualmente:

1. Haz clic en **Área**.
2. Haz clic en los vértices del polígono en orden.
3. Haz **doble clic** para cerrar y calcular.
4. Aparece el polígono con el área en m² en el centro.

### Limpiar mediciones

El botón **Limpiar** elimina todas las mediciones guardadas.

### Distancias automáticas (auto-distancias)

Al seleccionar un elemento, se dibujan automáticamente líneas **cian punteadas** desde los bordes del elemento hacia:

- **Otros elementos** cercanos (a menos de 10 m).
- El **borde del terreno** (distancia al límite más próximo).

Las líneas parten del borde del elemento (no del centro) y muestran la distancia real borde-a-borde.

### Visibilidad

Los checkboxes del panel permiten mostrar u ocultar:
- Las mediciones manuales
- Las restricciones y sus visualizaciones

---

## 9. Restricciones espaciales

Las restricciones son reglas de **distancia mínima** entre elementos o entre un elemento y el límite del terreno. Sirven para garantizar que el diseño sea funcional y seguro.

### Restricciones predeterminadas

Cada tipo de elemento tiene restricciones recomendadas que se pueden aplicar automáticamente:

| Elemento origen | Regla | Valor |
|---|---|---|
| **Casa** | Distancia mínima al límite del terreno | 3 m |
| **Casa** | Distancia mínima entre casas | 5 m |
| **Piscina** | Distancia mínima al límite del terreno | 2 m |
| **Huerto** | Distancia mínima al gallinero | 2 m |
| **Gallinero** | Distancia mínima a la casa | 5 m |
| **Árbol Frutal** | Distancia mínima entre árboles frutales | 4 m |
| **Área de Compost** | Distancia mínima a la casa | 3 m |

Para aplicar las predeterminadas: haz clic en **Aplicar predeterminadas** en el panel de restricciones.

### Indicadores visuales

- **Borde verde** en el panel de restricciones: la restricción se cumple.
- **Borde rojo** en el panel y en el elemento: la restricción está siendo violada.
- **Línea roja** en el canvas: conecta los dos elementos con distancia insuficiente, mostrando la distancia actual y la mínima requerida.

Las líneas de violación también parten del borde del elemento (no del centro).

### Gestión manual de restricciones

En el **Panel de Restricciones** puedes:

- **Activar/desactivar** una restricción individual con su checkbox.
- **Eliminar** una restricción con el botón de borrar.
- **Añadir** una nueva restricción rellenando el formulario:
  - *Nombre*: descripción de la regla.
  - *Distancia mínima* (m).
  - *Elemento origen* y *Elemento destino* (IDs de elementos colocados o `terrain` para el borde).

---

## 10. Atajos de teclado

### Durante el dibujo del terreno

| Tecla | Acción |
|---|---|
| **Enter** | Finalizar terreno (≥ 3 puntos) |
| **Backspace** / **Delete** | Eliminar el último punto |
| **Escape** | Borrar todos los puntos |

### Con el terreno finalizado

| Tecla | Acción |
|---|---|
| **S** | Mostrar/ocultar superposición solar |
| **M** | Activar/desactivar herramienta de regla |
| **Delete** / **Backspace** | Eliminar elemento seleccionado |
| **Ctrl + D** | Duplicar elemento seleccionado |
| **Escape** | Cancelar medición en curso |

---

*Documentación generada para Home Distribution — versión con fases 1–4 completas (335 tests).*
