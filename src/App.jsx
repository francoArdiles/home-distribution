import React, { useState, useCallback, useEffect } from 'react';
import TerrainCanvas from './components/TerrainCanvas.jsx';
import Toolbar from './components/Toolbar.jsx';
import InfoPanel from './components/InfoPanel.jsx';
import ElementLibraryPanel from './components/ElementLibraryPanel.jsx';
import PlacedElementsLayer from './components/PlacedElementsLayer.jsx';
import { calculateArea, calculatePerimeter } from './utils/geometryUtils.js';
import { getElementDefinition } from './data/elementDefinitions.js';
import { removeElement, duplicateElement } from './utils/elementUtils.js';

const baseScale = 10;
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

function App() {
  // Terrain state
  const [points, setPoints] = useState([]);
  const [finished, setFinished] = useState(false);
  const [gridVisible, setGridVisible] = useState(false);
  const [cursorPos, setCursorPos] = useState(null);
  const [area, setArea] = useState(0);
  const [perimeter, setPerimeter] = useState(0);

  // Elements state
  const [placedElements, setPlacedElements] = useState([]);
  const [selectedElementType, setSelectedElementType] = useState(null);
  const [selectedElementId, setSelectedElementId] = useState(null);

  // --- Terrain handlers ---
  const handlePointsChange = useCallback((newPoints) => {
    setPoints(newPoints);
    setArea(calculateArea(newPoints) / (baseScale * baseScale));
    setPerimeter(calculatePerimeter(newPoints) / baseScale);
  }, []);

  const handleFinish = useCallback(() => {
    if (points.length >= 3) setFinished(true);
  }, [points]);

  const handleClear = useCallback(() => {
    setPoints([]);
    setFinished(false);
    setArea(0);
    setPerimeter(0);
    setCursorPos(null);
    setPlacedElements([]);
    setSelectedElementId(null);
    setSelectedElementType(null);
  }, []);

  const handleToggleGrid = useCallback(() => setGridVisible(prev => !prev), []);

  // --- Element handlers ---
  const handlePlaceElement = useCallback((x, y) => {
    const def = getElementDefinition(selectedElementType);
    if (!def) return;
    const newEl = {
      id: generateId(),
      definitionId: def.id,
      shape: def.shape,
      x, y,
      width: def.defaultWidth,
      height: def.defaultHeight,
      radius: def.defaultRadius ?? def.defaultWidth / 2,
      rotation: 0,
      label: def.name,
      isSelected: false,
      color: def.color,
      borderColor: def.borderColor,
      borderWidth: def.borderWidth,
    };
    setPlacedElements(prev => [...prev, newEl]);
    setSelectedElementType(null);
  }, [selectedElementType]);

  const handleSelectElement = useCallback((id) => {
    setSelectedElementId(id);
    setPlacedElements(prev =>
      prev.map(el => ({ ...el, isSelected: el.id === id }))
    );
  }, []);

  const handleMoveElement = useCallback((id, x, y) => {
    setPlacedElements(prev =>
      prev.map(el => el.id === id ? { ...el, x, y } : el)
    );
  }, []);

  const handleResizeElement = useCallback((id, updates) => {
    setPlacedElements(prev =>
      prev.map(el => el.id === id ? { ...el, ...updates } : el)
    );
  }, []);

  const handleRotateElement = useCallback((id, rotation) => {
    setPlacedElements(prev =>
      prev.map(el => el.id === id ? { ...el, rotation } : el)
    );
  }, []);

  // Delete + Duplicate keyboard shortcuts (only when terrain finished)
  useEffect(() => {
    const handler = (e) => {
      if (!finished) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
        setPlacedElements(prev => removeElement(prev, selectedElementId));
        setSelectedElementId(null);
      }
      if (e.ctrlKey && e.key === 'd' && selectedElementId) {
        e.preventDefault();
        const original = placedElements.find(el => el.id === selectedElementId);
        if (original) {
          const dup = duplicateElement(original, 1, 1);
          setPlacedElements(prev => [...prev, dup]);
          setSelectedElementId(dup.id);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [finished, selectedElementId, placedElements]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh' }}>
      <Toolbar
        pointsCount={points.length}
        finished={finished}
        gridVisible={gridVisible}
        onFinish={handleFinish}
        onToggleGrid={handleToggleGrid}
        onClear={handleClear}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {finished && (
          <ElementLibraryPanel
            onSelectElement={setSelectedElementType}
            selectedElementType={selectedElementType}
          />
        )}
        <div style={{ flex: 1, position: 'relative' }}>
          <TerrainCanvas
            onPointsChange={handlePointsChange}
            finished={finished}
            onFinish={handleFinish}
            gridVisible={gridVisible}
            onCursorMove={setCursorPos}
            onCancel={handleClear}
            activeElementType={selectedElementType}
            onPlaceElement={handlePlaceElement}
            placedElements={placedElements}
            onSelectElement={handleSelectElement}
            onMoveElement={handleMoveElement}
            onResizeElement={handleResizeElement}
            onRotateElement={handleRotateElement}
            snapToGridEnabled={gridVisible}
          />
        </div>
        <InfoPanel
          points={points}
          finished={finished}
          area={area}
          perimeter={perimeter}
          baseScale={baseScale}
        />
      </div>
      {cursorPos && !finished && (
        <div style={{ padding: '4px 8px', background: '#eee', fontSize: '12px' }}>
          X: {cursorPos.x.toFixed(1)} m, Y: {cursorPos.y.toFixed(1)} m
        </div>
      )}
    </div>
  );
}

export default App;
