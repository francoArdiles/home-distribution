import React from 'react';
import FloatingPanel from './FloatingPanel.jsx';

const MiniPreview = ({ proposal, terrainMeters }) => {
  if (!terrainMeters || terrainMeters.length < 3) return null;
  const xs = terrainMeters.map(p => p.x);
  const ys = terrainMeters.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = Math.max(maxX - minX, 1);
  const h = Math.max(maxY - minY, 1);
  const W = 120, H = 80;
  const scale = Math.min(W / w, H / h) * 0.9;
  const ox = (W - w * scale) / 2 - minX * scale;
  const oy = (H - h * scale) / 2 - minY * scale;
  const tx = (x) => ox + x * scale;
  const ty = (y) => oy + y * scale;

  return (
    <svg width={W} height={H} style={{ background: '#fafafa', border: '1px solid #ddd' }}>
      <polygon
        points={terrainMeters.map(p => `${tx(p.x)},${ty(p.y)}`).join(' ')}
        fill="#e8f5e9"
        stroke="#388e3c"
        strokeWidth="0.5"
      />
      {(proposal.paths || []).map(p => (
        <polyline
          key={p.id}
          points={p.points.map(pt => `${tx(pt.x)},${ty(pt.y)}`).join(' ')}
          stroke="#8B6914"
          strokeWidth={Math.max(0.5, p.width * scale * 0.3)}
          fill="none"
          opacity="0.6"
        />
      ))}
      {proposal.elements.map(el => {
        const ew = (el.rotation === 90 ? el.height : el.width) * scale;
        const eh = (el.rotation === 90 ? el.width : el.height) * scale;
        if (el.shape === 'circle') {
          const r = (el.radius || el.width / 2) * scale;
          return <circle key={el.id} cx={tx(el.x)} cy={ty(el.y)} r={r} fill="#9ccc65" stroke="#33691e" strokeWidth="0.5" />;
        }
        return (
          <rect
            key={el.id}
            x={tx(el.x) - ew / 2}
            y={ty(el.y) - eh / 2}
            width={ew}
            height={eh}
            fill="#bcaaa4"
            stroke="#5d4037"
            strokeWidth="0.5"
          />
        );
      })}
    </svg>
  );
};

const ProposalsPanel = ({
  proposals = [],
  selectedProposalId,
  isGenerating = false,
  progress = null,
  terrainMeters = [],
  onSelect,
  onAccept,
  onDiscard,
  onIterate,
  onGenerate,
  onCancel,
  onClose,
}) => {
  return (
    <FloatingPanel
      title="Propuestas"
      initialPos={{ x: 260, y: 80 }}
      initialSize={{ w: 340, h: 440 }}
      onClose={onClose}
    >
      <div className="p-3 text-sm">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="btn-primary flex-1"
            data-testid="generate-proposals"
          >
            {isGenerating ? 'Generando...' : 'Generar distribuciones'}
          </button>
          {isGenerating && onCancel && (
            <button
              onClick={onCancel}
              className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-red-50"
              data-testid="cancel-proposals"
            >
              Cancelar
            </button>
          )}
        </div>

        {isGenerating && progress && (
          <div className="text-xs text-gray-600 mb-2" data-testid="progress">
            Optimizando {progress.done}/{progress.total}
          </div>
        )}

        {proposals.length === 0 && !isGenerating && (
          <div className="text-gray-400 italic">Sin propuestas aún.</div>
        )}

        <ul className="list-none p-0 space-y-2">
          {proposals.map((p, idx) => {
            const selected = p.id === selectedProposalId;
            const violations = (p.constraintReport || []).filter(r => !r.valid).length;
            return (
              <li
                key={p.id}
                data-testid={`proposal-${p.id}`}
                onClick={() => onSelect?.(p.id)}
                className={`cursor-pointer border rounded p-2 ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
              >
                <div className="flex gap-2">
                  <MiniPreview proposal={p} terrainMeters={terrainMeters} />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="font-semibold">Opción {idx + 1}</div>
                      <div className="text-xs text-gray-600">Score: {p.score.toFixed(2)}</div>
                      {violations > 0 && (
                        <div className="text-xs text-red-600">Viola {violations} restricc.</div>
                      )}
                    </div>
                    <div className="flex gap-1 mt-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); onAccept?.(p.id); }}
                        className="text-xs px-2 py-0.5 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Aceptar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onIterate?.(p.id); }}
                        className="text-xs px-2 py-0.5 border border-gray-300 rounded hover:bg-gray-100"
                      >
                        Iterar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDiscard?.(p.id); }}
                        className="text-xs px-2 py-0.5 border border-gray-300 rounded hover:bg-red-50 hover:text-red-600"
                      >
                        Descartar
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </FloatingPanel>
  );
};

export default ProposalsPanel;
