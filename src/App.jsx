import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { defaultMeasurementConfig, addMeasurement, removeMeasurement, clearMeasurements, setActiveTool, addConstraint, removeConstraint, toggleConstraint } from './utils/measurementConfigUtils.js';
import { createPath, addPointToPath, finishPath } from './utils/pathUtils.js';
import PathEditPanel from './components/PathEditPanel.jsx';
import DetailPanel from './components/DetailPanel.jsx';
import FloatingPanel from './components/FloatingPanel.jsx';
import { getDetailSchema, createDefaultDetail } from './utils/detailUtils.js';
import { saveToFileHandle, saveProjectAs, openProjectFile, ProjectImportError } from './utils/projectIO.js';
import { exportToPdf } from './utils/pdfExport.js';
import useUndoHistory from './utils/useUndoHistory.js';
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
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);

  // Current file tracking for Ctrl+S overwrite
  const fileHandleRef = useRef(null);
  const stageRef = useRef(null);
  const [currentFilename, setCurrentFilename] = useState('proyecto');

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

  // Path (sendero/camino) state
  const [paths, setPaths] = useState([]);
  const [draftPath, setDraftPath] = useState(null);
  const [pathWidth, setPathWidth] = useState(1);
  const [pathToolActive, setPathToolActive] = useState(false);
  const [selectedPathId, setSelectedPathId] = useState(null);

  const handleStartPath = useCallback(() => {
    setPathToolActive(true);
    setDraftPath(null);
  }, []);

  const handlePathClick = useCallback((point) => {
    if (!pathToolActive) return;
    setDraftPath(prev => {
      if (!prev) return createPath(point, pathWidth);
      return addPointToPath(prev, point);
    });
  }, [pathToolActive, pathWidth]);

  // Undo history
  const { push: pushUndo, undo, canUndo } = useUndoHistory();

  // Capture current undoable state as a snapshot
  const takeSnapshot = useCallback(() => ({
    placedElements,
    paths,
    entrance,
  }), [placedElements, paths, entrance]);

  const handlePathFinish = useCallback(() => {
    if (!draftPath || draftPath.points.length < 2) {
      setDraftPath(null);
      setPathToolActive(false);
      return;
    }
    pushUndo(takeSnapshot());
    const finished = finishPath(draftPath);
    setPaths(prev => [...prev, finished]);
    setDraftPath(null);
    setPathToolActive(false);
  }, [draftPath, pushUndo, takeSnapshot]);

  const handleCancelPath = useCallback(() => {
    setDraftPath(null);
    setPathToolActive(false);
  }, []);

  const handleSelectPath = useCallback((id) => {
    setSelectedPathId(prev => prev === id ? null : id);
  }, []);

  const handleDeletePath = useCallback((id) => {
    pushUndo(takeSnapshot());
    setPaths(prev => prev.filter(p => p.id !== id));
    setSelectedPathId(null);
  }, [pushUndo, takeSnapshot]);

  const handleUpdatePath = useCallback((id, updates) => {
    pushUndo(takeSnapshot());
    setPaths(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, [pushUndo, takeSnapshot]);

  // Ctrl+Z handler
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        const snapshot = undo();
        if (snapshot) {
          setPlacedElements(snapshot.placedElements);
          setPaths(snapshot.paths);
          setEntrance(snapshot.entrance);
          setSelectedElementId(null);
          setSelectedPathId(null);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo]);


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
  const handleRemoveMeasurement = useCallback((id) => {
    setMeasurementConfig(prev => removeMeasurement(prev, id));
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

  // Cancels active tool/selection without clearing the terrain
  const handleCancelTool = useCallback(() => {
    setSelectedElementType(null);
    setSelectedElementId(null);
    setSelectedPathId(null);
    setDetailPanelOpen(false);
  }, []);

  const handleToggleGrid = useCallback(() => setGridVisible(prev => !prev), []);

  // --- Custom element handlers ---
  const handleSaveCustomElement = useCallback((def) => {
    setCustomDefinitions(prev => [...prev, def]);
    setShowCustomModal(false);
  }, []);

  // --- Save / Open ---
  const getProjectState = useCallback(() => (
    { points, finished, entrance, placedElements, solarConfig, measurementConfig, customDefinitions, paths }
  ), [points, finished, entrance, placedElements, solarConfig, measurementConfig, customDefinitions, paths]);

  const handleSave = useCallback(async () => {
    const state = getProjectState();
    try {
      if (fileHandleRef.current) {
        await saveToFileHandle(fileHandleRef.current, state);
      } else {
        const handle = await saveProjectAs(state, currentFilename);
        if (handle) {
          fileHandleRef.current = handle;
          setCurrentFilename(handle.name.replace(/\.hdist\.json$|\.json$/, ''));
        }
      }
    } catch (err) {
      if (err?.name !== 'AbortError') console.error(err);
    }
  }, [getProjectState, currentFilename]);

  const handleSaveAs = useCallback(async () => {
    const state = getProjectState();
    try {
      const handle = await saveProjectAs(state, currentFilename);
      if (handle) {
        fileHandleRef.current = handle;
        setCurrentFilename(handle.name.replace(/\.hdist\.json$|\.json$/, ''));
      }
    } catch (err) {
      if (err?.name !== 'AbortError') console.error(err);
    }
  }, [getProjectState, currentFilename]);

  const handleExportPdf = useCallback(() => {
    if (!stageRef.current) return;
    exportToPdf({
      stage: stageRef.current,
      filename: currentFilename,
      area,
      perimeter,
      elements: placedElements,
      paths,
    });
  }, [currentFilename, area, perimeter, placedElements, paths]);

  const handleOpen = useCallback(async () => {
    try {
      const { project, handle, filename } = await openProjectFile();
      fileHandleRef.current = handle;
      setCurrentFilename(filename);
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
      setPaths(project.paths ?? []);
      setSelectedPathId(null);
      setCanvasKey(k => k + 1); // remount TerrainCanvas with loaded points
    } catch (err) {
      if (err?.name === 'AbortError') return;
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

    pushUndo(takeSnapshot());
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
  }, [selectedElementType, pushUndo, takeSnapshot]);

  const handleSelectElement = useCallback((id) => {
    setSelectedElementId(id);
    setDetailPanelOpen(false);
    setPlacedElements(prev =>
      prev.map(el => ({ ...el, isSelected: el.id === id }))
    );
  }, []);

  const handleRenameElement = useCallback((id, newLabel) => {
    setPlacedElements(prev =>
      prev.map(el => el.id === id ? { ...el, label: newLabel } : el)
    );
  }, []);

  const handleOpenDetailPanel = useCallback((id) => {
    setSelectedElementId(id);
    setPlacedElements(prev => {
      const el = prev.find(e => e.id === id);
      if (!el) return prev;
      // Initialize detail with defaults if not yet set
      if (!el.detail) {
        const defaultDetail = createDefaultDetail(el.definitionId);
        if (!defaultDetail) { setDetailPanelOpen(true); return prev; }
        return prev.map(e => e.id === id ? { ...e, detail: defaultDetail } : e);
      }
      return prev;
    });
    setDetailPanelOpen(true);
  }, []);

  const handleUpdateElementDetail = useCallback((id, newDetail) => {
    pushUndo(takeSnapshot());
    setPlacedElements(prev =>
      prev.map(el => el.id === id ? { ...el, detail: newDetail } : el)
    );
  }, [pushUndo, takeSnapshot]);

  const handleMoveElement = useCallback((id, x, y) => {
    pushUndo(takeSnapshot());
    setPlacedElements(prev =>
      prev.map(el => el.id === id ? { ...el, x, y } : el)
    );
  }, [pushUndo, takeSnapshot]);

  const handleResizeElement = useCallback((id, updates) => {
    pushUndo(takeSnapshot());
    setPlacedElements(prev =>
      prev.map(el => el.id === id ? { ...el, ...updates } : el)
    );
  }, [pushUndo, takeSnapshot]);

  const handleRotateElement = useCallback((id, rotation) => {
    pushUndo(takeSnapshot());
    setPlacedElements(prev =>
      prev.map(el => el.id === id ? { ...el, rotation } : el)
    );
  }, [pushUndo, takeSnapshot]);

  // Ctrl+S = save
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  // Keyboard shortcut: S = toggle solar overlay, M = toggle distance tool
  useEffect(() => {
    const handler = (e) => {
      if (!finished) return;
      if (e.shiftKey && (e.key === 's' || e.key === 'S')) setSolarVisible(prev => !prev);
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
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId) {
        pushUndo({ placedElements, paths, entrance });
        setPlacedElements(prev => removeElement(prev, selectedElementId));
        setSelectedElementId(null);
      }
      if (e.ctrlKey && e.key === 'd' && selectedElementId) {
        e.preventDefault();
        const original = placedElements.find(el => el.id === selectedElementId);
        if (original) {
          pushUndo({ placedElements, paths, entrance });
          const dup = duplicateElement(original, 1, 1, placedElements.map(e => e.label));
          setPlacedElements(prev => [...prev, dup]);
          setSelectedElementId(dup.id);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [finished, selectedElementId, placedElements, paths, entrance, pushUndo]);


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
        onSaveAs={handleSaveAs}
        onOpen={handleOpen}
        onExportPdf={handleExportPdf}
        onCreateCustomElement={() => setShowCustomModal(true)}
      />
      <div style={{ display: 'flex', flex: 1, overflowX: 'auto' }}>
        {finished && (
          <ElementLibraryPanel
            onSelectElement={setSelectedElementType}
            selectedElementType={selectedElementType}
            customDefinitions={customDefinitions}
            pathToolActive={pathToolActive}
            pathWidth={pathWidth}
            onSetPathWidth={setPathWidth}
            onStartPath={handleStartPath}
            onCancelPath={handleCancelPath}
          />
        )}
        {finished && selectedPathId && !pathToolActive && (
          <PathEditPanel
            path={paths.find(p => p.id === selectedPathId) ?? null}
            onDelete={handleDeletePath}
            onUpdate={handleUpdatePath}
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
            onCancel={handleCancelTool}
            activeElementType={selectedElementType}
            onPlaceElement={handlePlaceElement}
            placedElements={placedElements}
            onSelectElement={handleSelectElement}
            onDoubleClickElement={handleOpenDetailPanel}
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
            onRemoveMeasurement={handleRemoveMeasurement}
            onSetActiveTool={handleSetActiveTool}
            selectedElementId={selectedElementId}
            customDefinitions={customDefinitions}
            paths={paths}
            draftPath={draftPath}
            selectedPathId={selectedPathId}
            onPathClick={pathToolActive ? handlePathClick : null}
            onPathFinish={pathToolActive ? handlePathFinish : null}
            onSelectPath={handleSelectPath}
            onUpdatePath={handleUpdatePath}
            externalStageRef={stageRef}
          />
        </div>
        <InfoPanel
          points={points}
          finished={finished}
          area={area}
          perimeter={perimeter}
          baseScale={baseScale}
          selectedElement={placedElements.find(e => e.id === selectedElementId) ?? null}
          selectedPath={paths.find(p => p.id === selectedPathId) ?? null}
          onRenameElement={handleRenameElement}
          constraints={measurementConfig.constraints}
          validationResults={validateAllConstraints(measurementConfig.constraints, placedElements, points, baseScale)}
          elements={placedElements}
        />
      </div>
      {solarPanelOpen && (
        <FloatingPanel
          title="Solar"
          initialPos={{ x: window.innerWidth - 320, y: 60 }}
          onClose={() => setSolarPanelOpen(false)}
        >
          <SolarPanel
            solarConfig={solarConfig}
            onConfigChange={handleSolarConfigChange}
          />
        </FloatingPanel>
      )}
      {measurementPanelOpen && finished && (
        <FloatingPanel
          title="Medidas"
          initialPos={{ x: 200, y: 60 }}
          onClose={() => setMeasurementPanelOpen(false)}
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
        </FloatingPanel>
      )}
      {detailPanelOpen && selectedElementId && finished && (() => {
        const el = placedElements.find(e => e.id === selectedElementId) ?? null;
        const schema = el ? getDetailSchema(el.definitionId) : null;
        return (
          <FloatingPanel
            title="Detalle"
            initialPos={{ x: 400, y: 80 }}
            onClose={() => setDetailPanelOpen(false)}
          >
            <DetailPanel
              element={el}
              schema={schema}
              onChange={(newDetail) => handleUpdateElementDetail(selectedElementId, newDetail)}
              onClose={() => setDetailPanelOpen(false)}
            />
          </FloatingPanel>
        );
      })()}
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
