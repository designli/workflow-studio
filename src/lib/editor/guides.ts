// Alignment guides: while one shape is dragged, snap its edges and center to
// the edges/centers of the other shapes (and to lane centers) and report the
// guide lines to draw.

export type Rect = { x: number; y: number; w: number; h: number };
export type Guides = { v: number | null; h: number | null };

const EMPTY: Guides = { v: null, h: null };

function best(mine: number[], theirs: number[], threshold: number): { delta: number; line: number } | null {
  let out: { delta: number; line: number } | null = null;
  for (const m of mine) {
    for (const t of theirs) {
      const d = t - m;
      if (Math.abs(d) <= threshold && (!out || Math.abs(d) < Math.abs(out.delta))) out = { delta: d, line: t };
    }
  }
  return out;
}

/**
 * Returns the snapped position for `r` plus the guide lines that justify it.
 * `xLines` / `yLines` are candidate coordinates taken from the other shapes.
 */
export function snapRect(
  r: Rect,
  xLines: number[],
  yLines: number[],
  threshold = 14,
): { x: number; y: number; guides: Guides } {
  const mineX = [r.x, r.x + r.w / 2, r.x + r.w];
  const mineY = [r.y, r.y + r.h / 2, r.y + r.h];
  const bx = best(mineX, xLines, threshold);
  const by = best(mineY, yLines, threshold);
  return {
    x: bx ? r.x + bx.delta : r.x,
    y: by ? r.y + by.delta : r.y,
    guides: bx || by ? { v: bx ? bx.line : null, h: by ? by.line : null } : EMPTY,
  };
}

export function rectLines(o: Rect): { x: number[]; y: number[] } {
  return { x: [o.x, o.x + o.w / 2, o.x + o.w], y: [o.y, o.y + o.h / 2, o.y + o.h] };
}
