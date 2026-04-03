import React, { useState, useCallback, useEffect, useRef } from 'react';

const MIN_W = 200;
const MIN_H = 150;

/**
 * Panel flotante arrastrable y redimensionable.
 * El título actúa como handle de arrastre.
 * La esquina inferior-derecha actúa como handle de resize.
 *
 * Props:
 *   title       {string}           – texto del encabezado
 *   initialPos  {{ x, y }}         – posición inicial en px
 *   initialSize {{ w, h }}         – tamaño inicial en px (opcional)
 *   onClose     {function}         – callback al cerrar (omitir para ocultar el botón)
 *   className   {string}           – clases extra para el contenedor
 *   children    {ReactNode}        – contenido del cuerpo
 *   footer      {ReactNode}        – pie opcional
 */
export default function FloatingPanel({ title, initialPos, initialSize, onClose, className = '', children, footer }) {
  const [pos, setPos]   = useState(initialPos ?? { x: 200, y: 60 });
  const [size, setSize] = useState(initialSize ? { w: initialSize.w, h: initialSize.h } : null);

  const dragging  = useRef(false);
  const dragOff   = useRef({ x: 0, y: 0 });
  const resizing  = useRef(false);
  const resizeStart = useRef({ mouseX: 0, mouseY: 0, w: 0, h: 0 });
  const containerRef = useRef(null);

  // ── Drag (move) ──────────────────────────────────────────────────────────
  const onDragStart = useCallback((e) => {
    e.preventDefault();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    dragOff.current = { x: clientX - pos.x, y: clientY - pos.y };
    dragging.current = true;
    document.body.style.userSelect = 'none';
  }, [pos]);

  // ── Resize ───────────────────────────────────────────────────────────────
  const onResizeStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    const el = containerRef.current;
    const currentW = el ? el.offsetWidth  : (size?.w ?? MIN_W);
    const currentH = el ? el.offsetHeight : (size?.h ?? MIN_H);
    resizeStart.current = { mouseX: clientX, mouseY: clientY, w: currentW, h: currentH };
    resizing.current = true;
    document.body.style.userSelect = 'none';
  }, [size]);

  useEffect(() => {
    const onMove = (e) => {
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY;

      if (dragging.current) {
        setPos({
          x: clientX - dragOff.current.x,
          y: Math.max(0, clientY - dragOff.current.y),
        });
      }

      if (resizing.current) {
        const { mouseX, mouseY, w, h } = resizeStart.current;
        const newW = Math.max(MIN_W, w + (clientX - mouseX));
        const newH = Math.max(MIN_H, h + (clientY - mouseY));
        setSize({ w: newW, h: newH });
      }
    };

    const onUp = () => {
      dragging.current = false;
      resizing.current = false;
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend',  onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onUp);
    };
  }, []);

  const containerStyle = {
    left: pos.x,
    top:  pos.y,
    ...(size ? { width: size.w, height: size.h } : {}),
  };

  return (
    <div
      ref={containerRef}
      data-testid="floating-panel-container"
      className={`fixed z-[100] bg-white border border-gray-300 shadow-lg rounded overflow-hidden flex flex-col ${className}`}
      style={containerStyle}
    >
      {/* ── Drag handle / título ── */}
      <div
        className="flex items-center justify-between px-3 py-1.5 bg-gray-100 border-b border-gray-300 cursor-grab active:cursor-grabbing select-none shrink-0"
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
      <div className="overflow-auto flex-1">
        {children}
      </div>

      {/* ── Pie (opcional) ── */}
      {footer && (
        <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 shrink-0">
          {footer}
        </div>
      )}

      {/* ── Resize handle (esquina inferior derecha) ── */}
      <div
        data-testid="floating-panel-resize"
        onMouseDown={onResizeStart}
        onTouchStart={onResizeStart}
        style={{ cursor: 'se-resize' }}
        className="absolute bottom-0 right-0 w-4 h-4 flex items-end justify-end pb-0.5 pr-0.5"
        aria-label="Redimensionar"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M9 1L1 9M9 5L5 9M9 9" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
}
