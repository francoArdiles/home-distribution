# Home Distribution

Aplicacion web para disenar y planificar la distribucion de elementos en un terreno destinado a una vivienda autosustentable. Permite definir la forma irregular del terreno, posicionar y gestionar elementos (casa, piscina, huertos, arboles, etc.), visualizar el comportamiento solar y exportar el diseno.

## Indice

1. [Inicio rapido](#inicio-rapido)
2. [Flujo de trabajo tipico](#flujo-de-trabajo-tipico)
3. [Terreno](#terreno)
4. [Biblioteca de elementos](#biblioteca-de-elementos)
5. [Objetos personalizados](#objetos-personalizados)
6. [Caminos](#caminos)
7. [Solar y sombras](#solar-y-sombras)
8. [Medidas y restricciones](#medidas-y-restricciones)
9. [Editor de casa](#editor-de-casa)
10. [Auto-distribucion](#auto-distribucion)
11. [Panel de informacion](#panel-de-informacion)
12. [Guardado y exportacion](#guardado-y-exportacion)
13. [Atajos de teclado](#atajos-de-teclado)
14. [Formato de archivo](#formato-de-archivo)
15. [Stack](#stack)

---

## Inicio rapido

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # Build de produccion en dist/
npm run test       # Ejecutar los tests unitarios
```

---

## Flujo de trabajo tipico

1. Dibuja el poligono del terreno haciendo clic en el canvas. Cierra con **Space** o **Enter**.
2. Coloca elementos desde el panel izquierdo (aparece al terminar el terreno).
3. Abre el panel "Medidas" para definir restricciones de distancia.
4. Opcional: usa "Sugerir" para generar distribuciones automaticas.
5. Haz doble clic sobre una **Casa** para abrir el editor de planta interior.
6. Guarda con **Ctrl+S**.

---

## Terreno

### Dibujar

- Haz clic en el canvas para anadir vertices al poligono.
- Una linea de vista previa (azul punteada si es valida, roja si causaria auto-interseccion) va del ultimo punto al cursor.
- Al pasar el cursor sobre un segmento aparece un tooltip con su longitud en metros.
- Al arrastrar un vertice mientras se dibuja, se muestran etiquetas dinamicas con las longitudes de los lados adyacentes y la posicion X/Y del vertice.
- **Space** o **Enter** (con 3 o mas vertices): cierra el poligono y activa el terreno.
- **Backspace** / **Delete** (sin Shift): borra el ultimo vertice agregado.
- **Shift+Delete** / **Shift+Backspace**: resetea completamente el canvas (borra terreno y elementos).

### Editar el terreno terminado

- **"Ajustar terreno"** (boton en toolbar): activa modo edicion de vertices. Arrastra cualquier vertice para reposicionar.

### Cuadricula

- **"Mostrar cuadricula"** / **"Ocultar cuadricula"**: toggle de cuadricula con snap automatico al colocar o mover elementos.

### Navegacion del canvas

- **Arrastrar con boton izquierdo** (sobre area vacia): panear el canvas.
- **Rueda del raton**: zoom hacia la posicion del cursor (rango 0.1x - 10x).

### Entrada / porton

- **"Entrada"** (boton en toolbar, disponible con terreno terminado): activa modo de colocacion de entrada.
- Haz clic sobre cualquier borde del terreno para crear o reubicar la entrada. Se muestra resaltado naranja en el borde al pasar el cursor.
- En modo entrada aparece la entrada como una apertura en el borde con:
  - **Circulo naranja central**: arrastralo para mover la entrada a lo largo del borde.
  - **Circulos blancos laterales**: arrastralos para ajustar el ancho de la apertura.
  - Etiquetas de ancho y de distancias laterales en tiempo real.
- Fuera del modo entrada, la entrada se muestra con el indicador "E" en naranja.

---

## Biblioteca de elementos

El panel de elementos (izquierda, disponible con terreno terminado) organiza los 13 tipos predefinidos en 4 categorias expandibles:

| Categoria | Elementos |
|-----------|-----------|
| Hogar | Casa, Bodega, Taller, Estacionamiento |
| Jardin | Piscina, Huerto, Area de Recreacion, Sendero, Estanque |
| Animales | Gallinero |
| Sostenibilidad | Arbol Frutal, Area de Compost, Pozo |

- Haz clic en un tipo para activarlo; el siguiente clic en el canvas lo coloca.
- Tambien puedes **arrastrarlo** directamente desde la biblioteca al canvas (drag & drop).
- Los elementos solo se colocan si caben dentro del poligono del terreno.
- Los elementos personalizados aparecen en su categoria marcados con `✦`.

### Interaccion con elementos colocados

| Accion | Como hacerlo |
|--------|-------------|
| Seleccionar | Clic sobre el elemento |
| Mover | Arrastrar el elemento seleccionado |
| Redimensionar | Arrastrar los handles de esquina o borde |
| Rotar | Arrastrar el handle de rotacion |
| Renombrar | Clic sobre el nombre en el panel de informacion (derecha) |
| Abrir detalle | Doble clic sobre el elemento |
| Duplicar | **Ctrl+D** con el elemento seleccionado |
| Eliminar | **Delete** o **Backspace** con el elemento seleccionado |

- Si la cuadricula esta activa, el movimiento hace snap a la cuadricula.
- Los elementos con restricciones violadas muestran un borde rojo.

### Atributos de detalle por tipo

Cada elemento tiene un panel de detalle (doble clic) con campos especificos. Ademas, todos los elementos muestran en su detalle:

- **Fijar posicion**: impide que la auto-distribucion mueva ese elemento.
- **Camino**: define como se conecta a la red de caminos autogenerados (hub / en grupo / sin camino). Si se elige "en grupo", se especifica un identificador de grupo.

| Elemento | Campos de detalle |
|----------|------------------|
| Casa | Pisos (1-5), Dormitorios, Banos, Tipo de techo (plano / a dos aguas / a cuatro aguas / shed), Construccion (hormigon / madera / adobe / steel frame / mixto), Notas. Ademas: editor de planta interior completo. |
| Piscina | Profundidad (m), Pendiente (%), Escalones (lista de ancho/alto), Revestimiento (hormigon / fibra de vidrio / liner / azulejo), Con calefaccion (booleano). |
| Huerto | Tipo de cultivo (hortalizas / frutales / hierbas / flores / mixto), Riego (manual / goteo / aspersion / ninguno), Sustrato (tierra natural / compost / tierra+compost / sustrato hidroponico), Estaciones activas (lista), Notas. |

---

## Objetos personalizados

**"Crear objeto"** (toolbar): abre el editor de forma libre con:

- Canvas SVG con cuadricula (1 cuadro = 1 m, snap 0.5 m) y zoom con rueda del raton.
- Clic para agregar vertices; cierra el poligono haciendo clic sobre el primer vertice (circulo verde) o presionando **Enter**.
- Etiquetas de longitud de cada lado y angulos interiores en tiempo real.
- Campos de nombre, categoria, color de relleno y color de borde.
- **Backspace**: borra el ultimo vertice. **Escape**: cancela y cierra.
- Al guardar el objeto aparece en la biblioteca dentro de la categoria elegida.

---

## Caminos

Panel de caminos en la parte inferior del panel de elementos.

- **Grosor (m)**: ajusta el ancho del proximo camino (0.5 - 10 m).
- **"Dibujar camino"**: activa el modo de trazado.
  - Haz clic para anadir puntos al camino.
  - **Space**: finaliza el camino (necesita al menos 2 puntos).
  - **"Cancelar"**: descarta el camino en curso.
- Los caminos terminados muestran su longitud total en el canvas.
- Haz clic sobre un camino para seleccionarlo; aparece el panel de edicion con:
  - Longitud total, cantidad de vertices y ancho actual.
  - Boton para cambiar el ancho o eliminar el camino.
- **Escape**: deselecciona el camino seleccionado.

---

## Solar y sombras

**"Solar"** (toolbar, disponible con terreno terminado): abre el panel flotante Solar.

### Panel Solar

- **Ubicacion geografica**: selector de ciudad o coordenadas manuales (latitud/longitud).
- **Fecha y hora**: selector de fecha + hora local.
- **Opciones de visualizacion** (checkboxes):
  - Mostrar cardinales (N/S/E/O sobre el canvas)
  - Mostrar trayectoria solar (arco del sol sobre el terreno)
  - Mostrar sombras (proyeccion de sombra para cada elemento segun su altura)
  - Norte arriba (orientacion del canvas)

**Shift+S**: toggle rapido de todo el overlay solar.

---

## Medidas y restricciones

**"Medidas"** (toolbar): abre el panel flotante de medidas y restricciones.

### Herramientas de medicion

| Herramienta | Uso |
|------------|-----|
| Regla | Clic en el canvas para iniciar una medicion de distancia; clic final para fijarla. Muestra la distancia en metros sobre el canvas. |
| Area | Define un poligono de medicion (Space para cerrarlo); muestra el area interior en m². |
| Borrador | Clic sobre una medicion para eliminarla. |
| Limpiar | Elimina todas las mediciones activas. |

Checkboxes de visibilidad: "Mostrar mediciones" y "Mostrar restricciones" controlan si los overlays aparecen en el canvas.

**M**: toggle rapido de la herramienta Regla.

### Restricciones de distancia

El panel de restricciones (dentro del mismo flotante) permite definir distancias minimas o maximas entre pares de elementos o entre un elemento y el terreno.

- **Origen**: el elemento de referencia.
- **Destino**: "Limite del terreno", "Entrada del terreno", "Cualquier otro elemento", o un elemento especifico.
- **Tipo**: distancia minima o maxima.
- **Valor (m)**: la distancia requerida.
- **"Agregar restriccion"**: agrega la regla a la lista.
- **"Aplicar predeterminadas"**: agrega restricciones tipicas para cada tipo de elemento colocado (basadas en su `minSpacing`).
- Cada restriccion tiene un checkbox para activarla/desactivarla y un boton `x` para eliminarla.
- La lista puede agruparse por origen o por destino.
- El estado de cada restriccion (cumplida / violada / desactivada) se muestra en tiempo real tanto en el panel como en el panel de informacion lateral.

---

## Editor de casa

Al hacer **doble clic** sobre un elemento **Casa** se abre el panel de detalle en modo dos columnas: campos de detalle a la izquierda y editor de planta interior a la derecha.

### Selector de piso

Si la casa tiene mas de 1 piso, aparece una fila de botones "Piso 1", "Piso 2", etc. Todo lo dibujado se asocia al piso seleccionado.

### Barra de herramientas del editor

**Herramientas de dibujo:**

| Herramienta | Comportamiento |
|-------------|----------------|
| **Pared** | Primer clic: inicia la pared. Segundo clic: fija el extremo (con snap a endpoints de paredes existentes y a cuadricula de 1 m). Clic sobre una pared existente: la borra. Arrastrar una pared: mueve toda la pared. Arrastrar un endpoint: mueve solo ese extremo. Grosor configurable (0.05 - 0.5 m). |
| **Puerta** | Pasa el cursor sobre una pared para ver la preview (apertura de 0.9 m). Clic: coloca la puerta. Clic sobre una puerta ya colocada: la borra. |
| **Ventana** | Igual que puerta; apertura de 1.2 m. |
| **Cuartos** | Activa la seleccion de zonas. Clic en un area cerrada: selecciona el cuarto detectado automaticamente. Permite asignarle tipo y nombre. Clic en un elemento de red o tuberia: lo selecciona. Delete: borra el elemento o tuberia seleccionados. |
| **Red** | Abre/cierra la paleta de elementos de red. |
| **Tuberia Electrica** | Clic para iniciar conduit; cada clic agrega un punto (snap a multiples de 45°). Enter o doble clic para finalizar. |
| **Tuberia Agua** | Igual, pero snap solo a 90° (solo ortogonal, conforme NCh 2485). Selector de subtipo: Fria / Caliente. |
| **Tuberia Desague** | Igual, snap a 45°, evita codos de 90° (conforme NCh 1360). |

Al crear una pared, si el punto de inicio coincide con un endpoint existente, se muestra el angulo relativo al segmento conectado en tiempo real.

**Controles de visualizacion (derecha de la barra):**

| Boton | Funcion |
|-------|---------|
| Cuadricula | Toggle cuadricula SVG (pasos 0.5 m / 1 m) |
| Cotas | Toggle etiquetas de longitud sobre cada pared |
| Zonas | Toggle relleno de color por tipo de cuarto |
| Valid | Toggle validacion en tiempo real |
| Arq | Toggle capa arquitectonica (paredes, puertas, ventanas) |
| Elec | Toggle capa electrica |
| Agua | Toggle capa de agua |
| Des | Toggle capa de desague |

### Elementos de red

La paleta (boton "Red") lista 21 tipos en 4 grupos:

| Grupo | Elementos |
|-------|-----------|
| Electricidad | Tablero principal, Caja de conexion, Enchufe, Enchufe especial, Interruptor, Punto de luz |
| Agua | Entrada de agua, Llave de agua, Calefon / caldera |
| Agua+Desague | Ducha, Lavamanos / lavaplatos, Lavadora, WC |
| Desague | Salida de desague, Desague WC, Sifon de ducha, Sifon de lavamanos, Sumidero, Desague lavadora, Tapon de inspeccion, Camara domiciliaria |

- Selecciona un tipo en la paleta y haz clic en el canvas para colocarlo.
- **R**: rota el elemento 90° antes de colocarlo (acumulable).
- **Escape**: cancela la colocacion; vuelve a la herramienta Pared.
- Con herramienta **Cuartos** activa: los elementos de red se pueden seleccionar con clic y mover con arrastrar. **Delete** los borra.

### Auto-generacion de redes

Botones dentro de la seccion "Auto-generar red" en la paleta:

- **Electrica**: requiere tablero principal colocado. Genera cajas de distribucion por cuarto via MST, circuitos dedicados para enchufes especiales, maximo 3 salidas por caja (NCh Elec. 4/2003 / SEC).
- **Agua**: requiere entrada de agua colocada. Genera red fria (MST) y red caliente desde el calefon si existe (NCh 2485).
- **Desague**: requiere salida de desague colocada. WC en colector de 100 mm, resto en 50 mm, routing con angulos de 45° (NCh 1360).
- **Limpiar red**: elimina todos los segmentos generados automaticamente.

Si el algoritmo no puede generar la red (falta elemento requerido), muestra un aviso debajo de los botones.

### Validacion en tiempo real

Con el toggle **Valid** activo, el editor verifica y muestra marcadores sobre los elementos:

- Punto rojo (error): caja de conexion con mas de 3 salidas; codo de 90° en desague.
- Punto amarillo (advertencia): elemento sin conexion al tablero / entrada de agua / salida de desague; tuberia de agua diagonal.

Los resultados tambien aparecen en una lista resumida debajo del canvas (desplazable si hay muchos).

### Vistas del editor

- **Vista Superior**: canvas SVG editable con la planta del piso seleccionado. Muestra las dimensiones exteriores (ancho x profundidad en metros) y una barra de escala.
- **Fachada**: vista frontal esquematica no editable. Muestra los pisos, tipo de techo (plano / a dos aguas / a cuatro aguas / shed) y la anchura en metros.

### Tipos de cuarto disponibles

Habitacion, Bano, Lavanderia, Area comun, Exterior.

### Etiquetas de texto libres

Con la herramienta **Pared** activa, **Shift+Clic** (o **Ctrl+Clic**) sobre el canvas agrega una etiqueta de texto libre. Haz clic sobre la etiqueta para editarla; arrastrala para moverla.

### Atajos de teclado (editor de casa)

| Tecla | Accion |
|-------|--------|
| `R` | Rotar elemento de red 90° durante colocacion |
| `Enter` / doble clic | Finalizar tuberia en curso |
| `Delete` / `Backspace` | Borrar elemento de red o tuberia seleccionados |
| `Escape` | Cancelar dibujo en curso; volver a herramienta Pared |

---

## Auto-distribucion

**"Sugerir"** (toolbar, disponible con terreno terminado y al menos un elemento colocado): abre el panel flotante de propuestas.

### Panel de propuestas

- **Selector de algoritmo**: Auto (elige automaticamente segun el problema), Simulated Annealing, Algoritmo Genetico.
- **"Avanzado"** (checkbox): muestra parametros configurables del solver.
- **"Generar distribuciones"**: lanza el solver en un worker de fondo. Muestra progreso "Optimizando X/Y". Se pueden cancelar con el boton **"Cancelar"**.
- Se generan hasta 5 propuestas diversas (distancia RMS minima entre propuestas configurada en parametros avanzados), ordenadas por score (menor es mejor).

Cada propuesta muestra:
- **Vista miniatura** del terreno con los elementos y caminos propuestos.
- **Score**: valor de la funcion de costo (menor = mejor).
- Numero de **restricciones violadas**, si las hay.
- Botones:
  - **Aceptar**: aplica la propuesta definitivamente (guarda un punto de deshacer).
  - **Iterar**: refina esa propuesta con una ejecucion adicional del solver SA.
  - **Descartar**: elimina la propuesta de la lista.

Al hacer clic en una propuesta se previsualiza en el canvas principal (los elementos originales se restauran si se cierra el panel o se descarta).

### Parametros avanzados

| Parametro | Descripcion |
|-----------|-------------|
| Runs | Numero de ejecuciones independientes del solver |
| Diversidad min (m) | Distancia RMS minima entre propuestas para considerarlas distintas |
| Score factor | Margen relativo para admitir candidatos sub-optimos |
| **Simulated Annealing** | T0, Alpha, Iters/T, T min, Tiempo max (ms) |
| **Algoritmo Genetico** | Poblacion, Generaciones, Tasa mutacion, Tasa crossover, Tasa inmigrantes, Tiempo max (ms) |

---

## Panel de informacion

Panel lateral derecho, siempre visible. Muestra:

- **Terreno**: area (m²), perimetro (m), estado (abierto/cerrado) y lista de coordenadas de cada vertice en metros.
- **Elemento seleccionado**: nombre (editable con clic), dimensiones (ancho x alto o diametro) y area del elemento.
- **Camino seleccionado**: longitud total, numero de vertices y grosor.
- **Restricciones**: lista de todas las restricciones con su estado (cumplida / violada / desactivada), distancia actual vs requerida en caso de violacion. La lista puede agruparse por origen o por destino. Un resumen de badges muestra el total de violaciones, cumplidas y desactivadas.

---

## Guardado y exportacion

| Accion | Descripcion |
|--------|-------------|
| **Guardar** (Ctrl+S) | Sobreescribe el archivo actual sin dialogo (File System Access API en Chrome/Edge). Si no hay archivo abierto, abre el dialogo "Guardar como". En Firefox/Safari sin API, descarga el archivo. |
| **Guardar como...** | Abre siempre el dialogo de nombre y ubicacion. |
| **Abrir** | Abre un archivo `.hdist.json`. En sesiones posteriores, Ctrl+S sobreescribe ese archivo directamente. |
| **Exportar PDF** | Genera un PDF A4 apaisado con el plano (captura del canvas), resumen del terreno (area, perimetro) y lista de elementos colocados. |
| **Limpiar** | Borra el terreno, elementos, caminos y entrada del proyecto actual (no pide confirmacion). |

---

## Atajos de teclado

### Canvas principal

| Atajo | Accion |
|-------|--------|
| `Clic` | Agregar vertice al terreno / colocar elemento seleccionado / anadir punto al camino |
| `Space` | Cerrar poligono de terreno (con >=3 vertices) / finalizar camino en curso |
| `Enter` | Cerrar poligono de terreno (con >=3 vertices) |
| `Escape` | Cancelar operacion en curso / deseleccionar camino |
| `Delete` / `Backspace` | Eliminar el ultimo vertice (mientras se dibuja) / eliminar elemento seleccionado |
| `Shift+Delete` / `Shift+Backspace` | Resetear el canvas completo (terreno + elementos) |
| `Ctrl+Z` | Deshacer (50 niveles; afecta elementos, caminos y entrada) |
| `Ctrl+S` | Guardar |
| `Ctrl+D` | Duplicar elemento seleccionado (desplazado 1 m) |
| `Shift+S` | Toggle overlay solar |
| `M` | Toggle herramienta de medicion (Regla) |

### Editor de objeto personalizado

| Atajo | Accion |
|-------|--------|
| `Enter` | Cerrar el poligono (con >=3 vertices) |
| `Backspace` | Borrar el ultimo vertice |
| `Escape` | Cancelar y cerrar el modal |
| Rueda del raton | Zoom |

### Editor de casa (en el panel de detalle)

| Atajo | Accion |
|-------|--------|
| `R` | Rotar elemento de red 90° durante colocacion |
| `Enter` / doble clic | Finalizar tuberia en curso |
| `Delete` / `Backspace` | Borrar elemento de red o tuberia seleccionados |
| `Escape` | Cancelar dibujo en curso; volver a herramienta Pared |

---

## Formato de archivo

Los proyectos se guardan como `.hdist.json`. Estructura del documento:

```json
{
  "version": "2.0.0",
  "exportedAt": "<ISO timestamp>",
  "terrain": {
    "points": [{ "x": 0, "y": 0 }, ...],
    "finished": true,
    "entrance": { "edgeIndex": 0, "position": 0.5, "width": 2.5 }
  },
  "elements": [...],
  "paths": [...],
  "solar": { ... },
  "measurements": { ... },
  "customDefinitions": [...]
}
```

- **version**: semver. Version actual: `2.0.0`. Compatibilidad hacia atras con archivos v1 (campos planos sin seccion `terrain`).
- **terrain.points**: coordenadas en pixeles de capa (escala: 10 px = 1 m).
- **terrain.entrance**: posicion relativa (`position` = 0..1 a lo largo del borde) y ancho en metros.
- **elements**: cada elemento incluye id, definitionId, shape, x, y, width, height, radius, rotation, label, color y campo `detail` opcional con los datos especificos del tipo.
- **paths**: arreglo de caminos con sus puntos en metros, ancho y label.
- **solar**: configuracion de ubicacion, fecha/hora y opciones de visualizacion.
- **measurements**: mediciones activas y restricciones de distancia.
- **customDefinitions**: definiciones de elementos creados con el editor de forma libre.

Los campos desconocidos a nivel raiz se preservan al importar (round-trip safe). Los archivos con major version mayor que 2 no pueden abrirse y muestran un aviso.

---

## Stack

| | |
|---|---|
| UI | React 18 + Konva.js (canvas 2D) |
| Editor de casa | SVG renderizado en React |
| Build | Vite 4 |
| Estilos | Tailwind CSS 3 |
| Tests | Vitest + React Testing Library |
| Solar | SunCalc |
| PDF | jsPDF |

---

## Documentacion tecnica

Ver [`DEVELOPER_GUIDE.md`](./DEVELOPER_GUIDE.md) para documentacion completa orientada a desarrolladores: arquitectura, sistema de coordenadas, flujo de datos, utilidades, algoritmos, limitaciones y guia de extension.

---

*Proyecto iniciado el 21 de marzo de 2026.*
