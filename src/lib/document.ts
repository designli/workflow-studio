// Pure helpers over the Workflow document (no I/O). Shared by server and client.
import { newId } from "./ids";
import type { Diagram, Page, Workflow } from "./types";

export function newPage(name = "Page 1"): Page {
  return { id: newId(), name, nodes: [], edges: [] };
}

export function newDiagram(
  name: string,
  parent: { diagramId: string; pageId: string; nodeId: string } | null,
): Diagram {
  return {
    id: newId(),
    name,
    parentDiagramId: parent?.diagramId ?? null,
    parentPageId: parent?.pageId ?? null,
    parentNodeId: parent?.nodeId ?? null,
    pages: [newPage()],
  };
}

export function newWorkflow(name: string): Workflow {
  const root = newDiagram(name, null);
  const now = new Date().toISOString();
  return {
    id: newId(),
    name,
    createdAt: now,
    updatedAt: now,
    rootDiagramId: root.id,
    diagrams: { [root.id]: root },
  };
}

/** Breadcrumb chain from the root diagram down to `diagramId` (inclusive). */
export function diagramChain(wf: Workflow, diagramId: string): Diagram[] {
  const chain: Diagram[] = [];
  let current: Diagram | undefined = wf.diagrams[diagramId];
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current);
    current = current.parentDiagramId ? wf.diagrams[current.parentDiagramId] : undefined;
  }
  return chain;
}

/** Ids of `diagramId` and every diagram nested below it. */
export function diagramSubtree(wf: Workflow, diagramId: string): string[] {
  const out: string[] = [];
  const stack = [diagramId];
  while (stack.length) {
    const id = stack.pop()!;
    if (!wf.diagrams[id]) continue;
    out.push(id);
    for (const d of Object.values(wf.diagrams)) {
      if (d.parentDiagramId === id) stack.push(d.id);
    }
  }
  return out;
}

/** Remove a diagram and everything nested under it. */
export function removeDiagramSubtree(wf: Workflow, diagramId: string): void {
  for (const id of diagramSubtree(wf, diagramId)) delete wf.diagrams[id];
}

/** Drop diagrams whose owning node or page no longer exists (after deletes on the canvas). */
export function pruneOrphanDiagrams(wf: Workflow): void {
  let changed = true;
  while (changed) {
    changed = false;
    for (const d of Object.values(wf.diagrams)) {
      if (!d.parentDiagramId) continue;
      const parent = wf.diagrams[d.parentDiagramId];
      const page = parent?.pages.find((p) => p.id === d.parentPageId);
      const node = page?.nodes.find((n) => n.id === d.parentNodeId);
      const linked = node && node.data.kind === "shape" && node.data.subDiagramId === d.id;
      if (!parent || !page || !node || !linked) {
        delete wf.diagrams[d.id];
        changed = true;
      }
    }
  }
}

/** Keep each nested diagram's name equal to the label of the shape that owns it. */
export function syncDiagramNames(wf: Workflow): void {
  for (const d of Object.values(wf.diagrams)) {
    if (!d.parentDiagramId) {
      d.name = wf.name;
      continue;
    }
    const parent = wf.diagrams[d.parentDiagramId];
    const page = parent?.pages.find((p) => p.id === d.parentPageId);
    const node = page?.nodes.find((n) => n.id === d.parentNodeId);
    if (node && node.data.kind === "shape" && node.data.label.trim()) {
      d.name = node.data.label.trim();
    }
  }
}

export type TabEntry = { diagram: Diagram; page: Page; depth: number };

/**
 * Every page of every diagram, flattened in reading order for the tab strip:
 * the main process first, then each sub-process right after the page that
 * owns it (sub-processes of a page sorted by their shape's position), nested
 * ones following their parent. Like sheet tabs in a spreadsheet.
 */
export function tabOrder(wf: Workflow): TabEntry[] {
  const out: TabEntry[] = [];
  const seen = new Set<string>();
  const all = Object.values(wf.diagrams);
  const walk = (diagramId: string, depth: number) => {
    const d = wf.diagrams[diagramId];
    if (!d || seen.has(diagramId)) return;
    seen.add(diagramId);
    for (const page of d.pages) {
      out.push({ diagram: d, page, depth });
      const subs = all.filter((s) => s.parentDiagramId === d.id && s.parentPageId === page.id);
      const key = (s: Diagram) => {
        const n = page.nodes.find((x) => x.id === s.parentNodeId);
        return n ? [Math.round(n.position.y / 100), n.position.x] : [Number.MAX_SAFE_INTEGER, 0];
      };
      subs.sort((a, b) => {
        const [ay, ax] = key(a);
        const [by, bx] = key(b);
        return ay - by || ax - bx;
      });
      for (const s of subs) walk(s.id, depth + 1);
    }
  };
  walk(wf.rootDiagramId, 0);
  return out;
}

export function countPages(wf: Workflow): number {
  return Object.values(wf.diagrams).reduce((n, d) => n + d.pages.length, 0);
}

/** Deep copy with a fresh workflow id (inner ids are scoped to the file, so they can stay). */
export function cloneWorkflow(wf: Workflow, name: string): Workflow {
  const copy: Workflow = JSON.parse(JSON.stringify(wf));
  const now = new Date().toISOString();
  copy.id = newId();
  copy.name = name;
  copy.createdAt = now;
  copy.updatedAt = now;
  syncDiagramNames(copy);
  return copy;
}

/** Shallow structural check so bad clients cannot corrupt a file. Throws on failure. */
export function assertWorkflow(input: unknown): asserts input is Workflow {
  const wf = input as Workflow;
  const fail = (msg: string) => {
    throw new Error(`Invalid workflow: ${msg}`);
  };
  if (!wf || typeof wf !== "object") fail("not an object");
  if (typeof wf.id !== "string" || typeof wf.name !== "string") fail("missing id or name");
  if (!wf.diagrams || typeof wf.diagrams !== "object") fail("missing diagrams");
  if (!wf.diagrams[wf.rootDiagramId]) fail("root diagram missing");
  for (const d of Object.values(wf.diagrams)) {
    if (typeof d.id !== "string" || !Array.isArray(d.pages) || d.pages.length === 0) {
      fail(`diagram ${String(d?.id)} malformed`);
    }
    for (const p of d.pages) {
      if (typeof p.id !== "string" || !Array.isArray(p.nodes) || !Array.isArray(p.edges)) {
        fail(`page ${String(p?.id)} malformed`);
      }
    }
  }
}
