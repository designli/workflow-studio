"use client";
import * as React from "react";
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, getStraightPath, type EdgeProps } from "@xyflow/react";
import { useEditor, type FlowEdge as FlowEdgeType } from "@/lib/editor/store";
import { TextEditor } from "../nodes/TextEditor";

export const FlowEdge = React.memo(function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  label,
  selected,
  data,
}: EdgeProps<FlowEdgeType>) {
  const style = data?.style ?? "smoothstep";
  const [path, lx, ly] =
    style === "straight"
      ? getStraightPath({ sourceX, sourceY, targetX, targetY })
      : getSmoothStepPath({
          sourceX,
          sourceY,
          sourcePosition,
          targetX,
          targetY,
          targetPosition,
          borderRadius: style === "step" ? 0 : 10,
          offset: 24,
        });
  const editing = useEditor((s) => s.editingId === id);
  const setEditing = useEditor((s) => s.setEditing);
  const updateEdge = useEditor((s) => s.updateEdge);
  const text = typeof label === "string" ? label : "";
  const showChip = editing || text.length > 0 || selected;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        interactionWidth={24}
        style={{ strokeDasharray: data?.dashed ? "7 5" : undefined }}
      />
      {showChip && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan absolute"
            style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)`, pointerEvents: "all" }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditing(id);
            }}
          >
            {editing ? (
              <TextEditor
                value={text}
                multiline={false}
                onCommit={(v) => {
                  updateEdge(id, { label: v.trim() });
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
                className="w-28 rounded-md border border-brand-coral bg-white px-2 py-0.5 text-center text-xs outline-none"
              />
            ) : (
              <span
                className="inline-block rounded-md border bg-white px-1.5 py-0.5 text-xs leading-tight"
                style={{
                  borderColor: selected ? "var(--brand-coral)" : "#d0d0d0",
                  color: text ? "#1f1f1f" : "#9a9a9a",
                }}
              >
                {text || "+ label"}
              </span>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
