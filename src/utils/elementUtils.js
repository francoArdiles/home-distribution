const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

export const removeElement = (elements, id) => elements.filter(el => el.id !== id);

export const duplicateElement = (element, offsetX = 1, offsetY = 1) => ({
  ...element,
  id: generateId(),
  x: element.x + offsetX,
  y: element.y + offsetY,
  isSelected: false,
});

/**
 * Calculate new position + dimensions when a rectangle corner handle is dragged.
 * The opposite corner stays fixed as the anchor.
 * @param {'tl'|'tr'|'br'|'bl'} cornerKey
 * @param {number} dragX - new handle X in stage pixels
 * @param {number} dragY - new handle Y in stage pixels
 * @returns {{ x, y, width, height }} in meters
 */
export const calculateRectResize = (cornerKey, dragX, dragY, el, scale, position, baseScale) => {
  const bs = baseScale * scale;
  const sx = el.x * bs + position.x;
  const sy = el.y * bs + position.y;
  const hw = (el.width * bs) / 2;
  const hh = (el.height * bs) / 2;

  // Opposite corner (the anchor that stays fixed)
  const opposites = {
    tl: { x: sx + hw, y: sy + hh },
    tr: { x: sx - hw, y: sy + hh },
    br: { x: sx - hw, y: sy - hh },
    bl: { x: sx + hw, y: sy - hh },
  };
  const opp = opposites[cornerKey];
  const newCenterX = (dragX + opp.x) / 2;
  const newCenterY = (dragY + opp.y) / 2;
  const newW = Math.max(0.5, Math.abs(dragX - opp.x) / bs);
  const newH = Math.max(0.5, Math.abs(dragY - opp.y) / bs);
  return {
    x: (newCenterX - position.x) / bs,
    y: (newCenterY - position.y) / bs,
    width: newW,
    height: newH,
  };
};

/**
 * Calculate new radius when a circle resize handle is dragged.
 * @param {number} dragX - new handle X in stage pixels
 * @param {number} dragY - new handle Y in stage pixels
 * @returns {{ radius, width, height }} in meters
 */
export const calculateCircleResize = (dragX, dragY, el, scale, position, baseScale) => {
  const bs = baseScale * scale;
  const cx = el.x * bs + position.x;
  const cy = el.y * bs + position.y;
  const dist = Math.sqrt(Math.pow(dragX - cx, 2) + Math.pow(dragY - cy, 2));
  const newRadius = Math.max(0.5, dist / bs);
  return { radius: newRadius, width: newRadius * 2, height: newRadius * 2 };
};

/**
 * Calculate rotation angle (degrees) from the rotation handle position relative to element center.
 * 0° = handle above center, 90° = right, 180° = below, 270° = left.
 */
export const calculateRotation = (handleX, handleY, centerX, centerY) => {
  const angle = Math.atan2(handleX - centerX, -(handleY - centerY)) * 180 / Math.PI;
  return ((angle % 360) + 360) % 360;
};
