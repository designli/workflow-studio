"use client";
import * as React from "react";
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";
import { CornerDownRight } from "lucide-react";
import { SHAPE_BY_KIND, shapeGeometry } from "@/lib/editor/shapes";
import { beginInteraction, endInteraction, useEditor, type ShapeFlowNode } from "@/lib/editor/store";
import { TextEditor } from "./TextEditor";

function readableText(fill: string): string {
  const hex = fill.replace("#", "");
  if (hex.length !== 6) return "#1f1f1f";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? "#1f1f1f" : "#ffffff";
}

export const ShapeNode = React.memo(function ShapeNode({ id, data, selected, width, height }: NodeProps<ShapeFlowNode>) {
  const def = SHAPE_BY_KIND[data.shape];
  const w = width ?? def.w;
  const h = height ?? def.h;
  const geo = React.useMemo(() => shapeGeometry(data.shape, w, h), [data.shape, w, h]);
  const editing = useEditor((s) => s.editingId === id);
  const setEditing = useEditor((s) => s.setEditing);
  const updateNodeData = useEditor((s) => s.updateNodeData);
  const openSubDiagram = useEditor((s) => s.openSubDiagram);
  const isSub = data.shape === "predefined";

  const onDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSub) openSubDiagram(id);
    else setEditing(id);
  };

  const inset = def.inset;
  const textColor = readableText(data.fill);
  const fontSize = data.fontSize ?? 14;

  return (
    <div className="relative" style={{ width: w, height: h }} onDoubleClick={onDoubleClick}>
      <NodeResizer
        isVisible={!!selected && !editing}
        minWidth={32}
        minHeight={24}
        keepAspectRatio={def.keepAspect}
        onResizeStart={beginInteraction}
        onResizeEnd={endInteraction}
      />
      <svg width={w} height={h} overflow="visible" className="absolute inset-0 block" aria-hidden>
        {geo.behind.map((d, i) => (
          <path key={`b${i}`} d={d} fill={data.fill} stroke={data.stroke} strokeWidth={2} strokeLinejoin="round" />
        ))}
        <path d={geo.main} fill={data.fill} stroke={data.stroke} strokeWidth={2} strokeLinejoin="round" />
        {geo.lines.map((d, i) => (
          <path key={`l${i}`} d={d} fill="none" stroke={data.stroke} strokeWidth={2} strokeLinecap="round" />
        ))}
      </svg>
      <div
        className="absolute flex items-center justify-center"
        style={{ top: h * inset.t, left: w * inset.l, right: w * inset.r, bottom: h * inset.b }}
      >
        {editing ? (
          <TextEditor
            value={data.label}
            onCommit={(v) => {
              updateNodeData(id, { label: v.trim() });
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
            className="h-full w-full resize-none bg-transparent text-center leading-snug outline-none"
            style={{ fontSize, color: textColor }}
          />
        ) : (
          <span
            className="max-h-full w-full overflow-hidden whitespace-pre-wrap break-words text-center leading-snug select-none"
            style={{ fontSize, color: textColor }}
          >
            {data.label || (selected ? <span className="opacity-40">Type…</span> : null)}
          </span>
        )}
      </div>
      {isSub && (
        <button
          type="button"
          title="Open sub-process"
          onClick={(e) => {
            e.stopPropagation();
            openSubDiagram(id);
          }}
          className="nodrag absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-[#6b6b6b] bg-white text-[#6b6b6b] shadow-sm hover:bg-brand-coral hover:text-brand-navy"
          style={{ opacity: selected || data.subDiagramId ? 1 : 0.35 }}
        >
          <CornerDownRight size={11} />
        </button>
      )}
      <Handle type="source" position={Position.Top} id="top" />
      <Handle type="source" position={Position.Right} id="right" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="source" position={Position.Left} id="left" />
    </div>
  );
});
