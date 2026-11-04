"use client";
import * as React from "react";
import { useReactFlow } from "@xyflow/react";
import { Columns3 } from "lucide-react";
import { SHAPES, shapeGeometry, type ShapeDef } from "@/lib/editor/shapes";
import { useEditor } from "@/lib/editor/store";
import { DRAG_MIME } from "./Canvas";
import type { ShapeKind } from "@/lib/types";

function Preview({ def }: { def: ShapeDef }) {
  const geo = shapeGeometry(def.kind, def.w, def.h);
  return (
    <svg viewBox={`-3 -3 ${def.w + 6} ${def.h + 6}`} className="h-8 w-14" preserveAspectRatio="xMidYMid meet" aria-hidden>
      {geo.behind.map((d, i) => (
        <path key={i} d={d} fill="#fff" stroke="#6b6b6b" strokeWidth={3} strokeLinejoin="round" />
      ))}
      <path d={geo.main} fill="#fff" stroke="#6b6b6b" strokeWidth={3} strokeLinejoin="round" />
      {geo.lines.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#6b6b6b" strokeWidth={3} />
      ))}
    </svg>
  );
}

export function ShapePalette({ canvasRef }: { canvasRef: React.RefObject<HTMLDivElement | null> }) {
  const { screenToFlowPosition } = useReactFlow();

  const centerOfView = () => {
    const el = canvasRef.current;
    const r = el?.getBoundingClientRect();
    return screenToFlowPosition(r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 400, y: 300 });
  };
  const add = (kind: ShapeKind | "swimlane") => {
    const s = useEditor.getState();
    const pos = centerOfView();
    if (kind === "swimlane") s.addSwimlane(pos);
    else {
      const id = s.addShape(kind, pos);
      s.setEditing(id);
    }
  };
  const startDrag = (kind: string) => (e: React.DragEvent) => {
    e.dataTransfer.setData(DRAG_MIME, kind);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
      <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Shapes</div>
      <p className="px-3 pb-2 text-[11px] text-muted-foreground">Drag onto the canvas, or click to add.</p>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <button
          type="button"
          draggable
          onDragStart={startDrag("swimlane")}
          onClick={() => add("swimlane")}
          title="Swimlane: horizontal lanes, one per role or team"
          className="mb-1 flex w-full cursor-grab items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted active:cursor-grabbing"
        >
          <span className="flex h-8 w-14 items-center justify-center rounded border border-[#6b6b6b] bg-white text-[#6b6b6b]">
            <Columns3 size={18} className="rotate-90" />
          </span>
          <span>Swimlane</span>
        </button>
        <div className="my-2 border-t border-border" />
        {SHAPES.map((def) => (
          <button
            key={def.kind}
            type="button"
            draggable
            onDragStart={startDrag(def.kind)}
            onClick={() => add(def.kind)}
            title={def.hint}
            className="flex w-full cursor-grab items-center gap-2 rounded-lg px-2 py-1 text-left text-sm hover:bg-muted active:cursor-grabbing"
          >
            <Preview def={def} />
            <span className="leading-tight">{def.name}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
