import React, { useState, useCallback, useEffect, useRef } from 'react';
import { getPolyBbox } from '../data/elementDefinitions.js';

const CATEGORIES = [
  { id: 'hogar',          name: 'Hogar' },
  { id: 'jardin',         name: 'Jardín' },
  { id: 'animales',       name: 'Animales' },
  { id: 'sostenibilidad', name: 'Sostenibilidad' },
];

const SVG_W = 420;
const SVG_H = 300;
const INIT_ZOOM = 20;   // px per meter
const SNAP_M   = 0.5;
const MIN_ZOOM = 5;
const MAX_ZOOM = 100;

const snap = (v) => Math.round(v / SNAP_M) * SNAP_M;

const angle3 = (prev, vertex, next) => {
  const v1 = { x: prev.x - vertex.x, y: prev.y - vertex.y };
  const v2 = { x: next.x - vertex.x, y: next.y - vertex.y };
  const l1 = Math.hypot(v1.x, v1.y), l2 = Math.hypot(v2.x, v2.y);
  if (!l1 || !l2) return null;
  const cos = Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / (l1 * l2)));
  return (Math.acos(cos) * 180) / Math.PI;
};

const shoelaceArea = (pts) => {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    s += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(s) / 2;
};

export default function CustomElementModal({ onSave, onCancel }) {
  const [name, setName]               = useState('');
  const [category, setCategory]       = useState('hogar');
  const [color, setColor]             = useState('#cccccc');
  const [borderColor, setBorderColor] = useState('#888888');
  const [points, setPoints]           = useState([]);
  const [mouse, setMouse]             = useState(null);
  const [rawMouse, setRawMouse]       = useState(null);
  const [done, setDone]               = useState(false);
  const [zoom, setZoom]               = useState(INIT_ZOOM);
  const [origin, setOrigin]           = useState({ x: SVG_W / 2, y: SVG_H / 2 });
  const svgRef = useRef(null);

  const toSvg = useCallback((mx, my) => ({ x: mx * zoom + origin.x, y: my * zoom + origin.y }), [zoom, origin]);
  const toM   = useCallback((px, py) => ({ x: (px - origin.x) / zoom, y: (py - origin.y) / zoom }), [zoom, origin]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    setZoom(prevZoom => {
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prevZoom * factor));
      setOrigin(prevOrigin => ({
        x: px - (px - prevOrigin.x) * (newZoom / prevZoom),
        y: py - (py - prevOrigin.y) * (newZoom / prevZoom),
      }));
      return newZoom;
    });
  }, []);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const n = points.length;
  const isNearFirst = !done && rawMouse && n >= 3 && (() => {
    const f = toSvg(points[0].x, points[0].y);
    return Math.hypot(rawMouse.x - f.x, rawMouse.y - f.y) < 16;
  })();

  const handleSvgMouseMove = useCallback((e) => {
    if (done) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    setRawMouse({ x: px, y: py });
    const m = toM(px, py);
    setMouse({ x: snap(m.x), y: snap(m.y) });
  }, [done, toM]);

  const handleSvgClick = useCallback((e) => {
    if (done) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    if (n >= 3) {
      const f = toSvg(points[0].x, points[0].y);
      if (Math.hypot(px - f.x, py - f.y) < 16) { setDone(true); return; }
    }
    const m = toM(px, py);
    setPoints(prev => [...prev, { x: snap(m.x), y: snap(m.y) }]);
  }, [done, n, points, toSvg, toM]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Enter' && n >= 3 && !done) setDone(true);
      else if (e.key === 'Backspace' && !done) setPoints(prev => prev.slice(0, -1));
      else if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [n, done, onCancel]);

  const handleSave = () => {
    if (!name.trim() || n < 3 || !done) return;
    const cx = points.reduce((s, p) => s + p.x, 0) / n;
    const cy = points.reduce((s, p) => s + p.y, 0) / n;
    const centered = points.map(p => ({
      x: parseFloat((p.x - cx).toFixed(3)),
      y: parseFloat((p.y - cy).toFixed(3)),
    }));
    const bbox = getPolyBbox(centered);
    onSave({
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      shape: 'polygon',
      points: centered,
      defaultWidth:  parseFloat(bbox.width.toFixed(2)),
      defaultHeight: parseFloat(bbox.height.toFixed(2)),
      color, borderColor, borderWidth: 2,
      category, isCustom: true,
      properties: { sunNeeds: 'none', waterNeeds: 'none', minSpacing: 0 },
    });
  };

  // Grid lines
  const gridLines = [];
  for (let x = Math.floor(-origin.x / zoom); x <= Math.ceil((SVG_W - origin.x) / zoom); x++) {
    const sx = toSvg(x, 0).x;
    gridLines.push(<line key={`gv${x}`} x1={sx} y1={0} x2={sx} y2={SVG_H}
      stroke={x === 0 ? '#bbb' : '#eee'} strokeWidth={x === 0 ? 1 : 0.5} />);
  }
  for (let y = Math.floor(-origin.y / zoom); y <= Math.ceil((SVG_H - origin.y) / zoom); y++) {
    const sy = toSvg(0, y).y;
    gridLines.push(<line key={`gh${y}`} x1={0} y1={sy} x2={SVG_W} y2={sy}
      stroke={y === 0 ? '#bbb' : '#eee'} strokeWidth={y === 0 ? 1 : 0.5} />);
  }

  // Edge length labels
  const edgeLabels = [];
  const addEdgeLabel = (a, b, key) => {
    const dx = b.x - a.x, dy = b.y - a.y;
    const lenM = Math.hypot(dx, dy);
    if (lenM < 0.2) return;
    const mid = toSvg((a.x + b.x) / 2, (a.y + b.y) / 2);
    const nl = lenM, nx = -dy / nl, ny = dx / nl;
    edgeLabels.push(
      <text key={key} x={mid.x + nx * 14} y={mid.y + ny * 14}
        fontSize={10} fill="#1565c0" textAnchor="middle" dominantBaseline="middle"
        style={{ pointerEvents: 'none' }}>
        {lenM.toFixed(2)}m
      </text>
    );
  };
  if (done) {
    points.forEach((p, i) => addEdgeLabel(p, points[(i + 1) % n], `el${i}`));
  } else {
    points.forEach((p, i) => { if (i > 0) addEdgeLabel(points[i - 1], p, `el${i}`); });
    if (mouse && n > 0) addEdgeLabel(points[n - 1], mouse, 'el-prev');
  }

  // Angle labels
  const angleLabels = [];
  const addAngleLabel = (prev, vertex, next, key) => {
    const a = angle3(prev, vertex, next);
    if (a === null) return;
    const sp = toSvg(vertex.x, vertex.y);
    const v1 = { x: prev.x - vertex.x, y: prev.y - vertex.y };
    const v2 = { x: next.x - vertex.x, y: next.y - vertex.y };
    const l1 = Math.hypot(v1.x, v1.y), l2 = Math.hypot(v2.x, v2.y);
    const bx = v1.x / l1 + v2.x / l2, by = v1.y / l1 + v2.y / l2;
    const bl = Math.hypot(bx, by) || 1;
    const offset = zoom * 1.1;
    angleLabels.push(
      <text key={key} x={sp.x + (bx / bl) * offset} y={sp.y + (by / bl) * offset}
        fontSize={9} fill="#e65100" textAnchor="middle" dominantBaseline="middle"
        style={{ pointerEvents: 'none' }}>
        {Math.round(a)}°
      </text>
    );
  };
  if (done) {
    points.forEach((p, i) =>
      addAngleLabel(points[(i - 1 + n) % n], p, points[(i + 1) % n], `ang${i}`)
    );
  } else {
    points.forEach((p, i) => {
      const prev = i > 0 ? points[i - 1] : null;
      const next = i < n - 1 ? points[i + 1] : (i === n - 1 && mouse ? mouse : null);
      if (prev && next) addAngleLabel(prev, p, next, `ang${i}`);
    });
  }

  const svgPolygonPts = points.map(p => { const s = toSvg(p.x, p.y); return `${s.x},${s.y}`; }).join(' ');
  const areaM2 = done && n >= 3 ? shoelaceArea(points).toFixed(1) : null;
  const canSave = name.trim().length > 0 && n >= 3 && done;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
      <div className="bg-white rounded-xl p-5 w-[490px] shadow-2xl flex flex-col gap-3 text-sm">
        <h3 className="m-0 text-base font-semibold text-gray-800">Crear objeto personalizado</h3>

        {/* Form fields */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Cobertizo"
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Categoría</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="form-select"
            >
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Color de relleno</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-8 h-7 p-0 border border-gray-300 rounded cursor-pointer"
              />
              <span className="text-xs text-gray-500">{color}</span>
            </div>
          </div>
          <div>
            <label className="form-label">Color de borde</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={borderColor}
                onChange={e => setBorderColor(e.target.value)}
                className="w-8 h-7 p-0 border border-gray-300 rounded cursor-pointer"
              />
              <span className="text-xs text-gray-500">{borderColor}</span>
            </div>
          </div>
        </div>

        {/* Drawing area */}
        <div>
          <div className="text-xs text-gray-500 mb-1.5">
            {done
              ? `Polígono cerrado — ${n} vértices · ${areaM2} m²`
              : n === 0
              ? 'Haz clic para agregar vértices (1 cuadro = 1 m, snap 0.5 m)'
              : n < 3
              ? `${n} vértice${n > 1 ? 's' : ''} — agrega al menos ${3 - n} más`
              : 'Clic en el primer vértice (●) o presiona Enter para cerrar'}
          </div>
          <svg
            ref={svgRef}
            width={SVG_W}
            height={SVG_H}
            className="border border-gray-300 rounded block"
            style={{ cursor: done ? 'default' : 'crosshair' }}
            onMouseMove={handleSvgMouseMove}
            onClick={handleSvgClick}
            onMouseLeave={() => { setMouse(null); setRawMouse(null); }}
          >
            {gridLines}

            <line x1={8} y1={SVG_H - 8} x2={8 + zoom} y2={SVG_H - 8} stroke="#aaa" strokeWidth={1.5} />
            <text x={8 + zoom / 2} y={SVG_H - 16} fontSize={9} fill="#aaa" textAnchor="middle">1 m</text>

            {done && n >= 3 && (
              <polygon points={svgPolygonPts} fill={color} stroke={borderColor} strokeWidth={2} />
            )}

            {!done && points.map((p, i) => {
              if (i === 0) return null;
              const s1 = toSvg(points[i - 1].x, points[i - 1].y);
              const s2 = toSvg(p.x, p.y);
              return <line key={`e${i}`} x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y}
                stroke="#8B4513" strokeWidth={2} />;
            })}

            {edgeLabels}
            {angleLabels}

            {!done && mouse && n > 0 && (() => {
              const last = points[n - 1];
              const s1 = toSvg(last.x, last.y);
              const s2 = toSvg(mouse.x, mouse.y);
              const sf = toSvg(points[0].x, points[0].y);
              return (<>
                <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y}
                  stroke={isNearFirst ? '#4CAF50' : '#2196F3'} strokeWidth={1.5} strokeDasharray="5,3" />
                {n >= 2 && (
                  <line x1={sf.x} y1={sf.y} x2={s2.x} y2={s2.y}
                    stroke="#4CAF50" strokeWidth={1} strokeDasharray="3,3" opacity={0.35} />
                )}
              </>);
            })()}

            {points.map((p, i) => {
              const s = toSvg(p.x, p.y);
              const first = i === 0;
              return <circle key={`v${i}`} cx={s.x} cy={s.y} r={first ? 6 : 4}
                fill={first && isNearFirst ? '#4CAF50' : 'red'} stroke="white" strokeWidth={1.5} />;
            })}

            {!done && mouse && (
              <circle cx={toSvg(mouse.x, mouse.y).x} cy={toSvg(mouse.x, mouse.y).y}
                r={3} fill="none" stroke="#2196F3" strokeWidth={1} opacity={0.7} />
            )}
          </svg>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onCancel} className="btn">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="btn-primary"
          >
            Guardar objeto
          </button>
        </div>
      </div>
    </div>
  );
}
