# Plan de Desarrollo: Home Distribution

## Visión General
Este documento resume las fases de desarrollo planificadas para la aplicación **Home Distribution**, una herramienta web diseñada para ayudar a usuarios a planificar la distribución de elementos en terrenos destinados a viviendas autosustentables. El enfoque es modular e incremental, donde cada fase construye sobre la anterior para entregar un producto mínimo viable (MVP) funcional y luego extenderlo hacia capacidades más avanzadas.

El proyecto está pensado para uso personal o de pequeños equipos, por lo que no se consideran aspectos de despliegue a producción masiva, escalabilidad enterprise o características de colaboración en tiempo real complejas. El enfoque está en la solidez técnica, claridad de código y facilidad de extensión por parte de desarrolladores individuales o modelos de lenguaje grande (LLMs) que puedan continuar el desarrollo.

## Fases de Desarrollo

### Fase 1: Definición del terreno y lienzo básico
**Archivo:** `01_terreno_y_lienzo.md`
**Objetivo:** Establecer el lienzo de trabajo donde el usuario define la forma y tamaño del terreno mediante un polígono irregular.
**Entregables clave:**
- Lienzo con herramientas para dibujar, editar y finalizar polígonos de terreno.
- Cálculo en tiempo real de área y perímetro.
- Escala ajustable y cuadrícula opcional para referencia.
- Estado de datos que almacena vértices, escala y configuración de cuadrícula.
**Tecnologías sugeridas:** Konva.js/Fabric.js o SVG vanilla.
**Dependencias:** Ninguna (fase inicial).
**Próximos pasos:** Esta fase proporciona la base espacial sobre la cual se colocarán todos los elementos subsiguientes.

### Fase 2: Elementos arrastrables básicos
**Archivo:** `02_elementos_arrastrables.md`
**Objetivo:** Implementar la biblioteca de elementos (casa, piscina, huertos, etc.) que el usuario puede colocar, redimensionar y manipular en el terreno.
**Entregables clave:**
- Biblioteca de elementos predefinidos con formas, dimensiones y propiedades específicas.
- Mecanismo de arrastre y solte, redimensionamiento mediante handles y rotación opcional.
- Detección de colisión para asegurar que elementos queden dentro del terreno y no se solapen.
- Panel de selección de elementos y manejo de selección para edición.
**Entregables de datos:** Definiciones de elementos y elementos colocados con propiedades sobrescritas.
**Tecnologías sugeridas:** Extensión de la librería de canvas de la Fase 1.
**Dependencias:** Requiere el lienzo y terreno definidos en Fase 1.
**Próximos pasos:** Esta fase permite al usuario poblar el terreno con los componentes clave de su diseño autosustentable.

### Fase 3: Orientación solar y puntos cardinales
**Archivo:** `03_orientacion_solar_y_puntos_cardinales.md`
**Objetivo:** Añadir conciencia solar y geográfica al diseño mediante la visualización de trayectoria solar, puntos cardinales y análisis de sombras.
**Entregables clave:**
- Selección de ubicación geográfica (latitud/longitud) y fecha/hora.
- Cálculo de posición solar (acimut, elevación) usando algoritmos astronómicos establecidos.
- Visualización de trayectoria solar, indicadores cardinales y sombras proyectadas por elementos.
- Análisis de exposición solar para determinar horas de sol directo recibidas por puntos o elementos.
**Entregables de datos:** Configuración solar, datos de posición solar, polígonos de sombra y métricas de exposición.
**Tecnologías sugeridas:** Librería `suncalc` o implementación de fórmulas de NOAA.
**Dependencias:** Requiere elementos colocados (Fase 2) para calcular sombras y exposición.
**Próximos pasos:** Esta fase agrega una capa crítica de análisis ambiental que informa decisiones de ubicación de elementos basado en necesidades de sol y sombra.

### Fase 4: Medidas y relaciones espaciales
**Archivo:** `04_medidas_y_relaciones_espaciales.md`
**Objetivo:** Implementar herramientas de medición, validación de restricciones y análisis de relaciones espaciales para asegurar un diseño funcional y conforme a requerimientos.
**Entregables clave:**
- Herramientas de medición (regla, área, ángulo) con retroalimentación en tiempo real.
- Sistema de restricciones de distancia (mínimas/máximas) entre elementos y límites.
- Detección de violaciones de restricciones con indicadores visuales.
- Medición de áreas personalizadas y análisis de ancho de paso.
- Capacidad para definir reglas de distancia personalizadas.
**Entregables de datos:** Configuración de mediciones activas, restricciones definidas y resultados de validación.
**Tecnologías sugeridas:** Algoritmos de geometría computacional para distancias entre formas.
**Dependencias:** Requiere terreno (Fase 1), elementos (Fase 2) y opcionalmente análisis solar (Fase 3) para mediciones contextualizadas.
**Próximos pasos:** Esta fase brinda las herramientas de precisión y validación necesarias para convertir un diseño conceptual en un plan ejecutable y seguro.

## Enfoque de Desarrollo

### Principios Rectores
1. **Modularidad:** Cada fase entrega un conjunto coherente de funcionalidades que pueden desarrollarse, probarse y entenderse de forma relativamente independiente.
2. **Incrementalidad:** El MVP se alcanza tras completar las Fases 1 y 2 (terreno navegable + elementos colocables). Las Fases 3 y 4 añaden capas de análisis y precisión que incrementan significativamente el valor sin ser estrictamente necesarias para una versión básica.
3. **Testabilidad:** Cada fase incluye sugerencias para pruebas unitarias enfocadas en algoritmos clave (cálculos de área, distancia, posición solar, detección de colisión).
4. **Extensibilidad:** El diseño de datos y componentes está pensado para facilitar la adición de nuevos tipos de elementos, reglas de restricción o análisis futuros.
5. **Usabilidad técnica:** Se prioriza la claridad del código, comentarios explicativos y separación de preocupaciones para facilitar el mantenimiento y la continuación por otros desarrolladores o LLMs.

### Flujo de Trabajo Sugerido
1. **Completar Fase 1:** Tener un lienzo donde se pueda dibujar y editar terrenos irregulares con métricas básicas.
2. **Completar Fase 2:** Poder colocar, mover, redimensionar y rotar elementos básicos dentro del terreno definido.
3. **En este punto, se tiene un MVP funcional:** Un usuario puede diseñar una distribución básica de su terreno autosustentable.
4. **Completar Fase 3:** Añadir conciencia solar para optimizar ubicación de elementos basado en necesidades de luz y sombra.
5. **Completar Fase 4:** Añadir herramientas de medición y validación para asegurar que el diseño cumple con requisitos espaciales y normativos.

### Consideraciones Técnicas
- **Estado de la aplicación:** Se sugiere mantener un estado centralizado (ya sea mediante Context API/Redux si se usa React, Vuex/Pinia para Vue, o un simple patrón de suscripción para vanilla JS) que contenga:
  - Configuración del terreno (vértices, escala)
  - Lista de elementos colocados con sus propiedades
  - Configuración solar (ubicación, fecha/hora)
  - Medidas activas y restricciones definidas
  - Estado de UI (herramienta activa, elemento seleccionado, etc.)
- **Renderizado:** El canvas debe volver a renderizarse eficientemente cuando cambie cualquier parte del estado. Se recomienda usar técnicas de memoización o renderizado diferencial si se nota lentitud.
- **Persistencia:** Para uso personal, el guardado en LocalStorage es suficiente. La estructura de estado debe ser fácilmente serializable a JSON.
- **Escalabilidad de complejidad:** Las fases están ordenadas de menor a mayor complejidad algorítmica:
  - Fase 1: Geometría básica (polígonos, área Shoelace)
  - Fase 2: Detección de colisión (rectángulos/círculos)
  - Fase 3: Cálculos astronómicos y proyección de sombras
  - Fase 4: Algoritmos de distancia entre formas complejas y validación de restricciones

## Extensiones Futuras (Post-MVP)
Aunque el enfoque está en entregar un MVP sólido, estas son áreas naturales para expansión futura:
- **Análisis avanzado:** Simulación de crecimiento de plantas, análisis de agua y drenaje, cálculo de rendimiento de cultivos.
- **Personalización de elementos:** Permitir al usuario definir sus propios tipos de elementos con propiedades arbitrarias.
- **Integración de datos externos:** Importar planos escaneados, usar datos de elevación (DEM) para terreno no plano, integrar pronósticos meteorológicos.
- **Optimización sugerida:** Algoritmos que recomienden ubicaciones óptimas para elementos basado en múltiples criterios (sol, distancia, acceso).
- **Modo 3D/Vista elevada:** Representación básica en elevación o vista isométrica para mejor comprensión espacial.
- **Plantillas y ejemplos:** Biblioteca de diseños predefinidos para diferentes tamaños de terreno y objetivos autosustentables.
- **Impresión y exportación:** Generar PDFs con planos a escala, listas de materiales o guías de implementación.
- **Accesibilidad:** Mejorar soporte para teclado, lectores de pantalla y navegación sin mouse.

## Conclusión
Este plan de desarrollo proporciona un camino claro y estructurado para crear una aplicación web útil y técnicamente sólida para el diseño de terrenos autosustentables. Al seguir este enfoque fase por fase, se asegura que cada entrega aporte valor inmediato mientras se construye hacia un sistema cada vez más capaz y sofisticado. El énfasis en algoritmos claros, estado bien definido y extensibilidad hace que el proyecto sea adecuado tanto para desarrolladores humanos como para continuation por modelos de lenguaje grande que puedan leer estos documentos y contribuir al código.

---
*Plan generado para zero-projects/home-distribution el 21 de marzo de 2026*