import type { Lane, StoredNode, SwimlaneData } from "@/lib/types";
import { newId } from "@/lib/ids";
import { SWIMLANE_DEFAULT } from "./shapes";

export const TITLE_HEIGHT = 36;
export const MIN_LANE = 60;

export function swimlaneHeight(data: SwimlaneData): number {
  return data.lanes.reduce((n, l) => n + l.size, 0) + (data.title ? TITLE_HEIGHT : 0);
}

export function newLane(label: string, size = SWIMLANE_DEFAULT.laneSize): Lane {
  return { id: newId(), label, size };
}

export function defaultSwimlaneData(): SwimlaneData {
  return {
    kind: "swimlane",
    labelSize: SWIMLANE_DEFAULT.labelSize,
    lanes: [newLane("Lane 1"), newLane("Lane 2"), newLane("Lane 3")],
  };
}

/** Top offset (inside the node) where lane `index` starts. */
export function laneTop(data: SwimlaneData, index: number): number {
  let y = data.title ? TITLE_HEIGHT : 0;
  for (let i = 0; i < index; i++) y += data.lanes[i].size;
  return y;
}

type Rect = { x: number; y: number; width: number; height: number };

export function nodeRect(n: { position: { x: number; y: number }; width?: number; height?: number }, fallbackW = 0, fallbackH = 0): Rect {
  return { x: n.position.x, y: n.position.y, width: n.width ?? fallbackW, height: n.height ?? fallbackH };
}

export function centerInside(inner: Rect, outer: Rect): boolean {
  const cx = inner.x + inner.width / 2;
  const cy = inner.y + inner.height / 2;
  return cx >= outer.x && cx <= outer.x + outer.width && cy >= outer.y && cy <= outer.y + outer.height;
}

/** Index of the lane whose band contains the shape's center, or -1. */
export function laneIndexOf(shape: Rect, lane: { position: { x: number; y: number }; data: SwimlaneData }): number {
  const cy = shape.y + shape.height / 2 - lane.position.y;
  let y = lane.data.title ? TITLE_HEIGHT : 0;
  for (let i = 0; i < lane.data.lanes.length; i++) {
    if (cy >= y && cy < y + lane.data.lanes[i].size) return i;
    y += lane.data.lanes[i].size;
  }
  return -1;
}

export function isStoredSwimlane(n: StoredNode): n is StoredNode & { data: SwimlaneData } {
  return n.type === "swimlane";
}
