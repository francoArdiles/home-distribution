# Home Distribution

Aplicación web para diseñar y planificar la distribución de elementos en un terreno destinado a una vivienda autosustentable. Permite definir la forma irregular del terreno, posicionar y gestionar elementos (casa, piscina, huertos, árboles, etc.), visualizar el comportamiento solar y exportar el diseño.

## Características

### Terreno
- Dibuja polígonos irregulares libremente haciendo clic. Cierra el polígono con **Space**.
- Edita vértices después de terminado ("Ajustar terreno").
- Define la ubicación de la entrada/portón sobre cualquier borde del terreno.
- Cuadrícula opcional con snap automático.

### Elementos
- Biblioteca predefinida con 14 tipos de elementos en 4 categorías: hogar, jardín, animales, sostenibilidad.
- Crea elementos personalizados de forma poligonal libre con el editor SVG integrado.
- Coloca, mueve, redimensiona y rota elementos con handles visuales.
- Renombra elementos haciendo clic sobre su nombre en el panel de información.
- Duplica con **Ctrl+D**; elimina con **Delete/Backspace**.
- 50 niveles de deshacer con **Ctrl+Z**.
- Atributos detallados por tipo: piscina (profundidad, revestimiento, escalones), casa (pisos, habitaciones, tipo de techo), huerto (tipo de cultivo, riego, sustrato).

### Solar y sombras
- Configura ubicación geográfica, fecha y hora.
- Visualiza el arco del sol y la posición actual del sol sobre el terreno.
- Proyección de sombras en tiempo real para cada elemento, con altura configurable por tipo.
- Toggle rápido con **Shift+S**.

### Restricciones y mediciones
- Define restricciones de distancia mínima entre cualquier par de elementos o entre un elemento y el terreno.
- Visualización en vivo de violaciones (borde rojo en el elemento, indicador en el panel de información).
- Herramienta de medición manual de distancias y áreas sobre el plano.

### Caminos
- Traza caminos de ancho configurable con múltiples vértices.
- Muestra longitud total sobre el camino.
- Edita el ancho o elimina caminos con el panel de edición contextual.

### Guardado y exportación
- **Guardar** (Ctrl+S): sobreescribe el archivo actual sin diálogo (File System Access API en Chrome/Edge; descarga en Firefox/Safari).
- **Guardar como...**: elige nombre y ubicación.
- **Abrir**: carga un archivo `.hdist.json` existente. Ctrl+S sobreescribe ese archivo automáticamente en sesiones posteriores.
- **Exportar PDF**: genera un PDF A4 apaisado con el plano, resumen del terreno y lista de elementos.

## Inicio rápido

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm run build      # Build de producción en dist/
npm run test       # Ejecutar los 512 tests unitarios
```

## Atajos de teclado

| Atajo | Acción |
|---|---|
| `Space` | Cerrar polígono de terreno / finalizar camino |
| `Escape` | Cancelar operación en curso |
| `Ctrl+Z` | Deshacer |
| `Ctrl+S` | Guardar |
| `Ctrl+D` | Duplicar elemento seleccionado |
| `Delete` / `Backspace` | Eliminar elemento seleccionado |
| `Shift+S` | Toggle overlay solar |
| `M` | Toggle herramienta de medición |

## Stack

| | |
|---|---|
| UI | React 18 + Konva.js (canvas 2D) |
| Build | Vite 4 |
| Estilos | Tailwind CSS 3 |
| Tests | Vitest + React Testing Library |
| Solar | SunCalc |
| PDF | jsPDF |

## Formato de archivo

Los proyectos se guardan como `.hdist.json`. El formato está versionado (actual: v2.0.0) con compatibilidad hacia atrás para archivos v1.

## Documentación técnica

Ver [`DEVELOPER_GUIDE.md`](./DEVELOPER_GUIDE.md) para documentación completa orientada a desarrolladores: arquitectura, sistema de coordenadas, flujo de datos, utilidades, algoritmos, limitaciones y guía de extensión.

---

*Proyecto iniciado el 21 de marzo de 2026.*
