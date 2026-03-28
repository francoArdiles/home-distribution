# TDD Implementation Process for Home-Distribution Project

## Overview
This document formalizes the Test-Driven Development (TDD) process for implementing Stage 1 of the home-distribution project. It provides a clear framework for requesting sub-agents to implement specific units of work, ensuring consistency, traceability, and quality.

## TDD Cycle (RED-GREEN-REFACTOR)
Each unit of work follows this strict cycle:
1. **RED**: Write a failing test that defines the desired functionality
2. **GREEN**: Implement the minimum code necessary to make the test pass
3. **REFACTOR**: Improve code structure while keeping tests passing

## Stage 1 Units of Work
Based on specifications in `01_terreno_y_lienzo.md`, Stage 1 is divided into the following atomic units:

| Unit ID | Description | Completion Criteria |
|---------|-------------|---------------------|
| **UNIT_1** | Basic TerrainCanvas component structure + initial state | Component renders empty Konva.Stage with correct dimensions |
| **UNIT_2** | Click handling to add points | User can click to add red points; points stored in state |
| **UNIT_3** | Enter key to finalize polygon | Pressing Enter closes polygon (min 3 points); auto-completion |
| **UNIT_4** | Self-intersection validation | Prevents creation of self-intersecting polygons |
| **UNIT_5** | Point editing (drag) | User can drag existing points (2px tolerance) |
| **UNIT_6** | Delete last point (Backspace) & Cancel (Escape) | Backspace removes last point; Escape cancels current drawing |
| **UNIT_7** | Segment length tooltips | Hovering over segments shows length with 1 decimal |
| **UNIT_8** | Zoom and pan implementation | Mouse wheel zooms; click-drag pans canvas |
| **UNIT_9** | Integration & end-to-end testing | Full workflow works: draw → edit → finalize → validate |
| **UNIT_10** | Final refactor & documentation | Code cleaned; comments added; README updated |

## Requesting Sub-Agents
To request a sub-agent for a specific unit, use this format:

```
[SUB-AGENT REQUEST]
Unit: UNIT_X
Description: [Brief description of what to implement]
Model: [Preferred model, e.g., minimax/minimax-m2.5:free]
Priority: [High/Medium/Low]
Dependencies: [List of units that must be completed first]
```

Example:
```
[SUB-AGENT REQUEST]
Unit: UNIT_2
Description: Implement click handling to add points to TerrainCanvas state
Model: minimax/minimax-m2.5:free
Priority: High
Dependencies: UNIT_1
```

## Completion Signaling
When a sub-agent completes a unit, it MUST:
1. Create a completion marker file: `plan/UNIT_X_COMPLETED.md`
2. The file must contain:
   - Timestamp of completion (ISO 8601 format)
   - Summary of what was implemented
   - List of files created/modified
   - Test results (pass/fail counts)
   - Any notable decisions or assumptions
3. Update the main STATUS.md file in the plan directory (if exists) to reflect progress

Example completion marker:
```
# UNIT_2_COMPLETED.md

**Completed**: 2026-03-28T14:30:00Z
**Unit**: UNIT_2 - Click handling to add points

## Summary
Implemented click event handling on Konva.Stage to add points to application state. Points are stored as {x, y} objects in pixels (relative to canvas origin at bottom-left).

## Files Modified
- src/components/TerrainCanvas.js (created)
- src/hooks/useTerrainPoints.js (created)
- src/components/TerrainCanvas.test.js (created)

## Test Results
- ✅ 3/3 tests passed
  - Renders without errors
  - Adds point on stage click
  - Stores point coordinates correctly

## Assumptions
- Canvas origin is at bottom-left (per specifications)
- Point coordinates stored in pixel space (will be converted to meters via scale elsewhere)
- No visual feedback implemented yet (handled in UNIT_7)
```

## Rate Limit Handling
- Sub-agents should work in small, atomic units to minimize API usage
- If rate limits are encountered (HTTP 429), the sub-agent should:
  1. Save current progress
  2. Exit gracefully
  3. Leave a clear note in the completion marker about what was accomplished
  4. The requesting agent can then retry later or break work into smaller chunks

## Visibility Protocol
The requesting agent will receive updates via:
1. **Hito completado**: Clear message when a unit finishes
2. **Archivos modificados**: List of files changed
3. **Resultados de tests**: Pass/fail summary
4. **Próximo paso**: What comes next
5. **Fragmentos de código**: Key implementations when relevant

## Storage Location
All process documents, plans, and completion markers are stored in:
```
/home/zeroclaw/.zeroclaw/workspace/zero-projects/home-distribution/plan/
```

## Example Workflow
1. User requests: "[SUB-AGENT REQUEST] Unit: UNIT_1 ..."
2. System launches sub-agent with specified model
3. Sub-agent:
   - Reads UNIT_1 specifications from 01_terreno_y_lienzo.md
   - Creates failing test for basic TerrainCanvas rendering
   - Implements minimal component to pass test
   - Creates UNIT_1_COMPLETED.md with results
   - Exits
4. User receives notification: "Hito completado: UNIT_1 - Basic TerrainCanvas structure"
5. User can then request next unit (UNIT_2) knowing UNIT_1 is done

---
*This document is the single source of truth for the TDD process. All sub-agent requests should reference it.*