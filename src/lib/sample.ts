// A ready-made example so the first launch is not blank: the hiring flow from Diego's reference.
import { newId } from "./ids";
import { newWorkflow } from "./document";
import type { ShapeKind, StoredEdge, StoredNode, Workflow } from "./types";

const STROKE = "#6B6B6B";

export function sampleWorkflow(): Workflow {
  const wf = newWorkflow("Hiring process (example)");
  const laneSize = 118;
  const lanes = ["MGMT", "RECRUIT", "Tech Evaluator", "Hiring Manager", "CANDIDATE"].map((label) => ({
    id: newId(),
    label,
    size: laneSize,
  }));
  const swimlane: StoredNode = {
    id: newId(),
    type: "swimlane",
    position: { x: 0, y: 0 },
    width: 1440,
    height: laneSize * lanes.length,
    zIndex: -1,
    data: { kind: "swimlane", labelSize: 130, lanes },
  };
  const shape = (
    kind: ShapeKind,
    label: string,
    x: number,
    lane: number,
    opts: { w?: number; h?: number; fill?: string } = {},
  ): StoredNode => {
    const w = opts.w ?? 190;
    const h = opts.h ?? 56;
    return {
      id: newId(),
      type: "shape",
      position: { x, y: lane * laneSize + Math.round((laneSize - h) / 2) },
      width: w,
      height: h,
      data: { kind: "shape", shape: kind, label, fill: opts.fill ?? "#FFFFFF", stroke: STROKE, fontSize: 12 },
    };
  };
  const determineLabel = "Determine list of prioritized candidates";
  const determine = shape("predefined", determineLabel, 170, 0, { h: 64 });
  const validates = shape("process", "Validates availability of approved candidates and updates info.", 170, 1, { fill: "#FFC940", h: 64 });
  const prepares = shape("process", "Prepares the set of candidates approved.", 400, 1);
  const asks = shape("process", "Asks Tech Interviewer to prioritize candidates based on their performance.", 630, 1, { h: 64 });
  const sends = shape("process", "Sends to Hiring Manager", 860, 1);
  const coordinates = shape("process", "Coordinates interviews with candidate and HM", 1110, 1);
  const organizes = shape("process", "Organizes candidates", 400, 2);
  const decides = shape("process", "Decides who to proceed with an interview", 860, 3);
  const takes = shape("terminator", "Takes a decision", 1110, 3);

  const edge = (a: StoredNode, b: StoredNode, from: string, to: string, label?: string): StoredEdge => ({
    id: newId(),
    source: a.id,
    target: b.id,
    sourceHandle: from,
    targetHandle: to,
    ...(label ? { label } : {}),
    data: { style: "smoothstep" },
  });

  const page = wf.diagrams[wf.rootDiagramId].pages[0];
  page.name = "Overview";
  page.nodes = [swimlane, determine, validates, prepares, asks, sends, coordinates, organizes, decides, takes];
  page.edges = [
    edge(determine, validates, "bottom", "top"),
    edge(validates, prepares, "right", "left"),
    edge(prepares, asks, "right", "left"),
    edge(asks, organizes, "bottom", "top"),
    edge(organizes, sends, "right", "left"),
    edge(sends, decides, "bottom", "top"),
    edge(decides, coordinates, "right", "left"),
    edge(coordinates, takes, "bottom", "top"),
  ];

  // A small sub-process behind the predefined step, to show nesting.
  const subId = newId();
  determine.data = { ...(determine.data as Extract<StoredNode["data"], { kind: "shape" }>), subDiagramId: subId };
  const start = shape("terminator", "Start", 100, 0, { w: 140 });
  const review = shape("process", "Review open roles with leadership", 320, 0);
  const rank = shape("decision", "Budget approved?", 580, 0, { w: 170, h: 96 });
  const list = shape("document", "Prioritized candidate list", 830, 0, { h: 80 });
  for (const n of [start, review, rank, list]) n.position.y = 120 - Math.round((n.height ?? 56) / 2);
  wf.diagrams[subId] = {
    id: subId,
    name: determineLabel,
    parentDiagramId: wf.rootDiagramId,
    parentPageId: page.id,
    parentNodeId: determine.id,
    pages: [
      {
        id: newId(),
        name: "Page 1",
        nodes: [start, review, rank, list],
        edges: [
          edge(start, review, "right", "left"),
          edge(review, rank, "right", "left"),
          edge(rank, list, "right", "left", "Yes"),
          edge(rank, review, "bottom", "bottom", "No"),
        ],
      },
    ],
  };
  return wf;
}
