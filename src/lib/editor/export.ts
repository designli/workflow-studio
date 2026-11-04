import { getNodesBounds, getViewportForBounds } from "@xyflow/react";
import { toPng } from "html-to-image";
import type { FlowNode } from "./store";

function safeName(s: string) {
  return s.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "workflow";
}

/** Render the current page to a PNG file and trigger a download. */
export async function exportPng(wrapper: HTMLElement, nodes: FlowNode[], name: string): Promise<void> {
  const viewport = wrapper.querySelector<HTMLElement>(".react-flow__viewport");
  if (!viewport || nodes.length === 0) return;
  const bounds = getNodesBounds(nodes);
  const padding = 48;
  const width = Math.ceil(bounds.width + padding * 2);
  const height = Math.ceil(bounds.height + padding * 2);
  const { x, y, zoom } = getViewportForBounds(bounds, width, height, 0.1, 4, padding);
  wrapper.classList.add("exporting");
  try {
    const dataUrl = await toPng(viewport, {
      backgroundColor: "#ffffff",
      width,
      height,
      pixelRatio: 2,
      style: { width: `${width}px`, height: `${height}px`, transform: `translate(${x}px, ${y}px) scale(${zoom})` },
      filter: (node) => {
        const cls = (node as HTMLElement).classList;
        return !cls || !(cls.contains("react-flow__handle") || cls.contains("react-flow__resize-control"));
      },
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${safeName(name)}.png`;
    a.click();
  } finally {
    wrapper.classList.remove("exporting");
  }
}
