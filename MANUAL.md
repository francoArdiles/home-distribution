# Manual de Usuario - Home Distribution

## Introducción

Home Distribution es una herramienta de planificación 2D que te permite diseñar la distribución de elementos en tu terreno. Considera la orientación solar, medidas precisas y relaciones espaciales para optimizar el uso del espacio.

## Interfaz Principal

### Barra Superior
- **Completar Terreno**: Finaliza el polígono del terreno (≥3 puntos)
- **Cuadrícula**: Muestra/oculta referencia de 10m
- **Solar**: Panel de orientación solar
- **Medidas**: Kit de herramientas de medición
- **Editar Terreno**: Modifica vértices existentes
- **Entrada**: Define punto de acceso
- **Guardar/Abrir**: Descarga/carga proyecto
- **Elemento Personalizado**: Crea elementos propios

### Paneles Laterales
- **Izquierdo**: Elementos por categoría (cuando terreno completado)
- **Derecho**: Información del terreno (vértices, área, perímetro)

## Terreno

### Crear
1. Haz clic en el lienzo para agregar puntos
2. Con ≥3 puntos, presiona Completar o cierra el polígono

### Editar
1. Presiona Editar Terreno
2. Arrastra vértices
3. Presiona Editar Terreno para salir

### Limpiar
- Presiona Limpiar para borrar todo

## Elementos

### Colocar
1. Terreno debe estar completado
2. Selecciona elemento en panel izquierdo
3. Haz clic en el lienzo

### Acciones
- **Mover**: Arrastra elemento seleccionado
- **Redimensionar**: Arrastra cuadrados verdes (muestra dimensiones en tiempo real)
- **Rotar**: Arrastra punto rojo en esquina superior derecha
- **Duplicar**: Ctrl+D (copia desplazada)
- **Eliminar**: Delete o Backspace

## Caminos/Senderos

### Crear
1. Panel izquierdo, sección Caminos
2. Selecciona grosor (0.5-5m)
3. Presiona Dibujar camino
4. Haz clic para agregar puntos (mínimo 2)
5. Presiona Espacio para terminar (ESC cancela)

### Editar
1. Haz clic en camino (se mostrará azul)
2. Arrastra vértices para mover puntos
3. Panel derecho: ajusta grosor o elimina
4. ESC para deseleccionar

## Medidas y Restricciones

### Abrir Panel
- Presiona botón Medidas

### Herramientas

**Regla**: Mide distancia entre puntos
1. Presiona Regla
2. Haz clic en dos puntos
3. Distancia aparece en tiempo real
4. ESC para salir

**Área**: Calcula área de polígono
1. Presiona Área
2. Haz clic para agregar vértices
3. Presiona Espacio para terminar
4. Área se calcula automáticamente

**Borrador**: Elimina medidas individuales
1. Presiona Borrador
2. Haz clic en medida para eliminar
3. ESC para salir

### Gestión
- **Limpiar**: Elimina todas las medidas
- **Mostrar/Ocultar**: Controla visibilidad
- **Restricciones**: Verde (cumplida), Rojo (violada)

## Orientación Solar

### Panel Solar
- Presiona botón Solar

### Configuración

**Ubicación**: Latitud y Longitud (ej: -33.9, -56.2)

**Fecha/Hora**: Selectores para actualizar trayectoria

**Opciones**:
- Mostrar cardinales (N, S, E, O)
- Mostrar trayectoria solar
- Mostrar sombras
- Norte arriba

### Sombras
Visibles cuando:
- Elemento dentro del terreno
- Mostrar sombras habilitado
- Altura configurada

## Guardado y Carga

### Guardar
1. Presiona Guardar
2. Se descarga JSON con timestamp
3. Contiene: terreno, elementos, caminos, medidas, solar, entrada

### Cargar
1. Presiona Abrir
2. Selecciona archivo JSON
3. Proyecto se restaura por completo

### Compatibilidad
Proyectos antiguos cargan con caminos vacíos.

## Atajos de Teclado

| Atajo     | Acción |
|-----------|--------|
| Espacio   | Termina polígono (terreno/área/camino) |
| ESC       | Cancela herramienta / deselecciona |
| S / s     | Alterna solar |
| M / m     | Alterna medidas |
| Ctrl+D    | Duplica elemento |
| Delete    | Elimina elemento |
| Ctrl+Z    | Deshace última acción |

## Consejos

### Distribución
1. Usa solar para decidir dónde colocar elementos
2. Usa área para comparar espacios
3. Crea caminos para visualizar flujo

### Distancias
1. Regla para medir distancias clave
2. Restricciones para distancia segura
3. Valida restricciones antes de finalizar

### Iteración
1. Guarda regularmente
2. Duplica elementos para probar
3. Carga versiones anteriores

## Solución de Problemas

**No puedo colocar elemento**
- Verifica que terreno está completado
- Elemento debe estar completamente dentro

**El cursor desaparece**
- Presiona ESC para deseleccionar herramienta

**Las medidas no se ven**
- Abre panel Medidas, verifica que Mostrar esté marcado

**Las sombras no aparecen**
- Verifica Mostrar sombras habilitado
- Elemento debe estar dentro del terreno

---

Manual actualizado: Abril 2026
Versión: 5 (caminos, undo Ctrl+Z, FloatingPanel mejorado)
