# Fase 1: Definición del terreno y lienzo básico

## Objetivo
Crear el lienzo de trabajo donde el usuario puede definir la forma y tamaño del terreno de manera libre e intuitiva.

## Detalles de implementación

### Requisitos funcionales
- Permitir al usuario dibujar un polígono irregular que represente el contorno del terreno.
- El polígono debe tener al menos 3 vértices.
- Los vértices se pueden agregar haciendo clic en el lienzo.
- Opción para cerrar el polígono automáticamente al hacer clic en el primer vértice o mediante presionar Enter.
- Posibilidad de editar vértices existentes (mover, eliminar, agregar nuevos).
- Mostrar el área y perímetro calculados del terreno en tiempo real.
- El lienzo debe tener una escala ajustable (por ejemplo, 1 unidad = 1 metro).
- Fondo del lienzo con cuadrícula opcional para referencia.
- No permitir polígonos auto-intersectantes.
- El polígono se cierra automáticamente al finalizar con Enter.
- Tecla Escape para cancelar el dibujo actual.
- Tecla Backspace/Delete para eliminar el último punto agregado.
- Tolerancia de 2 píxeles para detectar clics en vértices existentes al moverlos.
- Ignorar clics fuera del lienzo durante el dibujo de polígono.
- Permitir zoom y pan (arrastrar) del lienzo.

### Tecnologías sugeridas
- **Frontend**: Utilizar una librería de canvas como Konva.js, Fabric.js o React-Konva si se usa React.
- Alternativa: SVG con manipulación directa del DOM para mayor simplicidad.
- **State management**: Estado local del componente (React useState, Vue data, o vanilla JS con un objeto de estado).

### Componentes principales
1. **CanvasContainer**: Contenedor que maneja el tamaño y escala del lienzo.
2. **TerrainPolygon**: Componente que representa el polígono del terreno, maneja puntos de control.
3. **Toolbar**: Botones para acciones como "Agregar vértice", "Eliminar vértice", "Finalizar terreno", "Mostrar/Ocultar cuadrícula".
4. **InfoPanel**: Panel que muestra métricas del terreno (área, perímetro, coordenadas de vértices).

### Algoritmos y cálculos
- **Cálculo de área polígono irregular**: Fórmula del shoelace (Gauss).
- **Cálculo de perímetro**: Suma de distancias entre vértices consecutivos.
- **Validación de polígono simple**: Evitar auto-intersecciones.
- **Conversión de coordenadas**: Escalar entre píxeles de lienzo y metros reales (10px = 1m por defecto).

### Estado de datos
```javascript
terrain = {
  vertices: [ {x: number, y: number} ], // coordenadas en el lienzo (en píxeles)
  scale: number, // píxeles por metro real (ej: 10 px = 1 m)
  gridVisible: boolean,
  gridSize: number // tamaño de cuadrícula en metros reales
}
```

### Especificaciones visuales
- **Polígono de terreno**: Borde marrón (sin relleno por ahora, MVP)
- **Puntos de control**: Círculos rojos
- **Línea de prévisualización**: Azul discontinua (dashed)
- **Tooltip**: Fondo blanco con texto normal
- **Precisión de medidas mostradas**: 1 decimal (ej: 12.3m)

### Eventos de usuario
- `click` en lienzo: agregar nuevo vértice (si está en modo edición) o seleccionar vértice existente para mover.
- `drag` en vértice: mover vértice y actualizar polígono.
- `keydown Enter`: cerrar polígono y finalizar entrada (si tiene al menos 3 vértices).
- `keydown Escape`: cancelar dibujo actual y limpiar puntos temporales.
- `keydown Backspace/Delete`: eliminar último punto agregado (si hay más de 0 puntos).
- `click` en botón "Finalizar terreno": cerrar polígono y bloquear edición (o mantener edición continua).

### Consideraciones de usabilidad
- Feedback visual al pasar el cursor sobre el lienzo (mostrar coordenadas actuales).
- Indicador de cuándo el polígono está cerrado.
- Mensajes de error si se intenta crear un polígono no válido (menos de 3 puntos, auto-intersección).
- Mostrar longitud del segmento actual como tooltip al hacer hover sobre la línea de prévisualización.
- Mostrar longitud de los lados del polígono terminado como tooltip al hacer hover sobre cada segmento.
- Zoom y pan del lienzo habilitados.

### Extensiones futuras (post-MVP)
- Importar terreno desde archivo de coordenadas (GeoJSON, KML).
- Superponer imagen satelital o plano escaneado como fondo de referencia.
- Definir múltiples zonas (ej: zona de cultivo, zona de recreación) con estilos diferentes.
- Cambiar entre unidades métricas e imperiales.