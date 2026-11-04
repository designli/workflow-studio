// Document model for Workflow Studio. One Workflow = a tree of Diagrams; each Diagram has Pages (tabs);
// each Page holds the nodes and edges React Flow renders.

export type ShapeKind =
  | "terminator"
  | "process"
  | "predefined"
  | "decision"
  | "document"
  | "multidocument"
  | "data"
  | "manualInput"
  | "manualOperation"
  | "preparation"
  | "delay"
  | "storedData"
  | "database"
  | "connector"
  | "offPage"
  | "note";

export type ShapeData = {
  kind: "shape";
  shape: ShapeKind;
  label: string;
  fill: string;
  stroke: string;
  fontSize?: number;
  /** Set on a predefined-process shape once its nested diagram exists. */
  subDiagramId?: string;
};

export type Lane = {
  id: string;
  label: string;
  /** Height of the lane in canvas pixels (horizontal lanes). */
  size: number;
  fill?: string;
};

export type SwimlaneData = {
  kind: "swimlane";
  title?: string;
  /** Width of the label column on the left. */
  labelSize: number;
  lanes: Lane[];
};

export type NodeData = ShapeData | SwimlaneData;

export type StoredNode = {
  id: string;
  type: "shape" | "swimlane";
  position: { x: number; y: number };
  width: number;
  height: number;
  zIndex?: number;
  data: NodeData;
};

export type EdgeStyle = "smoothstep" | "step" | "straight";

export type EdgeData = {
  style?: EdgeStyle;
  dashed?: boolean;
};

export type StoredEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string;
  data?: EdgeData;
};

export type Page = {
  id: string;
  name: string;
  nodes: StoredNode[];
  edges: StoredEdge[];
};

export type Diagram = {
  id: string;
  name: string;
  /** Null for the root diagram of a workflow. */
  parentDiagramId: string | null;
  parentPageId: string | null;
  parentNodeId: string | null;
  pages: Page[];
};

export type Workflow = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  rootDiagramId: string;
  diagrams: Record<string, Diagram>;
};

export type WorkflowSummary = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  diagramCount: number;
  pageCount: number;
};
