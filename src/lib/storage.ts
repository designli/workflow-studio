import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { isValidId } from "./ids";
import {
  assertWorkflow,
  cloneWorkflow,
  countPages,
  newWorkflow,
  pruneOrphanDiagrams,
  syncDiagramNames,
} from "./document";
import type { Workflow, WorkflowSummary } from "./types";
import { sampleWorkflow } from "./sample";

// MVP persistence: one JSON file per workflow under data/workflows/.
// The later hosted version replaces this module with a database-backed one; the
// function signatures are the contract everything else depends on.

const DATA_DIR = path.join(process.cwd(), "data", "workflows");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function fileFor(id: string) {
  if (!isValidId(id)) throw new Error("Invalid workflow id");
  return path.join(DATA_DIR, `${id}.json`);
}

export async function listWorkflows(): Promise<WorkflowSummary[]> {
  await ensureDir();
  let names = (await fs.readdir(DATA_DIR)).filter((n) => n.endsWith(".json"));
  if (names.length === 0) {
    // First launch: seed one example so the library is not empty.
    await writeAtomic(sampleWorkflow());
    names = (await fs.readdir(DATA_DIR)).filter((n) => n.endsWith(".json"));
  }
  const out: WorkflowSummary[] = [];
  for (const name of names) {
    try {
      const wf = JSON.parse(await fs.readFile(path.join(DATA_DIR, name), "utf8")) as Workflow;
      out.push({
        id: wf.id,
        name: wf.name,
        createdAt: wf.createdAt,
        updatedAt: wf.updatedAt,
        diagramCount: Object.keys(wf.diagrams).length,
        pageCount: countPages(wf),
      });
    } catch {
      // A half-written or foreign file must not take the whole list down.
    }
  }
  out.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return out;
}

export async function getWorkflow(id: string): Promise<Workflow | null> {
  try {
    const wf = JSON.parse(await fs.readFile(fileFor(id), "utf8"));
    assertWorkflow(wf);
    return wf;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

async function writeAtomic(wf: Workflow) {
  await ensureDir();
  const target = fileFor(wf.id);
  const tmp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(wf, null, 2), "utf8");
  await fs.rename(tmp, target);
}

export async function createWorkflow(name: string): Promise<Workflow> {
  const wf = newWorkflow(name.trim() || "Untitled workflow");
  await writeAtomic(wf);
  return wf;
}

export async function saveWorkflow(input: unknown): Promise<Workflow> {
  assertWorkflow(input);
  const wf: Workflow = input;
  pruneOrphanDiagrams(wf);
  syncDiagramNames(wf);
  wf.updatedAt = new Date().toISOString();
  await writeAtomic(wf);
  return wf;
}

export async function renameWorkflow(id: string, name: string): Promise<Workflow | null> {
  const wf = await getWorkflow(id);
  if (!wf) return null;
  wf.name = name.trim() || wf.name;
  return saveWorkflow(wf);
}

export async function duplicateWorkflow(id: string): Promise<Workflow | null> {
  const wf = await getWorkflow(id);
  if (!wf) return null;
  const copy = cloneWorkflow(wf, `${wf.name} (copy)`);
  await writeAtomic(copy);
  return copy;
}

export async function deleteWorkflow(id: string): Promise<boolean> {
  try {
    await fs.unlink(fileFor(id));
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw err;
  }
}
