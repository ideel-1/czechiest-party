// src/features/board/constants.ts
export const CARD_W = 260;        // uniform card width
export const GAP = 16;            // gap between cards
export const ORIGIN_X = 24;       // left padding of the layout
export const ORIGIN_Y = 24;       // top padding of the layout

// simple responsive columns for mobile-first
export function computeCols(viewportWidth = window.innerWidth) {
  if (viewportWidth < 420) return 1;
  if (viewportWidth < 768) return 2;
  return 3; // tablets/desktop
}
