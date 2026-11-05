import { create } from "zustand";
import { temporal } from "zundo";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type XYPosition,
} from "@xyflow/react";
import { newId } from "@/lib/ids";
import { diagramSubtree, newDiagram, newPage, removeDiagramSubtree } from "@/lib/document";
import type {
  EdgeData,
  Page,
  ShapeData,
  ShapeKind,
  StoredEdge,
  StoredNode,
  SwimlaneData,
  Workflow,
} from "@/lib/types";
import { DEFAULT_FILL, DEFAULT_STROKE, SHAPE_BY_KIND, SWIMLANE_DEFAULT } from "./shapes";
import { defaultSwimlaneData, MIN_LANE, laneTop, swimlaneHeight } from "./swimlane";

export type ShapeFlowNode = Node<ShapeData, "shape">;
export type SwimlaneFlowNode = Node<SwimlaneData, "swimlane">;
export type FlowNode = ShapeFlowNode | SwimlaneFlowNode;
export type FlowEdge = Edge<EdgeData, "flow">;

export type Tool = "select" | "hand";
export type SaveState = "saved" | "saving" | "error" | "unsaved";

// ---------- conversions between the stored document and React Flow objects ----------

export function toFlowNode(n: StoredNode): FlowNode {
  if (n.type === "swimlane") {
    return {
      id: n.id,
      type: "swimlane",
      position: n.position,
      width: n.width,
      height: n.height,
      zIndex: -1,
      dragHandle: ".lane-drag-handle",
      data: n.data as SwimlaneData,
    };
  }
  return {
    id: n.id,
    type: "shape",
    position: n.position,
    width: n.width,
    height: n.height,
    data: n.data as ShapeData,
  };
}

export function toStoredNode(n: FlowNode): StoredNode {
  const def = n.type === "shape" ? SHAPE_BY_KIND[n.data.shape] : null;
  return {
    id: n.id,
    type: n.type ?? "shape",
    position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
    width: Math.round(n.width ?? n.measured?.width ?? def?.w ?? SWIMLANE_DEFAULT.w),
    height: Math.round(n.height ?? n.measured?.height ?? def?.h ?? SWIMLANE_DEFAULT.h),
    ...(n.type === "swimlane" ? { zIndex: -1 } : {}),
    data: n.data,
  };
}

export function toFlowEdge(e: StoredEdge): FlowEdge {
  return {
    id: e.id,
    type: "flow",
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
    label: e.label,
    data: e.data ?? { style: "smoothstep" },
  };
}

export function toStoredEdge(e: FlowEdge): StoredEdge {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? null,
    targetHandle: e.targetHandle ?? null,
    ...(typeof e.label === "string" && e.label ? { label: e.label } : {}),
    ...(e.data ? { data: e.data } : {}),
  };
}

/** Stable key of the drawing content (ignores selection and measurement). Used for undo equality and dirty checks. */
export function docKey(nodes: FlowNode[], edges: FlowEdge[]): string {
  return JSON.stringify({ n: nodes.map(toStoredNode), e: edges.map(toStoredEdge) });
}

// ---------- store ----------

type Clipboard = { nodes: StoredNode[]; edges: StoredEdge[] } | null;

export type EditorState = {
  workflow: Workflow;
  diagramId: string;
  pageId: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  /** Bumped on every content change; the autosave hook watches it. */
  revision: number;
  dirty: boolean;
  saveState: SaveState;
  lastSavedAt: string | null;
  saveError: string | null;
  tool: Tool;
  editingId: string | null;
  clipboard: Clipboard;
  pasteCount: number;

  init: (wf: Workflow, diagramId: string, pageId: string) => void;
  onNodesChange: (changes: NodeChange<FlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<FlowEdge>[]) => void;
  onConnect: (c: Connection) => void;
  setNodes: (nodes: FlowNode[]) => void;
  setEdges: (edges: FlowEdge[]) => void;
  /** Re-set nodes/edges so a drag or resize is recorded as one undo step. */
  touch: () => void;
  markDirty: () => void;

  addShape: (kind: ShapeKind, position: XYPosition, label?: string) => string;
  addSwimlane: (position: XYPosition) => string;
  updateNodeData: (id: string, patch: Partial<ShapeData> | Partial<SwimlaneData>) => void;
  updateSelectedShapes: (patch: Partial<Pick<ShapeData, "fill" | "stroke" | "fontSize">>) => void;
  setNodeSize: (id: string, width: number, height: number) => void;
  updateEdge: (id: string, patch: { label?: string; data?: Partial<EdgeData> }) => void;
  resizeLane: (nodeId: string, laneIndex: number, delta: number) => void;
  setLanes: (nodeId: string, lanes: SwimlaneData["lanes"], title?: string) => void;

  selectAll: () => void;
  deselectAll: () => void;
  nudge: (dx: number, dy: number) => void;
  copy: () => void;
  paste: () => void;
  duplicate: () => void;

  commitPage: () => Workflow;
  goTo: (diagramId: string, pageId?: string) => void;
  openSubDiagram: (nodeId: string) => void;
  addPage: () => void;
  renamePage: (pageId: string, name: string) => void;
  movePage: (pageId: string, dir: -1 | 1) => void;
  deletePage: (pageId: string) => void;
  renameWorkflow: (name: string) => void;
  /** Rename a sub-process: its diagram and the shape that owns it. */
  renameDiagram: (diagramId: string, name: string) => void;
  /** Remove a sub-process (and anything nested in it) and unlink its shape. */
  deleteSubDiagram: (diagramId: string) => void;

  setTool: (tool: Tool) => void;
  setEditing: (id: string | null) => void;
  setSaveState: (s: SaveState, extra?: { lastSavedAt?: string; error?: string; forRevision?: number }) => void;
};

function pageOf(wf: Workflow, diagramId: string, pageId: string): Page | undefined {
  return wf.diagrams[diagramId]?.pages.find((p) => p.id === pageId);
}

function withPage(wf: Workflow, diagramId: string, pageId: string, patch: Partial<Page>): Workflow {
  const diagram = wf.diagrams[diagramId];
  return {
    ...wf,
    diagrams: {
      ...wf.diagrams,
      [diagramId]: {
        ...diagram,
        pages: diagram.pages.map((p) => (p.id === pageId ? { ...p, ...patch } : p)),
      },
    },
  };
}

const CONTENT_CHANGES = new Set(["add", "remove", "replace", "position", "dimensions"]);

export const useEditor = create<EditorState>()(
  temporal(
    (set, get) => {
      const bump = () => set((s) => ({ revision: s.revision + 1, dirty: true, saveState: "unsaved" }));

      return {
        workflow: null as unknown as Workflow,
        diagramId: "",
        pageId: "",
        nodes: [],
        edges: [],
        revision: 0,
        dirty: false,
        saveState: "saved",
        lastSavedAt: null,
        saveError: null,
        tool: "select",
        editingId: null,
        clipboard: null,
        pasteCount: 0,

        init: (wf, diagramId, pageId) => {
          const page = pageOf(wf, diagramId, pageId)!;
          set({
            workflow: wf,
            diagramId,
            pageId,
            nodes: page.nodes.map(toFlowNode),
            edges: page.edges.map(toFlowEdge),
            revision: 0,
            dirty: false,
            saveState: "saved",
            lastSavedAt: wf.updatedAt,
            saveError: null,
            editingId: null,
          });
          useEditor.temporal.getState().clear();
        },

        onNodesChange: (changes) => {
          set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) }));
          const content = changes.some(
            (c) => CONTENT_CHANGES.has(c.type) && !(c.type === "dimensions" && !c.setAttributes),
          );
          if (content) bump();
        },
        onEdgesChange: (changes) => {
          set((s) => ({ edges: applyEdgeChanges(changes, s.edges) }));
          if (changes.some((c) => c.type !== "select")) bump();
        },
        onConnect: (c) => {
          const s = get();
          if (!c.source || !c.target) return;
          const source = s.nodes.find((n) => n.id === c.source);
          let label: string | undefined;
          if (source?.type === "shape" && source.data.shape === "decision") {
            const existing = s.edges.filter((e) => e.source === c.source).length;
            label = existing === 0 ? "Yes" : existing === 1 ? "No" : undefined;
          }
          const edge: FlowEdge = {
            id: newId(),
            type: "flow",
            source: c.source,
            target: c.target,
            sourceHandle: c.sourceHandle ?? undefined,
            targetHandle: c.targetHandle ?? undefined,
            label,
            data: { style: "smoothstep" },
          };
          set({ edges: addEdge(edge, s.edges) });
          bump();
        },
        setNodes: (nodes) => {
          set({ nodes });
          bump();
        },
        setEdges: (edges) => {
          set({ edges });
          bump();
        },
        touch: () => {
          set((s) => ({ nodes: s.nodes.slice(), edges: s.edges.slice() }));
          bump();
        },
        markDirty: bump,

        addShape: (kind, position, label) => {
          const def = SHAPE_BY_KIND[kind];
          const id = newId();
          const node: ShapeFlowNode = {
            id,
            type: "shape",
            position: { x: Math.round(position.x - def.w / 2), y: Math.round(position.y - def.h / 2) },
            width: def.w,
            height: def.h,
            selected: true,
            data: { kind: "shape", shape: kind, label: label ?? "", fill: DEFAULT_FILL, stroke: DEFAULT_STROKE },
          };
          set((s) => ({ nodes: [...s.nodes.map((n) => ({ ...n, selected: false })), node] }));
          bump();
          return id;
        },
        addSwimlane: (position) => {
          const id = newId();
          const data = defaultSwimlaneData();
          const node: SwimlaneFlowNode = {
            id,
            type: "swimlane",
            position: { x: Math.round(position.x - SWIMLANE_DEFAULT.w / 2), y: Math.round(position.y - swimlaneHeight(data) / 2) },
            width: SWIMLANE_DEFAULT.w,
            height: swimlaneHeight(data),
            zIndex: -1,
            dragHandle: ".lane-drag-handle",
            selected: true,
            data,
          };
          set((s) => ({ nodes: [node, ...s.nodes.map((n) => ({ ...n, selected: false }))] }));
          bump();
          return id;
        },
        updateNodeData: (id, patch) => {
          set((s) => ({
            nodes: s.nodes.map((n) => {
              if (n.id !== id) return n;
              const data = { ...n.data, ...patch } as FlowNode["data"];
              if (n.type === "swimlane") {
                return { ...n, data: data as SwimlaneData, height: swimlaneHeight(data as SwimlaneData) } as SwimlaneFlowNode;
              }
              return { ...n, data: data as ShapeData } as ShapeFlowNode;
            }),
          }));
          bump();
        },
        updateSelectedShapes: (patch) => {
          set((s) => ({
            nodes: s.nodes.map((n) =>
              n.selected && n.type === "shape" ? ({ ...n, data: { ...n.data, ...patch } } as ShapeFlowNode) : n,
            ),
          }));
          bump();
        },
        setNodeSize: (id, width, height) => {
          set((s) => ({
            nodes: s.nodes.map((n) => (n.id === id ? ({ ...n, width: Math.max(24, width), height: Math.max(24, height) } as FlowNode) : n)),
          }));
          bump();
        },
        updateEdge: (id, patch) => {
          set((s) => ({
            edges: s.edges.map((e) =>
              e.id === id
                ? { ...e, ...(patch.label !== undefined ? { label: patch.label } : {}), data: { ...e.data, ...patch.data } }
                : e,
            ),
          }));
          bump();
        },
        resizeLane: (nodeId, laneIndex, delta) => {
          const s = get();
          const lane = s.nodes.find((n) => n.id === nodeId);
          if (!lane || lane.type !== "swimlane") return;
          const current = lane.data.lanes[laneIndex];
          if (!current) return;
          const applied = Math.max(MIN_LANE, current.size + delta) - current.size;
          if (applied === 0) return;
          const boundaryY = lane.position.y + laneTop(lane.data, laneIndex) + current.size;
          const lanes = lane.data.lanes.map((l, i) => (i === laneIndex ? { ...l, size: l.size + applied } : l));
          const data: SwimlaneData = { ...lane.data, lanes };
          const laneRight = lane.position.x + (lane.width ?? SWIMLANE_DEFAULT.w);
          set({
            nodes: s.nodes.map((n) => {
              if (n.id === nodeId) return { ...n, data, height: swimlaneHeight(data) } as SwimlaneFlowNode;
              if (n.type !== "shape") return n;
              const cx = n.position.x + (n.width ?? 0) / 2;
              if (n.position.y >= boundaryY && cx >= lane.position.x && cx <= laneRight) {
                return { ...n, position: { x: n.position.x, y: n.position.y + applied } };
              }
              return n;
            }),
          });
          bump();
        },
        setLanes: (nodeId, lanes, title) => {
          get().updateNodeData(nodeId, { lanes, ...(title !== undefined ? { title } : {}) });
        },

        selectAll: () =>
          set((s) => ({
            nodes: s.nodes.map((n) => ({ ...n, selected: true })),
            edges: s.edges.map((e) => ({ ...e, selected: true })),
          })),
        deselectAll: () =>
          set((s) => ({
            nodes: s.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
            edges: s.edges.map((e) => (e.selected ? { ...e, selected: false } : e)),
          })),
        nudge: (dx, dy) => {
          const s = get();
          if (!s.nodes.some((n) => n.selected)) return;
          set({
            nodes: s.nodes.map((n) => (n.selected ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } : n)),
          });
          bump();
        },
        copy: () => {
          const s = get();
          const nodes = s.nodes.filter((n) => n.selected).map(toStoredNode);
          const ids = new Set(nodes.map((n) => n.id));
          const edges = s.edges.filter((e) => ids.has(e.source) && ids.has(e.target)).map(toStoredEdge);
          if (nodes.length === 0) return;
          set({ clipboard: { nodes, edges }, pasteCount: 0 });
        },
        paste: () => {
          const s = get();
          if (!s.clipboard) return;
          const offset = 24 * (s.pasteCount + 1);
          const idMap = new Map<string, string>();
          const nodes: FlowNode[] = s.clipboard.nodes.map((n) => {
            const id = newId();
            idMap.set(n.id, id);
            const data = n.data.kind === "shape" ? { ...n.data, subDiagramId: undefined } : n.data;
            return { ...toFlowNode({ ...n, id, data, position: { x: n.position.x + offset, y: n.position.y + offset } }), selected: true };
          });
          const edges: FlowEdge[] = s.clipboard.edges.map((e) => ({
            ...toFlowEdge({ ...e, id: newId(), source: idMap.get(e.source)!, target: idMap.get(e.target)! }),
            selected: false,
          }));
          set({
            nodes: [...s.nodes.map((n) => ({ ...n, selected: false })), ...nodes],
            edges: [...s.edges.map((e) => ({ ...e, selected: false })), ...edges],
            pasteCount: s.pasteCount + 1,
          });
          bump();
        },
        duplicate: () => {
          get().copy();
          set({ pasteCount: 0 });
          get().paste();
        },

        commitPage: () => {
          const s = get();
          const wf = withPage(s.workflow, s.diagramId, s.pageId, {
            nodes: s.nodes.map(toStoredNode),
            edges: s.edges.map(toStoredEdge),
          });
          set({ workflow: wf });
          return wf;
        },
        goTo: (diagramId, pageId) => {
          const wf = get().commitPage();
          const diagram = wf.diagrams[diagramId];
          if (!diagram) return;
          const page = (pageId && diagram.pages.find((p) => p.id === pageId)) || diagram.pages[0];
          set({
            diagramId,
            pageId: page.id,
            nodes: page.nodes.map(toFlowNode),
            edges: page.edges.map(toFlowEdge),
            editingId: null,
          });
          useEditor.temporal.getState().clear();
        },
        openSubDiagram: (nodeId) => {
          const s = get();
          const node = s.nodes.find((n) => n.id === nodeId);
          if (!node || node.type !== "shape") return;
          let subId = node.data.subDiagramId;
          if (!subId || !s.workflow.diagrams[subId]) {
            const sub = newDiagram(node.data.label.trim() || "Sub-process", {
              diagramId: s.diagramId,
              pageId: s.pageId,
              nodeId,
            });
            subId = sub.id;
            set((st) => ({
              workflow: { ...st.workflow, diagrams: { ...st.workflow.diagrams, [sub.id]: sub } },
              nodes: st.nodes.map((n) =>
                n.id === nodeId && n.type === "shape" ? { ...n, data: { ...n.data, subDiagramId: sub.id } } : n,
              ),
            }));
            bump();
          }
          get().goTo(subId);
        },
        addPage: () => {
          const wf = get().commitPage();
          const diagram = wf.diagrams[get().diagramId];
          const page = newPage(`Page ${diagram.pages.length + 1}`);
          const next: Workflow = {
            ...wf,
            diagrams: { ...wf.diagrams, [diagram.id]: { ...diagram, pages: [...diagram.pages, page] } },
          };
          set({ workflow: next });
          bump();
          get().goTo(diagram.id, page.id);
        },
        renamePage: (pageId, name) => {
          const s = get();
          const clean = name.trim();
          if (!clean) return;
          set({ workflow: withPage(s.workflow, s.diagramId, pageId, { name: clean }) });
          bump();
        },
        movePage: (pageId, dir) => {
          const s = get();
          const diagram = s.workflow.diagrams[s.diagramId];
          const idx = diagram.pages.findIndex((p) => p.id === pageId);
          const to = idx + dir;
          if (idx < 0 || to < 0 || to >= diagram.pages.length) return;
          const pages = diagram.pages.slice();
          [pages[idx], pages[to]] = [pages[to], pages[idx]];
          set({ workflow: { ...s.workflow, diagrams: { ...s.workflow.diagrams, [diagram.id]: { ...diagram, pages } } } });
          bump();
        },
        deletePage: (pageId) => {
          const wf = get().commitPage();
          const diagramId = get().diagramId;
          const diagram = wf.diagrams[diagramId];
          if (diagram.pages.length <= 1) return;
          const idx = diagram.pages.findIndex((p) => p.id === pageId);
          if (idx < 0) return;
          const next: Workflow = JSON.parse(JSON.stringify(wf));
          // Remove sub-processes owned by shapes on this page.
          for (const d of Object.values(wf.diagrams)) {
            if (d.parentDiagramId === diagramId && d.parentPageId === pageId) removeDiagramSubtree(next, d.id);
          }
          next.diagrams[diagramId].pages = diagram.pages.filter((p) => p.id !== pageId);
          set({ workflow: next });
          bump();
          const fallback = next.diagrams[diagramId].pages[Math.max(0, idx - 1)];
          if (get().pageId === pageId) get().goTo(diagramId, fallback.id);
        },
        renameWorkflow: (name) => {
          const clean = name.trim();
          if (!clean) return;
          set((s) => ({ workflow: { ...s.workflow, name: clean } }));
          bump();
        },
        renameDiagram: (diagramId, name) => {
          const clean = name.trim();
          if (!clean) return;
          const wf = get().commitPage();
          const d = wf.diagrams[diagramId];
          if (!d) return;
          if (!d.parentDiagramId) {
            get().renameWorkflow(clean);
            return;
          }
          const next: Workflow = JSON.parse(JSON.stringify(wf));
          next.diagrams[diagramId].name = clean;
          const page = next.diagrams[d.parentDiagramId]?.pages.find((p) => p.id === d.parentPageId);
          const owner = page?.nodes.find((n) => n.id === d.parentNodeId);
          if (owner && owner.data.kind === "shape") owner.data.label = clean;
          set({ workflow: next });
          const s = get();
          if (s.diagramId === d.parentDiagramId && s.pageId === d.parentPageId) {
            set({
              nodes: s.nodes.map((n) =>
                n.id === d.parentNodeId && n.type === "shape" ? { ...n, data: { ...n.data, label: clean } } : n,
              ),
            });
          }
          bump();
        },
        deleteSubDiagram: (diagramId) => {
          let wf = get().commitPage();
          const d = wf.diagrams[diagramId];
          if (!d || !d.parentDiagramId) return;
          const gone = new Set(diagramSubtree(wf, diagramId));
          // Leave the doomed diagram first, so the page we are on still exists.
          if (gone.has(get().diagramId)) {
            get().goTo(d.parentDiagramId, d.parentPageId ?? undefined);
            wf = get().workflow;
          }
          const next: Workflow = JSON.parse(JSON.stringify(wf));
          removeDiagramSubtree(next, diagramId);
          const page = next.diagrams[d.parentDiagramId]?.pages.find((p) => p.id === d.parentPageId);
          const owner = page?.nodes.find((n) => n.id === d.parentNodeId);
          if (owner && owner.data.kind === "shape") delete owner.data.subDiagramId;
          set({ workflow: next });
          const s = get();
          if (s.diagramId === d.parentDiagramId && s.pageId === d.parentPageId) {
            set({
              nodes: s.nodes.map((n) => {
                if (n.id !== d.parentNodeId || n.type !== "shape") return n;
                const data = { ...n.data };
                delete data.subDiagramId;
                return { ...n, data };
              }),
            });
          }
          bump();
        },

        setTool: (tool) => set({ tool }),
        setEditing: (id) => set({ editingId: id }),
        setSaveState: (saveState, extra) =>
          set((s) => {
            if (saveState === "saved") {
              // Only clear the dirty flag if nothing changed while the request was in flight.
              const stillCurrent = extra?.forRevision === undefined || extra.forRevision === s.revision;
              return {
                saveState: stillCurrent ? "saved" : "unsaved",
                dirty: stillCurrent ? false : s.dirty,
                lastSavedAt: extra?.lastSavedAt ?? s.lastSavedAt,
                saveError: null,
              };
            }
            return { saveState, saveError: extra?.error ?? null };
          }),
      };
    },
    {
      partialize: (s) => ({ nodes: s.nodes, edges: s.edges }),
      equality: (a, b) => docKey(a.nodes, a.edges) === docKey(b.nodes, b.edges),
      limit: 100,
    },
  ),
);

// Drags, resizes and panel edits are many store updates but one undo step: freeze the
// pre-interaction state, pause history, and push that frozen state once at the end.
let frozen: { nodes: FlowNode[]; edges: FlowEdge[] } | null = null;

export function beginInteraction() {
  if (frozen) return;
  const s = useEditor.getState();
  frozen = { nodes: s.nodes, edges: s.edges };
  useEditor.temporal.getState().pause();
}

export function endInteraction() {
  const t = useEditor.temporal;
  t.getState().resume();
  if (!frozen) return;
  const s = useEditor.getState();
  if (docKey(frozen.nodes, frozen.edges) !== docKey(s.nodes, s.edges)) {
    t.setState({ pastStates: [...t.getState().pastStates, frozen].slice(-100), futureStates: [] });
  }
  frozen = null;
}

export function undo() {
  const t = useEditor.temporal.getState();
  if (t.pastStates.length === 0) return;
  t.undo();
  useEditor.getState().markDirty();
}

export function redo() {
  const t = useEditor.temporal.getState();
  if (t.futureStates.length === 0) return;
  t.redo();
  useEditor.getState().markDirty();
}

/** Current page's stored form (used by export names and tabs). */
export function currentPage(s: EditorState): Page | undefined {
  return pageOf(s.workflow, s.diagramId, s.pageId);
}
