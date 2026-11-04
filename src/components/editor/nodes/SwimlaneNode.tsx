"use client";
import * as React from "react";
import { NodeResizeControl, ResizeControlVariant, useReactFlow, type NodeProps } from "@xyflow/react";
import { beginInteraction, endInteraction, useEditor, type SwimlaneFlowNode } from "@/lib/editor/store";
import { SWIMLANE_DEFAULT } from "@/lib/editor/shapes";
import { TITLE_HEIGHT, swimlaneHeight } from "@/lib/editor/swimlane";
import { TextEditor } from "./TextEditor";

const STROKE = "#6b6b6b";
const DIVIDER = "#9a9a9a";

export const SwimlaneNode = React.memo(function SwimlaneNode({ id, data, selected, width }: NodeProps<SwimlaneFlowNode>) {
  const w = width ?? SWIMLANE_DEFAULT.w;
  const h = swimlaneHeight(data);
  const { getZoom } = useReactFlow();
  const resizeLane = useEditor((s) => s.resizeLane);
  const updateNodeData = useEditor((s) => s.updateNodeData);
  const [editingLane, setEditingLane] = React.useState<number | "title" | null>(null);

  const startDividerDrag = (laneIndex: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    let lastY = e.clientY;
    beginInteraction();
    const onMove = (ev: PointerEvent) => {
      const delta = (ev.clientY - lastY) / getZoom();
      if (Math.abs(delta) < 0.5) return;
      lastY = ev.clientY;
      resizeLane(id, laneIndex, delta);
    };
    const onUp = () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      endInteraction();
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
  };

  let y = data.title ? TITLE_HEIGHT : 0;
  const lanes = data.lanes.map((lane, i) => {
    const top = y;
    y += lane.size;
    return { lane, top, i };
  });

  return (
    <div className="relative" style={{ width: w, height: h, pointerEvents: "none" }}>
      {selected && (
        <>
          <NodeResizeControl position="left" variant={ResizeControlVariant.Line} minWidth={320} onResizeStart={beginInteraction} onResizeEnd={endInteraction} style={{ pointerEvents: "all" }} />
          <NodeResizeControl position="right" variant={ResizeControlVariant.Line} minWidth={320} onResizeStart={beginInteraction} onResizeEnd={endInteraction} style={{ pointerEvents: "all" }} />
        </>
      )}
      <div
        className="absolute inset-0 rounded-md"
        style={{ border: `2px solid ${selected ? "var(--brand-coral)" : STROKE}`, background: "#ffffff" }}
      />
      {data.title !== undefined && data.title !== null && (
        <div
          className="lane-drag-handle absolute left-0 right-0 flex cursor-grab items-center justify-center text-[15px] font-semibold active:cursor-grabbing"
          style={{ top: 0, height: TITLE_HEIGHT, borderBottom: `1.5px solid ${DIVIDER}`, pointerEvents: "all", color: "#1f1f1f" }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setEditingLane("title");
          }}
        >
          {editingLane === "title" ? (
            <TextEditor
              value={data.title}
              multiline={false}
              onCommit={(v) => {
                updateNodeData(id, { title: v.trim() });
                setEditingLane(null);
              }}
              onCancel={() => setEditingLane(null)}
              className="w-2/3 rounded border border-brand-coral bg-white px-2 text-center text-[15px] font-semibold outline-none"
            />
          ) : (
            data.title || <span className="opacity-40">Title</span>
          )}
        </div>
      )}
      {lanes.map(({ lane, top, i }) => (
        <React.Fragment key={lane.id}>
          {/* lane band (behind shapes, lets clicks through to the canvas) */}
          <div
            className="absolute left-0 right-0"
            style={{
              top,
              height: lane.size,
              background: lane.fill ?? "transparent",
              borderTop: i > 0 ? `1.5px solid ${DIVIDER}` : undefined,
              borderRadius: i === 0 ? "6px 6px 0 0" : i === lanes.length - 1 ? "0 0 6px 6px" : undefined,
            }}
          />
          {/* label column: the drag handle for the whole swimlane */}
          <div
            className="lane-drag-handle absolute left-0 flex cursor-grab items-center justify-center px-2 text-center text-base font-bold leading-tight active:cursor-grabbing"
            style={{
              top,
              height: lane.size,
              width: data.labelSize,
              borderRight: `1.5px solid ${DIVIDER}`,
              borderTop: i > 0 ? `1.5px solid ${DIVIDER}` : undefined,
              pointerEvents: "all",
              color: "#1f1f1f",
              background: lane.fill ?? "#ffffff",
              borderRadius: i === 0 ? "6px 0 0 0" : i === lanes.length - 1 ? "0 0 0 6px" : undefined,
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditingLane(i);
            }}
          >
            {editingLane === i ? (
              <TextEditor
                value={lane.label}
                onCommit={(v) => {
                  updateNodeData(id, { lanes: data.lanes.map((l, j) => (j === i ? { ...l, label: v.trim() || l.label } : l)) });
                  setEditingLane(null);
                }}
                onCancel={() => setEditingLane(null)}
                className="h-full w-full resize-none bg-white text-center text-base font-bold leading-tight outline-none"
              />
            ) : (
              <span className="whitespace-pre-wrap break-words select-none">{lane.label}</span>
            )}
          </div>
          {/* divider drag strip */}
          {i < lanes.length - 1 && (
            <div
              className="nodrag nopan absolute left-0 right-0 z-10"
              style={{ top: top + lane.size - 4, height: 8, cursor: "row-resize", pointerEvents: "all" }}
              onPointerDown={startDividerDrag(i)}
              title="Drag to resize lane"
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
});
