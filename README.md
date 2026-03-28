# Home Distribution

## Descripción
Aplicación web para diseñar y planificar la distribución de elementos en un terreno destinado a una vivienda autosustentable. Permite a usuarios definir la forma y tamaño irregular de su terreno, posicionar elementos clave (casa, piscina, huertos, gallineros, etc.) mediante arrastre y soltar, considerando orientación solar, puntos cardinales y relaciones espaciales para optimizar el uso del espacio.

## Problema que resuelve
Una persona adquiere un terreno grande y desea crear un hábitat autosustentable que incluya vivienda, cultivo de alimentos, animales, agua y recreación. El desafío consiste en:
- Distribuir eficientemente elementos diversos en un terreno de forma irregular
- Asegurar que cada elemento tenga suficiente espacio y condiciones adecuadas (sol, sombra, drenaje)
- Visualizar relaciones espaciales y distancias entre componentes
- Adaptar el diseño a la topografía y orientación específica del terreno

## Características principales
- **Terreno personalizable**: Definir polígonos irregulares que representen la forma real del terreno
- **Elementos arrastrables**: Casa, piscina, huertos, gallineros, árboles frutales, etc., con dimensiones ajustables
- **Orientación solar**: Visualización de trayectoria del sol según ubicación geográfica y época del año
- **Medidas precisas**: Mostrar distancias entre elementos y límites del terreno
- **Modo plano 2D**: Interfaz intuitiva de diseño tipo CAD simplificado
- **Exportación/importación**: Guardar y cargar diseños para iteración y colaboración

## Tecnologías planeadas
- Frontend: React o Vue.js con canvas/librería de dibujo (Konva.js, Fabric.js o similar)
- Backend: Node.js/Express o Python/FastAPI (opcional para guardado en nube)
- Almacenamiento: LocalStorage inicialmente, con opción de base de datos
- Deploy: Vercel, Netlify o similar para versión estática

## Próximos pasos (MVP)
1. Implementar lienzo de terreno con herramientas de polígono libre
2. Crear biblioteca de elementos predefinidos con propiedades (tamaño mínimo, necesidades de sol/sombra)
3. Habilitar arrastre y solte de elementos con alineación a cuadrícula opcional
4. Añadir indicadores de trayectoria solar (amanecer/atardecer según estación)
5. Implementar medición dinámica entre elementos y bordes
6. Diseñar interfaz limpia y accesible

## ¿Por qué esta aplicación?
Los métodos tradicionales (papel cuadriculado, software de arquitectura complejo) no están optimizados para:
- Diseñadores no profesionales
- Iteración rápida de distribuciones
- Consideración integrada de factores ecológicos y solares
- Enfoque en autosuficiencia y permacultura

Esta herramienta busca llenar ese vacío con un enfoque específico, visual y práctico para quienes sueñan con vivir de la tierra de manera sostenible.

---
*Proyecto iniciado en zero-workspace el 21 de marzo de 2026*