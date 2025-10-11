// src/features/board/layout.ts
import type { BoardItem } from "./api/items";
import { CARD_W, GAP, ORIGIN_X, ORIGIN_Y } from "./constants";

export function estimateTextHeight(caption?: string, description?: string) {
  const titleLines = caption ? Math.ceil(caption.length / 18) : 0;
  const bodyLines  = description ? Math.ceil(description.length / 36) : 0;
  return titleLines * 24 + bodyLines * 20 + (caption ? 20 : 0) + (description ? 6 : 0);
}

export function buildColumnHeights(items: BoardItem[], cols: number) {
  const colW = CARD_W + GAP;
  const H = new Array(cols).fill(ORIGIN_Y);
  for (const it of items) {
    const idx = Math.max(0, Math.min(cols - 1, Math.round((Number(it.x) - ORIGIN_X) / colW)));
    const h = (Number(it.height) || 0) + GAP;
    H[idx] = Math.max(H[idx], (Number(it.y) || ORIGIN_Y) + h);
  }
  return H;
}

export function randomTilt(max = 7) {
  const n = Math.floor(Math.random() * (max - 3) + 3); // 3..max
  return Math.random() < 0.5 ? -n : n;
}

/**
 * Center-biased organic placement:
 * - prefers middle columns using a Gaussian weight,
 * - sometimes picks second-best to avoid strict symmetry,
 * - adds small x/y jitter,
 * - updates columnHeights to reserve space.
 */
export function organicNextPosition(
  columnHeights: number[],
  cols: number,
  itemHeight: number,
  opts: { jitterX?: number; jitterY?: number; sigma?: number; biasSecond?: number } = {}
) {
  const { jitterX = 10, jitterY = 6, sigma = Math.max(1, cols / 3), biasSecond = 0.28 } = opts;

  // center Gaussian weight
  const mid = (cols - 1) / 2;
  const weight: number[] = Array.from({ length: cols }, (_, c) => {
    const dx = (c - mid) / sigma;
    return Math.exp(-0.5 * dx * dx); // 1 in center, decays to edges
  });

  // “effective height” -> lower is better
  const eff = columnHeights.map((h, c) => h / Math.max(0.25, weight[c]));

  const order = [...Array(cols).keys()].sort((a, b) => eff[a] - eff[b]);
  const pick = (Math.random() < biasSecond && cols > 1) ? order[1] : order[0];

  const baseX = ORIGIN_X + pick * (CARD_W + GAP);
  const x = baseX + Math.round((Math.random() * 2 - 1) * jitterX);
  const y = columnHeights[pick] + Math.round((Math.random() * 2 - 1) * jitterY);

  // reserve space
  columnHeights[pick] = y + itemHeight + GAP;

  return { x, y, col: pick };
}
