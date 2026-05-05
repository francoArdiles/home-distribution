import React, { useState } from 'react';
import FloatingPanel from './FloatingPanel.jsx';

const SA_DEFAULTS = { T0: 50, alpha: 0.95, itersPerT: 200, Tmin: 0.1, maxTimeMs: 3000 };
const GA_DEFAULTS = { populationSize: 40, generations: 200, maxTimeMs: 4000, perGeneMutationRate: 0.25, crossoverRate: 0.9, immigrantRate: 0.15 };
const SHARED_DEFAULTS = { numRuns: null, minDiversity: 3, scoreFactor: 2 };

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

const NumField = ({ label, value, onChange, min, max, step = 1, title }) => (
  <label className="flex items-center justify-between gap-2" title={title}>
    <span className="text-gray-600 shrink-0">{label}</span>
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={e => onChange(Number(e.target.value))}
      className="w-20 text-right border border-gray-300 rounded px-1 py-0.5 text-xs"
    />
  </label>
);

const AdvancedConfig = ({ algorithm, saConfig, setSaConfig, gaConfig, setGaConfig, shared, setShared }) => {
  const resolved = algorithm === 'auto' ? 'sa' : algorithm;
  const numRunsDefault = resolved === 'ga' ? 6 : 8;

  return (
    <div className="mt-2 space-y-1 text-xs border border-gray-200 rounded p-2 bg-gray-50">
      <div className="font-semibold text-gray-700 mb-1">Parametros comunes</div>
      <NumField
        label="Runs"
        value={shared.numRuns ?? numRunsDefault}
        onChange={v => setShared(s => ({ ...s, numRuns: v }))}
        min={1} max={20}
        title="Numero de ejecuciones independientes del solver"
      />
      <NumField
        label="Diversidad min (m)"
        value={shared.minDiversity}
        onChange={v => setShared(s => ({ ...s, minDiversity: v }))}
        min={0} max={20} step={0.5}
        title="Distancia RMS minima entre propuestas (metros)"
      />
      <NumField
        label="Score factor"
        value={shared.scoreFactor}
        onChange={v => setShared(s => ({ ...s, scoreFactor: v }))}
        min={1} max={10} step={0.5}
        title="Margen relativo para admitir candidatos sub-optimos"
      />

      {resolved === 'sa' && (
        <>
          <div className="font-semibold text-gray-700 mt-2 mb-1">Simulated Annealing</div>
          <NumField label="T0" value={saConfig.T0} onChange={v => setSaConfig(s => ({ ...s, T0: v }))} min={1} max={500} title="Temperatura inicial" />
          <NumField label="Alpha" value={saConfig.alpha} onChange={v => setSaConfig(s => ({ ...s, alpha: v }))} min={0.8} max={0.999} step={0.005} title="Factor de enfriamiento (por paso)" />
          <NumField label="Iters/T" value={saConfig.itersPerT} onChange={v => setSaConfig(s => ({ ...s, itersPerT: v }))} min={10} max={1000} title="Iteraciones por nivel de temperatura" />
          <NumField label="T min" value={saConfig.Tmin} onChange={v => setSaConfig(s => ({ ...s, Tmin: v }))} min={0.001} max={10} step={0.01} title="Temperatura de parada" />
          <NumField label="Tiempo max (ms)" value={saConfig.maxTimeMs} onChange={v => setSaConfig(s => ({ ...s, maxTimeMs: v }))} min={500} max={30000} step={500} title="Budget de tiempo por run" />
        </>
      )}

      {resolved === 'ga' && (
        <>
          <div className="font-semibold text-gray-700 mt-2 mb-1">Algoritmo Genetico</div>
          <NumField label="Poblacion" value={gaConfig.populationSize} onChange={v => setGaConfig(s => ({ ...s, populationSize: v }))} min={8} max={200} title="Tamano de poblacion" />
          <NumField label="Generaciones" value={gaConfig.generations} onChange={v => setGaConfig(s => ({ ...s, generations: v }))} min={10} max={1000} title="Numero maximo de generaciones" />
          <NumField label="Tasa mutacion" value={gaConfig.perGeneMutationRate} onChange={v => setGaConfig(s => ({ ...s, perGeneMutationRate: v }))} min={0.01} max={1} step={0.01} title="Probabilidad de mutar cada gen" />
          <NumField label="Tasa crossover" value={gaConfig.crossoverRate} onChange={v => setGaConfig(s => ({ ...s, crossoverRate: v }))} min={0} max={1} step={0.05} title="Probabilidad de cruzar padres" />
          <NumField label="Tasa inmigrantes" value={gaConfig.immigrantRate} onChange={v => setGaConfig(s => ({ ...s, immigrantRate: v }))} min={0} max={0.8} step={0.05} title="Fraccion de poblacion reemplazada por individuos aleatorios" />
          <NumField label="Tiempo max (ms)" value={gaConfig.maxTimeMs} onChange={v => setGaConfig(s => ({ ...s, maxTimeMs: v }))} min={500} max={30000} step={500} title="Budget de tiempo por run" />
        </>
      )}
    </div>
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
  onGeneratePathsOnly,
  onCancel,
  onClose,
  algorithm = 'auto',
  onAlgorithmChange,
}) => {
  const [advanced, setAdvanced] = useState(false);
  const [saConfig, setSaConfig] = useState({ ...SA_DEFAULTS });
  const [gaConfig, setGaConfig] = useState({ ...GA_DEFAULTS });
  const [shared, setShared] = useState({ ...SHARED_DEFAULTS });

  const handleGenerate = () => {
    if (!advanced) {
      onGenerate?.({});
      return;
    }
    const resolved = algorithm === 'auto' ? 'sa' : algorithm;
    const numRunsDefault = resolved === 'ga' ? 6 : 8;
    onGenerate?.({
      numRuns: shared.numRuns ?? numRunsDefault,
      minDiversity: shared.minDiversity,
      scoreFactor: shared.scoreFactor,
      config: resolved === 'ga' ? { ...gaConfig } : { ...saConfig },
    });
  };

  return (
    <FloatingPanel
      title="Propuestas"
      initialPos={{ x: 260, y: 80 }}
      initialSize={{ w: 340, h: 480 }}
      onClose={onClose}
    >
      <div className="p-3 text-sm">
        <div className="flex items-center gap-2 mb-2">
          <label className="flex items-center gap-2 text-xs text-gray-700 flex-1">
            <span>Algoritmo:</span>
            <select
              value={algorithm}
              onChange={(e) => onAlgorithmChange?.(e.target.value)}
              disabled={isGenerating}
              data-testid="algorithm-select"
              className="form-select text-xs py-0.5 flex-1"
            >
              <option value="auto">Auto</option>
              <option value="sa">Simulated Annealing</option>
              <option value="ga">Algoritmo Genetico</option>
            </select>
          </label>
          <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={advanced}
              onChange={e => setAdvanced(e.target.checked)}
              disabled={isGenerating}
            />
            Avanzado
          </label>
        </div>

        {advanced && (
          <AdvancedConfig
            algorithm={algorithm}
            saConfig={saConfig} setSaConfig={setSaConfig}
            gaConfig={gaConfig} setGaConfig={setGaConfig}
            shared={shared} setShared={setShared}
          />
        )}

        <div className="flex items-center gap-2 mt-3 mb-3">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="btn-primary flex-1"
            data-testid="generate-proposals"
          >
            {isGenerating ? 'Generando...' : 'Generar distribuciones'}
          </button>
          <button
            onClick={onGeneratePathsOnly}
            disabled={isGenerating}
            className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 whitespace-nowrap"
            data-testid="generate-paths-only"
            title="Genera solo caminos manteniendo la posicion actual de los elementos"
          >
            Solo caminos
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
          <div className="text-gray-400 italic">Sin propuestas aun.</div>
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
                      <div className="font-semibold">
                        Opcion {idx + 1}
                        {p.pathsOnly && <span className="ml-1 text-xs font-normal text-amber-700">(solo caminos)</span>}
                      </div>
                      {!p.pathsOnly && <div className="text-xs text-gray-600">Score: {p.score.toFixed(2)}</div>}
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
