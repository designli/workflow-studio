import type { ShapeKind } from "@/lib/types";

export type Inset = { t: number; r: number; b: number; l: number };
export type ShapeDef = {
  kind: ShapeKind;
  name: string;
  hint: string;
  w: number;
  h: number;
  /** Fractions of width/height kept clear of text so it stays inside the outline. */
  inset: Inset;
  keepAspect?: boolean;
};

const I = (t: number, r: number, b: number, l: number): Inset => ({ t, r, b, l });

export const SHAPES: ShapeDef[] = [
  { kind: "terminator", name: "Start / End", hint: "Where the process begins or ends", w: 140, h: 56, inset: I(0.1, 0.14, 0.1, 0.14) },
  { kind: "process", name: "Process", hint: "A step or action", w: 160, h: 64, inset: I(0.1, 0.08, 0.1, 0.08) },
  { kind: "predefined", name: "Predefined process", hint: "A sub-process. Double-click to open it", w: 180, h: 72, inset: I(0.1, 0.12, 0.1, 0.12) },
  { kind: "decision", name: "Decision", hint: "A yes / no question", w: 160, h: 100, inset: I(0.22, 0.2, 0.22, 0.2) },
  { kind: "document", name: "Document", hint: "A document or report", w: 160, h: 84, inset: I(0.08, 0.08, 0.24, 0.08) },
  { kind: "multidocument", name: "Multiple documents", hint: "Several documents", w: 170, h: 96, inset: I(0.2, 0.14, 0.26, 0.06) },
  { kind: "data", name: "Data (input / output)", hint: "Information going in or out", w: 170, h: 64, inset: I(0.1, 0.18, 0.1, 0.18) },
  { kind: "manualInput", name: "Manual input", hint: "Someone types something in", w: 160, h: 72, inset: I(0.3, 0.08, 0.1, 0.08) },
  { kind: "manualOperation", name: "Manual operation", hint: "A step done by hand", w: 160, h: 64, inset: I(0.1, 0.14, 0.1, 0.14) },
  { kind: "preparation", name: "Preparation", hint: "Setup before a step", w: 170, h: 64, inset: I(0.1, 0.2, 0.1, 0.2) },
  { kind: "delay", name: "Delay", hint: "Waiting time", w: 150, h: 64, inset: I(0.1, 0.22, 0.1, 0.08) },
  { kind: "storedData", name: "Stored data", hint: "Information kept somewhere", w: 160, h: 64, inset: I(0.1, 0.16, 0.1, 0.12) },
  { kind: "database", name: "Database", hint: "A system of record", w: 120, h: 90, inset: I(0.3, 0.08, 0.12, 0.08) },
  { kind: "connector", name: "Connector", hint: "Joins two parts of the flow", w: 48, h: 48, inset: I(0.12, 0.12, 0.12, 0.12), keepAspect: true },
  { kind: "offPage", name: "Off-page connector", hint: "Continues on another page", w: 100, h: 90, inset: I(0.08, 0.1, 0.32, 0.1) },
  { kind: "note", name: "Note", hint: "A comment on the side", w: 180, h: 110, inset: I(0.1, 0.12, 0.1, 0.08) },
];

export const SHAPE_BY_KIND = Object.fromEntries(SHAPES.map((s) => [s.kind, s])) as Record<ShapeKind, ShapeDef>;

export const DEFAULT_FILL = "#FFFFFF";
export const DEFAULT_STROKE = "#6B6B6B";
export const HIGHLIGHT_FILL = "#FFC940";

export const FILL_SWATCHES: { name: string; value: string }[] = [
  { name: "White", value: "#FFFFFF" },
  { name: "Highlight", value: "#FFC940" },
  { name: "Coral", value: "#FDE3DF" },
  { name: "Navy", value: "#E3E4EE" },
  { name: "Paper", value: "#F3EFEF" },
  { name: "Purple", value: "#EAE3F0" },
  { name: "Green", value: "#D9F2E6" },
  { name: "Blue", value: "#DDEBFB" },
  { name: "Gray", value: "#EDEDED" },
];

export const STROKE_SWATCHES: { name: string; value: string }[] = [
  { name: "Gray", value: "#6B6B6B" },
  { name: "Navy", value: "#0E1034" },
  { name: "Coral", value: "#F87565" },
  { name: "Purple", value: "#58377B" },
  { name: "Green", value: "#166746" },
];

export const SWIMLANE_DEFAULT = { w: 960, h: 480, labelSize: 130, laneSize: 150 };

export type ShapeGeometry = { behind: string[]; main: string; lines: string[] };

function roundedRect(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  return [
    `M${x + rr},${y}`,
    `H${x + w - rr}`,
    `A${rr},${rr} 0 0 1 ${x + w},${y + rr}`,
    `V${y + h - rr}`,
    `A${rr},${rr} 0 0 1 ${x + w - rr},${y + h}`,
    `H${x + rr}`,
    `A${rr},${rr} 0 0 1 ${x},${y + h - rr}`,
    `V${y + rr}`,
    `A${rr},${rr} 0 0 1 ${x + rr},${y}`,
    "Z",
  ].join(" ");
}

function documentPath(x: number, y: number, w: number, h: number): string {
  const wave = h * 0.82;
  return `M${x},${y} H${x + w} V${y + wave} C${x + w * 0.72},${y + h * 0.62} ${x + w * 0.42},${y + h * 1.08} ${x},${y + h * 0.86} Z`;
}

/** SVG paths for a shape at the given size. `behind` is drawn first (filled), then `main`, then stroke-only `lines`. */
export function shapeGeometry(kind: ShapeKind, w: number, h: number): ShapeGeometry {
  const r = 8;
  switch (kind) {
    case "terminator":
      return { behind: [], main: roundedRect(0, 0, w, h, h / 2), lines: [] };
    case "process":
      return { behind: [], main: roundedRect(0, 0, w, h, r), lines: [] };
    case "predefined": {
      const k = 10;
      return { behind: [], main: roundedRect(0, 0, w, h, r), lines: [`M${k},0 V${h}`, `M${w - k},0 V${h}`] };
    }
    case "decision":
      return { behind: [], main: `M${w / 2},0 L${w},${h / 2} L${w / 2},${h} L0,${h / 2} Z`, lines: [] };
    case "document":
      return { behind: [], main: documentPath(0, 0, w, h), lines: [] };
    case "multidocument": {
      const o = 8;
      const dw = w - 2 * o;
      const dh = h - 2 * o;
      return {
        behind: [documentPath(2 * o, 0, dw, dh), documentPath(o, o, dw, dh)],
        main: documentPath(0, 2 * o, dw, dh),
        lines: [],
      };
    }
    case "data": {
      const k = Math.min(w * 0.2, h * 0.6);
      return { behind: [], main: `M${k},0 H${w} L${w - k},${h} H0 Z`, lines: [] };
    }
    case "manualInput":
      return { behind: [], main: `M0,${h * 0.3} L${w},0 V${h} H0 Z`, lines: [] };
    case "manualOperation": {
      const k = Math.min(w * 0.15, h * 0.6);
      return { behind: [], main: `M0,0 H${w} L${w - k},${h} H${k} Z`, lines: [] };
    }
    case "preparation": {
      const k = Math.min(w * 0.2, h * 0.6);
      return { behind: [], main: `M${k},0 H${w - k} L${w},${h / 2} L${w - k},${h} H${k} L0,${h / 2} Z`, lines: [] };
    }
    case "delay": {
      const rr = Math.min(h / 2, w * 0.5);
      return { behind: [], main: `M0,0 H${w - rr} A${rr},${h / 2} 0 0 1 ${w - rr},${h} H0 Z`, lines: [] };
    }
    case "storedData": {
      const k = Math.min(w * 0.12, 20);
      return {
        behind: [],
        main: `M${k},0 H${w} A${k},${h / 2} 0 0 0 ${w},${h} H${k} A${k},${h / 2} 0 0 1 ${k},0 Z`,
        lines: [],
      };
    }
    case "database": {
      const ry = Math.min(h * 0.16, 16);
      return {
        behind: [],
        main: `M0,${ry} V${h - ry} A${w / 2},${ry} 0 0 0 ${w},${h - ry} V${ry} A${w / 2},${ry} 0 0 0 0,${ry} Z`,
        lines: [`M0,${ry} A${w / 2},${ry} 0 0 0 ${w},${ry}`],
      };
    }
    case "connector":
      return {
        behind: [],
        main: `M${w / 2},0 A${w / 2},${h / 2} 0 1 1 ${w / 2},${h} A${w / 2},${h / 2} 0 1 1 ${w / 2},0 Z`,
        lines: [],
      };
    case "offPage":
      return { behind: [], main: `M0,0 H${w} V${h * 0.7} L${w / 2},${h} L0,${h * 0.7} Z`, lines: [] };
    case "note": {
      const k = Math.min(18, w * 0.2, h * 0.2);
      return { behind: [], main: `M0,0 H${w - k} L${w},${k} V${h} H0 Z`, lines: [`M${w - k},0 V${k} H${w}`] };
    }
  }
}
