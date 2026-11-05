import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { isValidId } from "../ids";
import { assertWorkflow, countPages } from "../document";
import type { WorkflowSummary } from "../types";
import type { Backend } from "./backend";

// Hosted backend: one row per workflow in Postgres (Neon via the Vercel
// Marketplace). The whole document lives in a jsonb column; a few columns are
// kept alongside so the library page never has to load every document.
// The connection is created lazily so `next build` never touches the database.

type Sql = NeonQueryFunction<false, false>;

let ready: Promise<Sql> | null = null;

function db(): Promise<Sql> {
  if (!ready) {
    ready = (async () => {
      const url = process.env.DATABASE_URL;
      if (!url) throw new Error("DATABASE_URL is not set");
      const sql = neon(url);
      await sql`
        CREATE TABLE IF NOT EXISTS workflows (
          id            text PRIMARY KEY,
          name          text NOT NULL,
          created_at    timestamptz NOT NULL,
          updated_at    timestamptz NOT NULL,
          diagram_count integer NOT NULL DEFAULT 1,
          page_count    integer NOT NULL DEFAULT 1,
          doc           jsonb NOT NULL
        )`;
      return sql;
    })();
    // A failed first connection must not poison every later request.
    ready.catch(() => {
      ready = null;
    });
  }
  return ready;
}

function checkId(id: string) {
  if (!isValidId(id)) throw new Error("Invalid workflow id");
}

type Row = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  diagram_count: number;
  page_count: number;
};

export const postgresBackend: Backend = {
  async list() {
    const sql = await db();
    const rows = (await sql`
      SELECT id, name, created_at, updated_at, diagram_count, page_count
      FROM workflows
      ORDER BY updated_at DESC`) as Row[];
    return rows.map(
      (r): WorkflowSummary => ({
        id: r.id,
        name: r.name,
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
        diagramCount: r.diagram_count,
        pageCount: r.page_count,
      }),
    );
  },

  async get(id) {
    checkId(id);
    const sql = await db();
    const rows = (await sql`SELECT doc FROM workflows WHERE id = ${id}`) as { doc: unknown }[];
    if (rows.length === 0) return null;
    const wf = rows[0].doc;
    assertWorkflow(wf);
    return wf;
  },

  async put(wf) {
    checkId(wf.id);
    const sql = await db();
    const diagramCount = Object.keys(wf.diagrams).length;
    const pageCount = countPages(wf);
    await sql`
      INSERT INTO workflows (id, name, created_at, updated_at, diagram_count, page_count, doc)
      VALUES (${wf.id}, ${wf.name}, ${wf.createdAt}, ${wf.updatedAt}, ${diagramCount}, ${pageCount}, ${JSON.stringify(wf)}::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = EXCLUDED.updated_at,
        diagram_count = EXCLUDED.diagram_count,
        page_count = EXCLUDED.page_count,
        doc = EXCLUDED.doc`;
  },

  async remove(id) {
    checkId(id);
    const sql = await db();
    const rows = (await sql`DELETE FROM workflows WHERE id = ${id} RETURNING id`) as { id: string }[];
    return rows.length > 0;
  },
};
