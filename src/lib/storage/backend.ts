import type { Workflow, WorkflowSummary } from "../types";

// The minimal contract a persistence backend has to fulfil. storage.ts builds
// the public API (create, rename, duplicate, seeding…) on top of these four.
export interface Backend {
  list(): Promise<WorkflowSummary[]>;
  get(id: string): Promise<Workflow | null>;
  put(wf: Workflow): Promise<void>;
  remove(id: string): Promise<boolean>;
}
