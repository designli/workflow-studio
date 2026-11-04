"use client";
import * as React from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  reconnectEdge,
  useReactFlow,
  type Connection,
  type Edge,
  type IsValidConnection,
  type Node,
  type OnNodeDrag,
  type OnReconnect,
} from "@xyflow/react";
import { ShapeNode } from "./nodes/ShapeNode";
import { SwimlaneNode } from "./nodes/SwimlaneNode";
import { FlowEdge } from "./edges/FlowEdge";
import { beginInteraction, endInteraction, useEditor, type FlowEdge as FlowEdgeType, type FlowNode } from "@/lib/editor/store";
import type { ShapeKind } from "@/lib/types";
import { SHAPE_BY_KIND } from "@/lib/editor/shapes";
import { centerInside, nodeRect } from "@/lib/editor/swimlane";

const nodeTypes = { shape: ShapeNode, swimlane: SwimlaneNode };
const edgeTypes = { flow: FlowEdge };
const defaultEdgeOptions = {
  type: "flow",
  markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: "#6b6b6b" },
};

export const DRAG_MIME = "application/x-workflow-shape";

export function Canvas({ wrapperRef }: { wrapperRef: React.RefObject<HTMLDivElement | null> }) {
  const nodes = useEditor((s) => s.nodes);
  const edges = useEditor((s) => s.edges);
  const onNodesChange = useEditor((s) => s.onNodesChange);
  const onEdgesChange = useEditor((s) => s.onEdgesChange);
  const onConnect = useEditor((s) => s.onConnect);
  const tool = useEditor((s) => s.tool);
  const pageId = useEditor((s) => s.pageId);
  const diagramId = useEditor((s) => s.diagramId);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [connecting, setConnecting] = React.useState(false);
  const reconnectOk = React.useRef(true);
  const laneDrag = React.useRef<{ id: string; last: { x: number; y: number }; inside: Set<string> } | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.2, duration: 0, maxZoom: 1.25 }), 30);
    return () => clearTimeout(t);
  }, [pageId, diagramId, fitView]);

  const isValidConnection: IsValidConnection<FlowEdgeType> = React.useCallback(
    (c) => {
      if (!c.source || !c.target || c.source === c.target) return false;
      const s = useEditor.getState();
      const src = s.nodes.find((n) => n.id === c.source);
      const dst = s.nodes.find((n) => n.id === c.target);
      if (!src || !dst || src.type === "swimlane" || dst.type === "swimlane") return false;
      return !s.edges.some(
        (e) =>
          e.source === c.source &&
          e.target === c.target &&
          (e.sourceHandle ?? null) === (c.sourceHandle ?? null) &&
          (e.targetHandle ?? null) === (c.targetHandle ?? null),
      );
    },
    [],
  );

  const onReconnect: OnReconnect<FlowEdgeType> = React.useCallback((oldEdge: Edge, conn: Connection) => {
    reconnectOk.current = true;
    const s = useEditor.getState();
    s.setEdges(reconnectEdge(oldEdge, conn, s.edges) as FlowEdgeType[]);
  }, []);

  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(DRAG_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  };
  const onDrop = (e: React.DragEvent) => {
    const kind = e.dataTransfer.getData(DRAG_MIME);
    if (!kind) return;
    e.preventDefault();
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const s = useEditor.getState();
    if (kind === "swimlane") s.addSwimlane(pos);
    else if (kind in SHAPE_BY_KIND) s.addShape(kind as ShapeKind, pos);
  };

  const onNodeDragStart: OnNodeDrag<FlowNode> = (_e, node) => {
    beginInteraction();
    if (node.type !== "swimlane") return;
    const s = useEditor.getState();
    const lane = s.nodes.find((n) => n.id === node.id);
    if (!lane) return;
    const outer = nodeRect(lane);
    const inside = new Set<string>();
    for (const n of s.nodes) {
      if (n.type !== "shape" || n.selected) continue;
      if (centerInside(nodeRect(n), outer)) inside.add(n.id);
    }
    laneDrag.current = { id: node.id, last: { ...node.position }, inside };
  };
  const onNodeDrag: OnNodeDrag<FlowNode> = (_e, node) => {
    const d = laneDrag.current;
    if (!d || d.id !== node.id || d.inside.size === 0) return;
    const dx = node.position.x - d.last.x;
    const dy = node.position.y - d.last.y;
    if (dx === 0 && dy === 0) return;
    d.last = { ...node.position };
    useEditor.setState((s) => ({
      nodes: s.nodes.map((n) => (d.inside.has(n.id) ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } : n)),
    }));
  };
  const onNodeDragStop = () => {
    laneDrag.current = null;
    endInteraction();
    useEditor.getState().markDirty();
  };

  const onBeforeDelete = React.useCallback(async ({ nodes: toDelete }: { nodes: Node[]; edges: Edge[] }) => {
    const s = useEditor.getState();
    const withSub = (toDelete as FlowNode[]).filter(
      (n) => n.type === "shape" && n.data.subDiagramId && s.workflow.diagrams[n.data.subDiagramId],
    );
    const nonEmpty = withSub.filter((n) => {
      const d = s.workflow.diagrams[(n.data as { subDiagramId: string }).subDiagramId];
      return d.pages.some((p) => p.nodes.length > 0) || d.pages.length > 1;
    });
    if (nonEmpty.length === 0) return true;
    return window.confirm(
      `${nonEmpty.length === 1 ? "This step contains a sub-process" : `${nonEmpty.length} of these steps contain sub-processes`} with content. Delete anyway?`,
    );
  }, []);

  return (
    <div ref={wrapperRef} className={`ws-canvas h-full w-full ${connecting ? "connecting" : ""}`}>
      <ReactFlow<FlowNode, FlowEdgeType>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={() => setConnecting(true)}
        onConnectEnd={() => setConnecting(false)}
        isValidConnection={isValidConnection}
        onReconnect={onReconnect}
        onReconnectStart={() => {
          reconnectOk.current = false;
        }}
        onReconnectEnd={(_e, edge) => {
          if (!reconnectOk.current) {
            const s = useEditor.getState();
            s.setEdges(s.edges.filter((e) => e.id !== edge.id));
          }
          reconnectOk.current = true;
        }}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onSelectionDragStart={beginInteraction}
        onSelectionDragStop={() => {
          endInteraction();
          useEditor.getState().markDirty();
        }}
        onBeforeDelete={onBeforeDelete}
        onPaneClick={() => useEditor.getState().setEditing(null)}
        onDragOver={onDragOver}
        onDrop={onDrop}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={28}
        snapToGrid
        snapGrid={[10, 10]}
        minZoom={0.1}
        maxZoom={3}
        deleteKeyCode={["Delete", "Backspace"]}
        multiSelectionKeyCode={["Shift", "Meta", "Control"]}
        selectionOnDrag={tool === "select"}
        panOnDrag={tool === "hand" ? true : [1, 2]}
        panOnScroll
        zoomOnDoubleClick={false}
        elevateNodesOnSelect={false}
        nodeDragThreshold={2}
        proOptions={{ hideAttribution: true }}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="#d4d4d4" />
        <MiniMap pannable zoomable nodeColor={(n) => (n.type === "swimlane" ? "#ededed" : "#c9c9c9")} />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  );
}
