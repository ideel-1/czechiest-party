// src/features/board/constants.ts
export const CARD_W = 260;
export const GAP = 16;
export const ORIGIN_X = 24;
export const ORIGIN_Y = 24;

export function computeCols(viewportWidth = window.innerWidth) {
  // force at least 2 columns; scale gently
  if (viewportWidth < 430) return 2;
  if (viewportWidth < 700) return 3;
  if (viewportWidth < 980) return 4;
  return 5;
}
