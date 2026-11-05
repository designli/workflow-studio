import "server-only";
import {
  assertWorkflow,
  cloneWorkflow,
  newWorkflow,
  pruneOrphanDiagrams,
  syncDiagramNames,
} from "./document";
import type { Workflow, WorkflowSummary } from "./types";
import { sampleWorkflow } from "./sample";
import type { Backend } from "./storage/backend";
import { fileBackend } from "./storage/file";
import { postgresBackend } from "./storage/postgres";

// Persistence facade. With DATABASE_URL set (Vercel + Neon) workflows live in
// Postgres; without it (a developer machine) they are JSON files under data/.
// Everything else in the app only ever talks to the functions exported here.

const backend: Backend = process.env.DATABASE_URL ? postgresBackend : fileBackend;

export function storageKind(): "postgres" | "file" {
  return backend === postgresBackend ? "postgres" : "file";
}

export async function listWorkflows(): Promise<WorkflowSummary[]> {
  let list = await backend.list();
  if (list.length === 0) {
    // First launch: seed one example so the library is not empty.
    await backend.put(sampleWorkflow());
    list = await backend.list();
  }
  return list;
}

export async function getWorkflow(id: string): Promise<Workflow | null> {
  return backend.get(id);
}

export async function createWorkflow(name: string): Promise<Workflow> {
  const wf = newWorkflow(name.trim() || "Untitled workflow");
  await backend.put(wf);
  return wf;
}

export async function saveWorkflow(input: unknown): Promise<Workflow> {
  assertWorkflow(input);
  const wf: Workflow = input;
  pruneOrphanDiagrams(wf);
  syncDiagramNames(wf);
  wf.updatedAt = new Date().toISOString();
  await backend.put(wf);
  return wf;
}

export async function renameWorkflow(id: string, name: string): Promise<Workflow | null> {
  const wf = await backend.get(id);
  if (!wf) return null;
  wf.name = name.trim() || wf.name;
  return saveWorkflow(wf);
}

export async function duplicateWorkflow(id: string): Promise<Workflow | null> {
  const wf = await backend.get(id);
  if (!wf) return null;
  const copy = cloneWorkflow(wf, `${wf.name} (copy)`);
  await backend.put(copy);
  return copy;
}

export async function deleteWorkflow(id: string): Promise<boolean> {
  return backend.remove(id);
}
