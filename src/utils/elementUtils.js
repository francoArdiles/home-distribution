const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

export const removeElement = (elements, id) => elements.filter(el => el.id !== id);

export const duplicateElement = (element, offsetX = 1, offsetY = 1) => ({
  ...element,
  id: generateId(),
  x: element.x + offsetX,
  y: element.y + offsetY,
  isSelected: false,
});
