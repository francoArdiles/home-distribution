import React, { useState, useCallback, useEffect } from 'react';
import TerrainCanvas from './components/TerrainCanvas.jsx';
import Toolbar from './components/Toolbar.jsx';
import InfoPanel from './components/InfoPanel.jsx';
import ElementLibraryPanel from './components/ElementLibraryPanel.jsx';
import PlacedElementsLayer from './components/PlacedElementsLayer.jsx';
import { calculateArea, calculatePerimeter } from './utils/geometryUtils.js';
import { getElementDefinition } from './data/elementDefinitions.js';
import { removeElement, duplicateElement } from './utils/elementUtils.js';
import { isRectangleInPolygon, isCircleInPolygon, isPolygonElementInPolygon } from './utils/collisionUtils.js';
import { defaultSolarConfig, mergeSolarConfig } from './utils/solarConfigUtils.js';
import SolarPanel from './components/SolarPanel.jsx';
import CardinalLayer from './components/CardinalLayer.jsx';
import SolarPathLayer from './components/SolarPathLayer.jsx';
import ShadowLayer from './components/ShadowLayer.jsx';
import { defaultMeasurementConfig, addMeasurement, clearMeasurements, setActiveTool, addConstraint, removeConstraint, toggleConstraint } from './utils/measurementConfigUtils.js';
import { downloadProject, openProjectFile, ProjectImportError } from './utils/projectIO.js';
import { validateAllConstraints } from './utils/constraintUtils.js';
import MeasurementToolkit from './components/MeasurementToolkit.jsx';
import ConstraintPanel from './components/ConstraintPanel.jsx';
import CustomElementModal from './components/CustomElementModal.jsx';

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
  const [customDefinitions, setCustomDefinitions] = useState([]);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [selectedElementType, setSelectedElementType] = useState(null);
  const [selectedElementId, setSelectedElementId] = useState(null);

  // Canvas remount key — increment to force TerrainCanvas to reinitialize (e.g. after project load)
  const [canvasKey, setCanvasKey] = useState(0);

  // Terrain edit state
  const [terrainEditMode, setTerrainEditMode] = useState(false);
  const handleToggleTerrainEdit = useCallback(() => setTerrainEditMode(prev => !prev), []);

  // Entrance state
  const [entrance, setEntrance] = useState(null);
  const [entranceMode, setEntranceMode] = useState(false);
  const handleToggleEntrance = useCallback(() => setEntranceMode(prev => !prev), []);

  // Solar state
  const [solarVisible, setSolarVisible] = useState(false);
  const [solarPanelOpen, setSolarPanelOpen] = useState(false);
  const [solarConfig, setSolarConfig] = useState(defaultSolarConfig);

  // Measurement state
  const [measurementConfig, setMeasurementConfig] = useState(defaultMeasurementConfig);
  const [measurementPanelOpen, setMeasurementPanelOpen] = useState(false);

  // Floating panels drag state
  const [solarPanelPos, setSolarPanelPos] = useState({ x: null, y: 60 });
  const [measurementPanelPos, setMeasurementPanelPos] = useState({ x: 200, y: 60 });
  const [draggingPanel, setDraggingPanel] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleDragStart = useCallback((panelName, e) => {
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    const pos = panelName === 'solar' ? solarPanelPos : measurementPanelPos;
    const isPositioned = pos.x !== null;
    setDragOffset({
      x: clientX - (isPositioned ? pos.x : (panelName === 'solar' ? window.innerWidth - 300 : 200)),
      y: clientY - (isPositioned ? pos.y : 60)
    });
    setDraggingPanel(panelName);
  }, [solarPanelPos, measurementPanelPos]);

  const handleDragMove = useCallback((e) => {
    if (!draggingPanel) return;
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    const newX = clientX - dragOffset.x;
    const newY = Math.max(60, clientY - dragOffset.y);
    if (draggingPanel === 'solar') {
      setSolarPanelPos({ x: newX, y: newY });
    } else {
      setMeasurementPanelPos({ x: newX, y: newY });
    }
  }, [draggingPanel, dragOffset]);

  const handleDragEnd = useCallback(() => {
    setDraggingPanel(null);
  }, []);

  const handleSolarConfigChange = useCallback((partial) => {
    setSolarConfig(prev => mergeSolarConfig(prev, partial));
  }, []);

  // --- Measurement handlers ---
  const handleAddMeasurement = useCallback((m) => {
    setMeasurementConfig(prev => addMeasurement(prev, m));
  }, []);
  const handleClearMeasurements = useCallback(() => {
    setMeasurementConfig(prev => clearMeasurements(prev));
  }, []);
  const handleSetActiveTool = useCallback((tool) => {
    setMeasurementConfig(prev => setActiveTool(prev, tool));
  }, []);
  const handleAddConstraint = useCallback((c) => {
    setMeasurementConfig(prev => addConstraint(prev, c));
  }, []);
  const handleRemoveConstraint = useCallback((id) => {
    setMeasurementConfig(prev => removeConstraint(prev, id));
  }, []);
  const handleToggleConstraint = useCallback((id) => {
    setMeasurementConfig(prev => toggleConstraint(prev, id));
  }, []);
  const handleToggleMeasurements = useCallback(() => {
    setMeasurementPanelOpen(prev => !prev);
  }, []);

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
    setEntrance(null);
    setEntranceMode(false);
  }, []);

  const handleToggleGrid = useCallback(() => setGridVisible(prev => !prev), []);

  // --- Custom element handlers ---
  const handleSaveCustomElement = useCallback((def) => {
    setCustomDefinitions(prev => [...prev, def]);
    setShowCustomModal(false);
  }, []);

  // --- Save / Open ---
  const handleSave = useCallback(() => {
    downloadProject({ points, finished, entrance, placedElements, solarConfig, measurementConfig, customDefinitions });
  }, [points, finished, entrance, placedElements, solarConfig, measurementConfig, customDefinitions]);

  const handleOpen = useCallback(async () => {
    try {
      const project = await openProjectFile();
      // Restore terrain
      setPoints(project.terrain.points);
      setFinished(project.terrain.finished);
      setEntrance(project.terrain.entrance ?? null);
      setArea(0);
      setPerimeter(0);
      // Restore elements
      setPlacedElements(project.elements);
      setSelectedElementId(null);
      setSelectedElementType(null);
      // Restore optional configs
      if (project.solar) setSolarConfig(project.solar);
      if (project.measurements) setMeasurementConfig(project.measurements);
      setCustomDefinitions(project.customDefinitions ?? []);
      setCanvasKey(k => k + 1); // remount TerrainCanvas with loaded points
    } catch (err) {
      if (err instanceof ProjectImportError) {
        alert(`No se pudo abrir el proyecto: ${err.message}`);
      } else {
        console.error(err);
      }
    }
  }, []);

  // --- Element handlers ---
  const handlePlaceElement = useCallback((x, y) => {
    const def = getElementDefinition(selectedElementType)
             ?? customDefinitions.find(d => d.id === selectedElementType);
    if (!def) return;

    // Check element fits inside terrain polygon
    if (points.length >= 3) {
      let inside;
      if (def.shape === 'circle') {
        inside = isCircleInPolygon({ x, y, radius: def.defaultRadius ?? def.defaultWidth / 2 }, points, baseScale);
      } else if (def.shape === 'polygon') {
        inside = isPolygonElementInPolygon(def.points, x, y, 0, points, baseScale);
      } else {
        inside = isRectangleInPolygon({ x: x - def.defaultWidth / 2, y: y - def.defaultHeight / 2, width: def.defaultWidth, height: def.defaultHeight }, points, baseScale);
      }
      if (!inside) return;
    }

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

  // Keyboard shortcut: S = toggle solar overlay, M = toggle distance tool
  useEffect(() => {
    const handler = (e) => {
      if (!finished) return;
      if (e.key === 's' || e.key === 'S') setSolarVisible(prev => !prev);
      if (e.key === 'm' || e.key === 'M') {
        setMeasurementConfig(prev =>
          setActiveTool(prev, prev.activeTool === 'distance' ? 'none' : 'distance')
        );
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [finished]);

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

  // Floating panels drag events
  useEffect(() => {
    const onMouseMove = (e) => handleDragMove(e);
    const onMouseUp = () => handleDragEnd();
    const onTouchMove = (e) => handleDragMove(e);
    const onTouchEnd = () => handleDragEnd();

    if (draggingPanel) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [draggingPanel, handleDragMove, handleDragEnd]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Toolbar
        pointsCount={points.length}
        finished={finished}
        gridVisible={gridVisible}
        onFinish={handleFinish}
        onToggleGrid={handleToggleGrid}
        onClear={handleClear}
        solarVisible={solarVisible}
        onToggleSolar={() => { setSolarVisible(v => !v); setSolarPanelOpen(v => !v); }}
        onToggleMeasurements={handleToggleMeasurements}
        terrainEditMode={terrainEditMode}
        onToggleTerrainEdit={handleToggleTerrainEdit}
        entranceMode={entranceMode}
        onToggleEntrance={handleToggleEntrance}
        onSave={handleSave}
        onOpen={handleOpen}
        onCreateCustomElement={() => setShowCustomModal(true)}
      />
      <div style={{ display: 'flex', flex: 1, overflowX: 'auto' }}>
        {finished && (
          <ElementLibraryPanel
            onSelectElement={setSelectedElementType}
            selectedElementType={selectedElementType}
            customDefinitions={customDefinitions}
          />
        )}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <TerrainCanvas
            key={canvasKey}
            initialPoints={points}
            initialFinished={finished}
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
            terrainEditMode={terrainEditMode}
            entrance={entrance}
            entranceMode={entranceMode}
            onEntranceChange={setEntrance}
            solarVisible={solarVisible}
            solarConfig={solarConfig}
            measurementConfig={measurementConfig}
            onAddMeasurement={handleAddMeasurement}
            onSetActiveTool={handleSetActiveTool}
            selectedElementId={selectedElementId}
            customDefinitions={customDefinitions}
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
      {solarPanelOpen && (
        <div
          style={{
            position: 'fixed',
            left: solarPanelPos.x ?? (window.innerWidth - 300),
            top: solarPanelPos.y ?? 60,
            zIndex: 100,
            cursor: 'move',
            background: '#fff',
            border: '1px solid #ccc',
            padding: 8,
          }}
          onMouseDown={(e) => handleDragStart('solar', e)}
          onTouchStart={(e) => handleDragStart('solar', e)}
        >
          <SolarPanel
            solarConfig={solarConfig}
            onConfigChange={handleSolarConfigChange}
            onClose={() => setSolarPanelOpen(false)}
          />
        </div>
      )}
      {measurementPanelOpen && finished && (
        <div
          style={{
            position: 'fixed',
            left: measurementPanelPos.x ?? 200,
            top: measurementPanelPos.y ?? 60,
            zIndex: 100,
            cursor: 'move',
            background: '#fff',
            border: '1px solid #ccc',
            padding: 8,
          }}
          onMouseDown={(e) => handleDragStart('measurement', e)}
          onTouchStart={(e) => handleDragStart('measurement', e)}
        >
          <MeasurementToolkit
            activeTool={measurementConfig.activeTool}
            onSelectTool={handleSetActiveTool}
            onClearMeasurements={handleClearMeasurements}
            showMeasurements={measurementConfig.showMeasurements}
            showConstraints={measurementConfig.showConstraints}
            onToggleMeasurements={() => setMeasurementConfig(prev => ({ ...prev, showMeasurements: !prev.showMeasurements }))}
            onToggleConstraints={() => setMeasurementConfig(prev => ({ ...prev, showConstraints: !prev.showConstraints }))}
          />
          <ConstraintPanel
            constraints={measurementConfig.constraints}
            elements={placedElements}
            onAddConstraint={handleAddConstraint}
            onRemoveConstraint={handleRemoveConstraint}
            onToggleConstraint={handleToggleConstraint}
            validationResults={validateAllConstraints(measurementConfig.constraints, placedElements, points, baseScale)}
          />
        </div>
      )}
      {cursorPos && !finished && (
        <div style={{ padding: '4px 8px', background: '#eee', fontSize: '12px' }}>
          X: {cursorPos.x.toFixed(1)} m, Y: {cursorPos.y.toFixed(1)} m
        </div>
      )}
      {showCustomModal && (
        <CustomElementModal
          onSave={handleSaveCustomElement}
          onCancel={() => setShowCustomModal(false)}
        />
      )}
    </div>
  );
}

export default App;
