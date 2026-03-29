export const defaultMeasurementConfig = {
  activeTool: 'none',
  showMeasurements: true,
  showConstraints: true,
  activeMeasurements: [],
  constraints: [],
};

export const addMeasurement = (config, measurement) => ({
  ...config,
  activeMeasurements: [...config.activeMeasurements, measurement],
});

export const removeMeasurement = (config, id) => ({
  ...config,
  activeMeasurements: config.activeMeasurements.filter(m => m.id !== id),
});

export const clearMeasurements = (config) => ({
  ...config,
  activeMeasurements: [],
});

export const setActiveTool = (config, tool) => ({
  ...config,
  activeTool: tool,
});

export const addConstraint = (config, constraint) => ({
  ...config,
  constraints: [...config.constraints, constraint],
});

export const removeConstraint = (config, id) => ({
  ...config,
  constraints: config.constraints.filter(c => c.id !== id),
});

export const toggleConstraint = (config, id) => ({
  ...config,
  constraints: config.constraints.map(c =>
    c.id === id ? { ...c, enabled: !c.enabled } : c
  ),
});
