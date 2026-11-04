"use client";
import * as React from "react";
import { useReactFlow } from "@xyflow/react";
import { ArrowDown, ArrowUp, CornerDownRight, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { FILL_SWATCHES, SHAPES, SHAPE_BY_KIND, STROKE_SWATCHES } from "@/lib/editor/shapes";
import { beginInteraction, endInteraction, useEditor, type FlowEdge, type FlowNode } from "@/lib/editor/store";
import { newLane } from "@/lib/editor/swimlane";
import type { EdgeStyle, Lane, ShapeKind } from "@/lib/types";
import { Button } from "@/components/ui/button";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function Swatches({
  options,
  value,
  onPick,
  ring,
}: {
  options: { name: string; value: string }[];
  value: string | undefined;
  onPick: (v: string) => void;
  ring?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.name}
          onClick={() => onPick(o.value)}
          className={cn(
            "h-7 w-7 rounded-full border transition",
            value?.toLowerCase() === o.value.toLowerCase() ? "ring-2 ring-brand-coral ring-offset-1" : "border-border",
          )}
          style={ring ? { background: "#fff", boxShadow: `inset 0 0 0 3px ${o.value}` } : { background: o.value }}
        />
      ))}
    </div>
  );
}

const inputCls = "h-8 w-full rounded-md border border-border bg-card px-2 text-sm outline-none focus:ring-2 focus:ring-ring/40";

export function Inspector() {
  const nodes = useEditor((s) => s.nodes);
  const edges = useEditor((s) => s.edges);
  const updateNodeData = useEditor((s) => s.updateNodeData);
  const updateSelectedShapes = useEditor((s) => s.updateSelectedShapes);
  const setNodeSize = useEditor((s) => s.setNodeSize);
  const updateEdge = useEditor((s) => s.updateEdge);
  const openSubDiagram = useEditor((s) => s.openSubDiagram);
  const setLanes = useEditor((s) => s.setLanes);
  const { deleteElements } = useReactFlow();

  const selNodes = nodes.filter((n) => n.selected);
  const selEdges = edges.filter((e) => e.selected);
  const shapes = selNodes.filter((n): n is Extract<FlowNode, { type: "shape" }> => n.type === "shape");
  const one = selNodes.length === 1 ? selNodes[0] : null;
  const oneEdge = selNodes.length === 0 && selEdges.length === 1 ? selEdges[0] : null;

  const remove = () => void deleteElements({ nodes: selNodes, edges: selEdges });

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-l border-border bg-card p-3 text-sm">
      {selNodes.length === 0 && selEdges.length === 0 && <EmptyHelp />}

      {one?.type === "shape" && <ShapeFields node={one} />}

      {shapes.length > 0 && (
        <>
          <Section title="Fill">
            <Swatches
              options={FILL_SWATCHES}
              value={shapes.every((n) => n.data.fill === shapes[0].data.fill) ? shapes[0].data.fill : undefined}
              onPick={(v) => updateSelectedShapes({ fill: v })}
            />
          </Section>
          <Section title="Outline">
            <Swatches
              ring
              options={STROKE_SWATCHES}
              value={shapes.every((n) => n.data.stroke === shapes[0].data.stroke) ? shapes[0].data.stroke : undefined}
              onPick={(v) => updateSelectedShapes({ stroke: v })}
            />
          </Section>
          <Section title="Text size">
            <div className="flex gap-1">
              {[12, 14, 16, 20].map((fs) => (
                <button
                  key={fs}
                  type="button"
                  onClick={() => updateSelectedShapes({ fontSize: fs })}
                  className={cn(
                    "h-8 flex-1 rounded-md border border-border text-xs hover:bg-muted",
                    shapes.every((n) => (n.data.fontSize ?? 14) === fs) && "bg-brand-navy text-white hover:bg-brand-navy",
                  )}
                >
                  {fs}
                </button>
              ))}
            </div>
          </Section>
        </>
      )}

      {one?.type === "shape" && (
        <Section title="Size">
          <div className="flex items-center gap-2">
            <input
              type="number"
              className={inputCls}
              value={Math.round(one.width ?? SHAPE_BY_KIND[one.data.shape].w)}
              onChange={(e) => setNodeSize(one.id, Number(e.target.value), one.height ?? SHAPE_BY_KIND[one.data.shape].h)}
              aria-label="Width"
            />
            <span className="text-muted-foreground">×</span>
            <input
              type="number"
              className={inputCls}
              value={Math.round(one.height ?? SHAPE_BY_KIND[one.data.shape].h)}
              onChange={(e) => setNodeSize(one.id, one.width ?? SHAPE_BY_KIND[one.data.shape].w, Number(e.target.value))}
              aria-label="Height"
            />
          </div>
        </Section>
      )}

      {one?.type === "shape" && one.data.shape === "predefined" && (
        <Section title="Sub-process">
          <Button variant="primary" size="sm" className="w-full" onClick={() => openSubDiagram(one.id)}>
            <CornerDownRight size={14} /> {one.data.subDiagramId ? "Open sub-process" : "Create sub-process"}
          </Button>
          <p className="mt-1.5 text-xs text-muted-foreground">Or double-click the shape on the canvas.</p>
        </Section>
      )}

      {one?.type === "swimlane" && (
        <SwimlaneFields
          id={one.id}
          title={one.data.title}
          lanes={one.data.lanes}
          labelSize={one.data.labelSize}
          onLanes={(lanes) => setLanes(one.id, lanes)}
          onTitle={(t) => updateNodeData(one.id, { title: t })}
          onLabelSize={(n) => updateNodeData(one.id, { labelSize: n })}
        />
      )}

      {oneEdge && <EdgeFields edge={oneEdge} onChange={(patch) => updateEdge(oneEdge.id, patch)} />}

      {(selNodes.length > 0 || selEdges.length > 0) && (
        <div className="mt-auto pt-2">
          <Button variant="ghost" size="sm" className="w-full text-destructive hover:bg-destructive/10" onClick={remove}>
            <Trash2 size={14} /> Delete {selNodes.length + selEdges.length > 1 ? `${selNodes.length + selEdges.length} items` : ""}
          </Button>
        </div>
      )}
    </aside>
  );
}

function EmptyHelp() {
  return (
    <div className="text-xs leading-relaxed text-muted-foreground">
      <p className="mb-2 text-sm font-semibold text-foreground">Tips</p>
      <ul className="space-y-1.5">
        <li>Drag a shape from the left, or click it to add one.</li>
        <li>Double-click a shape to type its text.</li>
        <li>Drag from a shape&apos;s edge dot to another shape to connect them.</li>
        <li>Double-click a <strong>Predefined process</strong> to open the sub-process inside it.</li>
        <li>Pages (tabs) live at the bottom.</li>
        <li>Scroll to pan, Ctrl + scroll to zoom. Hold Space to drag the canvas.</li>
        <li>Ctrl+Z undo, Ctrl+C / Ctrl+V copy and paste, Delete removes.</li>
      </ul>
    </div>
  );
}

function ShapeFields({ node }: { node: Extract<FlowNode, { type: "shape" }> }) {
  const updateNodeData = useEditor((s) => s.updateNodeData);
  return (
    <>
      <Section title="Text">
        <textarea
          className={cn(inputCls, "h-20 resize-none py-1.5")}
          value={node.data.label}
          placeholder="Type the step…"
          onFocus={beginInteraction}
          onBlur={endInteraction}
          onChange={(e) => updateNodeData(node.id, { label: e.target.value })}
        />
      </Section>
      <Section title="Shape">
        <select
          className={inputCls}
          value={node.data.shape}
          onChange={(e) => updateNodeData(node.id, { shape: e.target.value as ShapeKind })}
        >
          {SHAPES.map((s) => (
            <option key={s.kind} value={s.kind}>
              {s.name}
            </option>
          ))}
        </select>
      </Section>
    </>
  );
}

function SwimlaneFields({
  title,
  lanes,
  labelSize,
  onLanes,
  onTitle,
  onLabelSize,
}: {
  id: string;
  title?: string;
  lanes: Lane[];
  labelSize: number;
  onLanes: (lanes: Lane[]) => void;
  onTitle: (t: string) => void;
  onLabelSize: (n: number) => void;
}) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= lanes.length) return;
    const next = lanes.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onLanes(next);
  };
  return (
    <>
      <Section title="Title (optional)">
        <input
          className={inputCls}
          value={title ?? ""}
          placeholder="e.g. Hiring process"
          onFocus={beginInteraction}
          onBlur={endInteraction}
          onChange={(e) => onTitle(e.target.value)}
        />
      </Section>
      <Section title="Lanes">
        <div className="space-y-1.5">
          {lanes.map((lane, i) => (
            <div key={lane.id} className="flex items-center gap-1">
              <input
                className={cn(inputCls, "flex-1")}
                value={lane.label}
                onFocus={beginInteraction}
                onBlur={endInteraction}
                onChange={(e) => onLanes(lanes.map((l, j) => (j === i ? { ...l, label: e.target.value } : l)))}
                aria-label={`Lane ${i + 1} name`}
              />
              <button type="button" title="Move up" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 hover:bg-muted disabled:opacity-30">
                <ArrowUp size={14} />
              </button>
              <button type="button" title="Move down" onClick={() => move(i, 1)} disabled={i === lanes.length - 1} className="rounded p-1 hover:bg-muted disabled:opacity-30">
                <ArrowDown size={14} />
              </button>
              <button
                type="button"
                title="Remove lane"
                disabled={lanes.length <= 1}
                onClick={() => onLanes(lanes.filter((_, j) => j !== i))}
                className="rounded p-1 text-destructive hover:bg-destructive/10 disabled:opacity-30"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <Button size="sm" variant="secondary" className="mt-2 w-full" onClick={() => onLanes([...lanes, newLane(`Lane ${lanes.length + 1}`)])}>
          <Plus size={14} /> Add lane
        </Button>
        <p className="mt-1.5 text-xs text-muted-foreground">Drag the line between two lanes on the canvas to change a lane&apos;s height.</p>
      </Section>
      <Section title="Lane colors">
        <div className="space-y-1.5">
          {lanes.map((lane, i) => (
            <div key={lane.id} className="flex items-center gap-2">
              <span className="w-20 truncate text-xs">{lane.label}</span>
              <Swatches
                options={FILL_SWATCHES.slice(0, 7)}
                value={lane.fill ?? "#FFFFFF"}
                onPick={(v) => onLanes(lanes.map((l, j) => (j === i ? { ...l, fill: v === "#FFFFFF" ? undefined : v } : l)))}
              />
            </div>
          ))}
        </div>
      </Section>
      <Section title="Label column width">
        <input
          type="number"
          className={inputCls}
          value={labelSize}
          min={60}
          max={400}
          onChange={(e) => onLabelSize(Math.max(60, Number(e.target.value)))}
        />
      </Section>
    </>
  );
}

function EdgeFields({ edge, onChange }: { edge: FlowEdge; onChange: (p: { label?: string; data?: { style?: EdgeStyle; dashed?: boolean } }) => void }) {
  return (
    <>
      <Section title="Arrow label">
        <input
          className={inputCls}
          value={typeof edge.label === "string" ? edge.label : ""}
          placeholder="e.g. Yes"
          onFocus={beginInteraction}
          onBlur={endInteraction}
          onChange={(e) => onChange({ label: e.target.value })}
        />
      </Section>
      <Section title="Line">
        <select
          className={inputCls}
          value={edge.data?.style ?? "smoothstep"}
          onChange={(e) => onChange({ data: { style: e.target.value as EdgeStyle } })}
        >
          <option value="smoothstep">Right angles, rounded</option>
          <option value="step">Right angles, sharp</option>
          <option value="straight">Straight</option>
        </select>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!edge.data?.dashed} onChange={(e) => onChange({ data: { dashed: e.target.checked } })} />
          Dashed
        </label>
      </Section>
    </>
  );
}
