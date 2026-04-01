import React, { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Panel flotante arrastrable.
 * El título actúa como handle de arrastre; el cuerpo tiene eventos normales.
 *
 * Props:
 *   title      {string}    – texto del encabezado
 *   initialPos {{ x, y }}  – posición inicial en px
 *   onClose    {function}  – callback al cerrar (omitir para ocultar el botón)
 *   className  {string}    – clases extra para el contenedor
 *   children   {ReactNode} – contenido del cuerpo
 */
export default function FloatingPanel({ title, initialPos, onClose, className = '', children }) {
  const [pos, setPos] = useState(initialPos ?? { x: 200, y: 60 });
  const dragging = useRef(false);
  const offset   = useRef({ x: 0, y: 0 });

  const onDragStart = useCallback((e) => {
    e.preventDefault();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    offset.current = { x: clientX - pos.x, y: clientY - pos.y };
    dragging.current = true;
    document.body.style.userSelect = 'none';
  }, [pos]);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY;
      setPos({
        x: clientX - offset.current.x,
        y: Math.max(0, clientY - offset.current.y),
      });
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  return (
    <div
      className={`fixed z-[100] bg-white border border-gray-300 shadow-lg rounded overflow-hidden ${className}`}
      style={{ left: pos.x, top: pos.y }}
    >
      {/* ── Drag handle / título ── */}
      <div
        className="flex items-center justify-between px-3 py-1.5 bg-gray-100 border-b border-gray-300 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
      >
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{title}</span>
        {onClose && (
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onClose}
            className="ml-3 text-gray-400 hover:text-gray-700 leading-none text-base"
            aria-label="Cerrar"
          >
            ×
          </button>
        )}
      </div>

      {/* ── Cuerpo ── */}
      <div>
        {children}
      </div>
    </div>
  );
}
