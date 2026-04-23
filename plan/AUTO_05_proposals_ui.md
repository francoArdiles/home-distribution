# AUTO_05 — Store y UI de propuestas

**Estado: Pending**
**Depende de: AUTO_03 (SA) y AUTO_04 (paths). Se puede desarrollar con stub de SA y paths mientras llegan los reales.**

## Goal

Integrar en `App.jsx` un store de propuestas temporales. UI: botón "Generar distribuciones", panel lateral con hasta 5 propuestas (preview + score), overlay sobre el canvas al seleccionar una, y botones Aceptar/Descartar/Iterar.

## Cambios en `App.jsx`

```js
// Nuevo estado
const [proposals, setProposals] = useState([]);         // Array<Proposal>, max 5
const [selectedProposalId, setSelectedProposalId] = useState(null);
const [isGenerating, setIsGenerating] = useState(false);
```

`Proposal`:

```js
{
  id: string,
  createdAt: number,          // Date.now()
  score: number,
  elements: Array<Element>,   // mismo shape que placedElements (x,y,rotation,...)
  paths: Array<Path>,         // generados por AUTO_04
  constraintReport: Array<{ constraint, valid, actualDistance, requiredDistance }>,
}
```

## Componentes a crear

### `src/components/ProposalsPanel.jsx`

FloatingPanel que lista propuestas.

Props:
```js
{
  proposals,
  selectedProposalId,
  onSelect: (id) => void,
  onAccept: (id) => void,
  onDiscard: (id) => void,
  onIterate: (id) => void,
  onGenerate: () => void,
  isGenerating,
  onClose,
}
```

Render:
- Header: "Propuestas ({proposals.length})" + botón "Generar".
- Si generating: spinner + "Optimizando...".
- Cada propuesta:
  - Mini canvas SVG 120x80 con bbox del terreno + rectángulos/círculos simplificados de elementos + trazos de paths.
  - Score a la derecha (con badges: "hard violations: N" si breakdown.violations > 0).
  - Botones Aceptar / Descartar / Iterar.
- Propuesta seleccionada: borde azul.

### `src/components/ProposalOverlay.jsx`

Capa Konva (`<Layer>`) que se monta sobre `TerrainCanvas` cuando hay propuesta seleccionada. Renderiza los elementos y paths con `opacity={0.6}`. No interactivo.

Props:
```js
{ proposal, baseScale }
```

## Botón en Toolbar

Nuevo botón "Sugerir distribuciones" (icono varita mágica). Click:
1. `setIsGenerating(true)`.
2. Invocar generador (AUTO_06 lo hará en worker; por ahora sincrono directo).
3. Guardar resultado en `proposals`, abrir panel.
4. `setIsGenerating(false)`.

## Handlers en App.jsx

```js
const handleGenerateProposals = useCallback(async () => {
  setIsGenerating(true);
  try {
    const context = {
      terrainMeters: points.map(p => ({ x: p.x / baseScale, y: p.y / baseScale })),
      constraints: measurementConfig.constraints,
      weights: DEFAULT_WEIGHTS,
    };
    // Placeholder: hasta AUTO_06, correr 1 SA sync.
    const initial = randomInitialLayout(placedElements, context.terrainMeters, Math.random);
    const result = solveSA(initial, context);
    const paths = generatePaths(result.best, context.terrainMeters);
    const proposal = {
      id: generateId(),
      createdAt: Date.now(),
      score: result.bestScore,
      elements: result.best.elements,
      paths,
      constraintReport: validateAllConstraints(context.constraints, result.best.elements, points, baseScale),
    };
    setProposals([proposal]);
    setSelectedProposalId(proposal.id);
  } finally {
    setIsGenerating(false);
  }
}, [points, placedElements, measurementConfig]);

const handleAcceptProposal = useCallback((id) => {
  const p = proposals.find(x => x.id === id);
  if (!p) return;
  setPlacedElements(p.elements);        // pushea al undo history via useUndoHistory
  setPaths(p.paths);
  setProposals([]);
  setSelectedProposalId(null);
}, [proposals]);

const handleDiscardProposal = useCallback((id) => {
  setProposals(prev => prev.filter(x => x.id !== id));
  if (selectedProposalId === id) setSelectedProposalId(null);
}, [selectedProposalId]);

const handleIterateProposal = useCallback(async (id) => {
  const p = proposals.find(x => x.id === id);
  if (!p) return;
  setIsGenerating(true);
  const context = { /* ... */ };
  const result = solveSA({ elements: p.elements }, context);
  const paths = generatePaths(result.best, context.terrainMeters);
  setProposals(prev => prev.map(x => x.id === id ? {
    ...x, elements: result.best.elements, paths, score: result.bestScore,
  } : x));
  setIsGenerating(false);
}, [proposals]);
```

## Tests

```
src/components/__tests__/ProposalsPanel.test.jsx
src/components/__tests__/ProposalOverlay.test.jsx
```

```js
describe('ProposalsPanel', () => {
  test('render vacío con botón Generar', ...);
  test('botón Generar invoca onGenerate', ...);
  test('isGenerating muestra spinner y deshabilita botón', ...);
  test('lista N propuestas con score', ...);
  test('click en propuesta llama onSelect con su id', ...);
  test('selected proposal tiene borde distintivo', ...);
  test('botones Aceptar/Descartar/Iterar llaman handlers correctos', ...);
});

describe('ProposalOverlay', () => {
  test('renderiza elementos con opacity 0.6', ...);
  test('renderiza paths', ...);
  test('no renderiza si proposal es null', ...);
});
```

## Tests de integración

`src/components/__tests__/App.proposals.test.jsx`: click "Sugerir", panel aparece, hay >=1 propuesta, click Aceptar -> placedElements cambian, proposals se vacía.

## Persistencia

Las propuestas NO se guardan en el archivo de proyecto. Son volátiles. Excluir en `projectIO.js` (ya no están en el state que exporta).

## Criterio de completitud

- Generar con 3-5 elementos produce >=1 propuesta.
- Aceptar reemplaza elements+paths, entra al undo stack (Ctrl+Z revierte).
- Descartar elimina del panel.
- Iterar mejora (o iguala) el score.
- UI no se bloquea > 500ms (con AUTO_06 worker). Mientras no esté el worker, aceptable < 5s.
