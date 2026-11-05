import { promises as fs } from "node:fs";
import path from "node:path";
import { isValidId } from "../ids";
import { assertWorkflow, countPages } from "../document";
import type { Workflow, WorkflowSummary } from "../types";
import type { Backend } from "./backend";

// Local backend: one JSON file per workflow under data/workflows/ (git-ignored).
// Used whenever DATABASE_URL is not set, i.e. on a developer machine.

const DATA_DIR = path.join(process.cwd(), "data", "workflows");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function fileFor(id: string) {
  if (!isValidId(id)) throw new Error("Invalid workflow id");
  return path.join(DATA_DIR, `${id}.json`);
}

export const fileBackend: Backend = {
  async list() {
    await ensureDir();
    const names = (await fs.readdir(DATA_DIR)).filter((n) => n.endsWith(".json"));
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
  },

  async get(id) {
    try {
      const wf = JSON.parse(await fs.readFile(fileFor(id), "utf8"));
      assertWorkflow(wf);
      return wf;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  },

  async put(wf) {
    await ensureDir();
    const target = fileFor(wf.id);
    const tmp = `${target}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(wf, null, 2), "utf8");
    await fs.rename(tmp, target);
  },

  async remove(id) {
    try {
      await fs.unlink(fileFor(id));
      return true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw err;
    }
  },
};
