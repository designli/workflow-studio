import dagre from "@dagrejs/dagre";
import type { FlowEdge, FlowNode } from "./store";
import { SHAPE_BY_KIND, SWIMLANE_DEFAULT } from "./shapes";
import { laneIndexOf, laneTop, nodeRect } from "./swimlane";

/**
 * Tidy the current page. Without a swimlane: top-to-bottom tree. With one: left-to-right
 * ranks, and every shape stays centred in the lane it already sits in.
 */
export function autoLayout(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  const shapes = nodes.filter((n): n is Extract<FlowNode, { type: "shape" }> => n.type === "shape");
  if (shapes.length === 0) return nodes;
  const lane = nodes.find((n) => n.type === "swimlane");
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: lane ? "LR" : "TB", nodesep: 48, ranksep: 72, marginx: 20, marginy: 20 });
  const size = (n: FlowNode) => ({
    width: n.width ?? n.measured?.width ?? (n.type === "shape" ? SHAPE_BY_KIND[n.data.shape].w : SWIMLANE_DEFAULT.w),
    height: n.height ?? n.measured?.height ?? (n.type === "shape" ? SHAPE_BY_KIND[n.data.shape].h : SWIMLANE_DEFAULT.h),
  });
  for (const n of shapes) g.setNode(n.id, size(n));
  const ids = new Set(shapes.map((n) => n.id));
  for (const e of edges) if (ids.has(e.source) && ids.has(e.target)) g.setEdge(e.source, e.target);
  dagre.layout(g);

  if (!lane || lane.type !== "swimlane") {
    const minX = Math.min(...shapes.map((n) => g.node(n.id).x - size(n).width / 2));
    const minY = Math.min(...shapes.map((n) => g.node(n.id).y - size(n).height / 2));
    const ox = 80 - minX;
    const oy = 80 - minY;
    return nodes.map((n) => {
      if (n.type !== "shape") return n;
      const p = g.node(n.id);
      const s = size(n);
      return { ...n, position: { x: Math.round(p.x - s.width / 2 + ox), y: Math.round(p.y - s.height / 2 + oy) } };
    });
  }

  const laneX0 = lane.position.x + lane.data.labelSize + 40;
  const minX = Math.min(...shapes.map((n) => g.node(n.id).x - size(n).width / 2));
  return nodes.map((n) => {
    if (n.type !== "shape") return n;
    const s = size(n);
    const p = g.node(n.id);
    const li = laneIndexOf(nodeRect(n, s.width, s.height), lane);
    let y = n.position.y;
    if (li >= 0) {
      const band = lane.data.lanes[li];
      y = lane.position.y + laneTop(lane.data, li) + band.size / 2 - s.height / 2;
    }
    return { ...n, position: { x: Math.round(laneX0 + p.x - s.width / 2 - minX), y: Math.round(y) } };
  });
}
