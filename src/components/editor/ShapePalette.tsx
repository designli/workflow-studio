"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { useReactFlow } from "@xyflow/react";
import { Columns3 } from "lucide-react";
import { SHAPES, SHAPE_BY_KIND, SWIMLANE_DEFAULT, shapeGeometry, type ShapeDef } from "@/lib/editor/shapes";
import { useEditor } from "@/lib/editor/store";
import type { ShapeKind } from "@/lib/types";

function Preview({ def, className = "h-8 w-14" }: { def: ShapeDef; className?: string }) {
  const geo = shapeGeometry(def.kind, def.w, def.h);
  return (
    <svg viewBox={`-3 -3 ${def.w + 6} ${def.h + 6}`} className={className} preserveAspectRatio="xMidYMid meet" aria-hidden>
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

type Kind = ShapeKind | "swimlane";
type Drag = { kind: Kind; startX: number; startY: number; x: number; y: number; moved: boolean; over: boolean };

const DRAG_START_PX = 5;

/**
 * Shape library. Press on a shape and drag it onto the board (a ghost follows
 * the pointer; works with mouse, pen and touch), or just click it to add it in
 * the middle of the view.
 */
export function ShapePalette({ canvasRef }: { canvasRef: React.RefObject<HTMLDivElement | null> }) {
  const { screenToFlowPosition, getZoom } = useReactFlow();
  const [drag, setDrag] = React.useState<Drag | null>(null);
  const dragRef = React.useRef<Drag | null>(null);

  const centerOfView = () => {
    const el = canvasRef.current;
    const r = el?.getBoundingClientRect();
    return screenToFlowPosition(r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 400, y: 300 });
  };
  const addAt = (kind: Kind, pos: { x: number; y: number }, edit: boolean) => {
    const s = useEditor.getState();
    if (kind === "swimlane") s.addSwimlane(pos);
    else {
      const id = s.addShape(kind, pos);
      if (edit) s.setEditing(id);
    }
  };
  const overCanvas = (x: number, y: number) => {
    const r = canvasRef.current?.getBoundingClientRect();
    return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  const update = (d: Drag | null) => {
    dragRef.current = d;
    setDrag(d);
  };
  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const kind = e.currentTarget.dataset.kind as Kind;
    e.currentTarget.setPointerCapture(e.pointerId);
    update({ kind, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, moved: false, over: false });
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const moved = d.moved || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) >= DRAG_START_PX;
    const over = moved && overCanvas(e.clientX, e.clientY);
    update({ ...d, x: e.clientX, y: e.clientY, moved, over });
    canvasRef.current?.classList.toggle("drop-target", over);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => finish(e, true);
  const onPointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => finish(e, false);
  const onDragStart = (e: React.DragEvent) => e.preventDefault();
  const finish = (e: React.PointerEvent<HTMLButtonElement>, drop: boolean) => {
    const d = dragRef.current;
    update(null);
    canvasRef.current?.classList.remove("drop-target");
    if (!d) return;
    if (!d.moved) {
      if (drop) addAt(d.kind, centerOfView(), true);
      return;
    }
    if (drop && overCanvas(e.clientX, e.clientY)) addAt(d.kind, screenToFlowPosition({ x: e.clientX, y: e.clientY }), false);
  };

  const handlers = { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onDragStart };

  // The ghost that follows the pointer, sized like the shape at the current zoom.
  let ghost: React.ReactNode = null;
  if (drag?.moved && typeof document !== "undefined") {
    const zoom = getZoom();
    const def = drag.kind === "swimlane" ? null : SHAPE_BY_KIND[drag.kind];
    const w = (def ? def.w : SWIMLANE_DEFAULT.w) * zoom;
    const h = (def ? def.h : SWIMLANE_DEFAULT.h) * zoom;
    ghost = createPortal(
      <div
        className="pointer-events-none fixed z-[1000]"
        style={{ left: drag.x - w / 2, top: drag.y - h / 2, width: w, height: h, opacity: drag.over ? 0.9 : 0.45 }}
      >
        {def ? (
          <Preview def={def} className="h-full w-full" />
        ) : (
          <div className="h-full w-full rounded-md border-2 border-[#6b6b6b] bg-white/80" />
        )}
      </div>,
      document.body,
    );
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
      <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Shapes</div>
      <p className="px-3 pb-2 text-[11px] text-muted-foreground">Drag onto the board, or click to add.</p>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <button
          type="button"
          data-kind="swimlane"
          {...handlers}
          title="Swimlane: horizontal lanes, one per role or team"
          className="mb-1 flex w-full cursor-grab touch-none select-none items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted active:cursor-grabbing"
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
            data-kind={def.kind}
            {...handlers}
            title={def.hint}
            className="flex w-full cursor-grab touch-none select-none items-center gap-2 rounded-lg px-2 py-1 text-left text-sm hover:bg-muted active:cursor-grabbing"
          >
            <Preview def={def} />
            <span className="leading-tight">{def.name}</span>
          </button>
        ))}
      </div>
      {ghost}
    </aside>
  );
}
