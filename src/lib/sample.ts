// A ready-made example so the first launch is not blank: Diego's hiring flow.
// The main page holds the overall process; the predefined step
// "1. determine list of prioritized candidates" opens its own diagram.
import { newId } from "./ids";
import { newWorkflow } from "./document";
import type { ShapeData, ShapeKind, StoredEdge, StoredNode, Workflow } from "./types";

const STROKE = "#6B6B6B";
const LANE = 115;
const LABEL_W = 130;

function makeSwimlane(labels: string[], width: number): StoredNode {
  const lanes = labels.map((label) => ({ id: newId(), label, size: LANE }));
  return {
    id: newId(),
    type: "swimlane",
    position: { x: 0, y: 0 },
    width,
    height: LANE * lanes.length,
    zIndex: -1,
    data: { kind: "swimlane", labelSize: LABEL_W, lanes },
  };
}

type Opts = { w?: number; h?: number; fill?: string; fontSize?: number };

function shape(kind: ShapeKind, label: string, x: number, lane: number, opts: Opts = {}): StoredNode {
  const w = opts.w ?? 188;
  const h = opts.h ?? 56;
  return {
    id: newId(),
    type: "shape",
    position: { x, y: lane * LANE + Math.round((LANE - h) / 2) },
    width: w,
    height: h,
    data: {
      kind: "shape",
      shape: kind,
      label,
      fill: opts.fill ?? "#FFFFFF",
      stroke: STROKE,
      fontSize: opts.fontSize ?? 12,
    },
  };
}

function edge(a: StoredNode, b: StoredNode, from: string, to: string, label?: string): StoredEdge {
  return {
    id: newId(),
    source: a.id,
    target: b.id,
    sourceHandle: from,
    targetHandle: to,
    ...(label ? { label } : {}),
    data: { style: "smoothstep" },
  };
}

export function sampleWorkflow(): Workflow {
  const wf = newWorkflow("Hiring process (example)");
  const determineLabel = "1. determine list of prioritized candidates";

  // ---- Main page -----------------------------------------------------------
  const mainLanes = makeSwimlane(["MGMT", "HR DIR", "HIRING MAN", "RECRUIT.", "CANDID", ""], 1060);
  const hiringRequest = shape("terminator", "Hiring Request", 215, 0, { w: 136, h: 44 });
  const talentPool = shape("decision", "Talent Pool Val.", 235, 1, { w: 96, h: 64, fontSize: 10 });
  const reviews = shape("process", "Reviews Decision and approves hiring", 615, 1);
  const talentAcq = shape("predefined", "2. Talent Acquisition process", 188, 2, { h: 68, fontSize: 11 });
  const determine = shape("predefined", determineLabel, 400, 2, { h: 68, fontSize: 11 });
  const preparesOffer = shape("process", "Prepares Offer letter and email approval for HR Director", 400, 3, { fontSize: 11 });
  const sendsOffer = shape("process", "Sends offer letter to Candidate", 828, 3);
  const approves = shape("process", "Approves", 828, 4);
  const onboarding = shape("predefined", "2. Onboarding Process", 828, 5, { h: 68 });

  const main = wf.diagrams[wf.rootDiagramId].pages[0];
  main.name = "Overview";
  main.nodes = [
    mainLanes,
    hiringRequest,
    talentPool,
    reviews,
    talentAcq,
    determine,
    preparesOffer,
    sendsOffer,
    approves,
    onboarding,
  ];
  main.edges = [
    edge(hiringRequest, talentPool, "bottom", "top"),
    edge(talentPool, talentAcq, "bottom", "top", "N"),
    edge(talentPool, determine, "right", "top", "Y"),
    edge(determine, preparesOffer, "bottom", "top"),
    edge(preparesOffer, reviews, "right", "bottom"),
    edge(reviews, sendsOffer, "right", "top"),
    edge(sendsOffer, approves, "bottom", "top"),
    edge(approves, onboarding, "bottom", "top"),
  ];

  // ---- Inside "1. determine list of prioritized candidates" -----------------
  const subId = newId();
  determine.data = { ...(determine.data as ShapeData), subDiagramId: subId };

  const subLanes = makeSwimlane(["MGMT", "RECRUIT", "Tech Evaluator", "Hiring Manager", "CANDID", ""], 1500);
  const entry = shape("predefined", determineLabel, 180, 0, { w: 190, h: 70, fontSize: 10 });
  const validates = shape("process", "Validates availability of approved candidates and updates info.", 180, 1, {
    w: 190,
    fill: "#FFC940",
    fontSize: 10,
  });
  const prepares = shape("process", "Prepares the set of candidates approved.", 407, 1, { fontSize: 10 });
  const asks = shape("process", "Asks Tech Interviewer to prioritize candidates based on their performance.", 633, 1, {
    fontSize: 10,
  });
  const sendsHM = shape("process", "Sends to Hiring Manager", 860, 1);
  const coordinates = shape("process", "Coordinates interviews with candidate and HM", 1113, 1);
  const organizes = shape("process", "Organizes candidates", 407, 2);
  const decides = shape("process", "Decides who to proceed with an interview", 860, 3);
  const takes = shape("terminator", "Takes a Decision", 1113, 3);

  wf.diagrams[subId] = {
    id: subId,
    name: determineLabel,
    parentDiagramId: wf.rootDiagramId,
    parentPageId: main.id,
    parentNodeId: determine.id,
    pages: [
      {
        id: newId(),
        name: "Overview",
        nodes: [subLanes, entry, validates, prepares, asks, sendsHM, coordinates, organizes, decides, takes],
        edges: [
          edge(entry, validates, "bottom", "top"),
          edge(validates, prepares, "right", "left"),
          edge(prepares, asks, "right", "left"),
          edge(asks, organizes, "bottom", "top"),
          edge(organizes, sendsHM, "right", "left"),
          edge(sendsHM, decides, "bottom", "top"),
          edge(decides, coordinates, "right", "left"),
          edge(coordinates, takes, "bottom", "top"),
        ],
      },
    ],
  };
  return wf;
}
