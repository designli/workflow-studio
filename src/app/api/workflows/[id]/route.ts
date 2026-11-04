import { NextResponse } from "next/server";
import { isValidId } from "@/lib/ids";
import { deleteWorkflow, getWorkflow, renameWorkflow, saveWorkflow } from "@/lib/storage";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!isValidId(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const wf = await getWorkflow(id);
  if (!wf) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(wf);
}

/** Full save: the editor sends the whole workflow document. */
export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!isValidId(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const body = await req.json().catch(() => null);
  if (!body || body.id !== id) return NextResponse.json({ error: "Id mismatch" }, { status: 400 });
  try {
    const saved = await saveWorkflow(body);
    return NextResponse.json({ ok: true, updatedAt: saved.updatedAt });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 422 });
  }
}

/** Rename only. */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!isValidId(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as { name?: string };
  if (typeof body.name !== "string") return NextResponse.json({ error: "Name required" }, { status: 400 });
  const wf = await renameWorkflow(id, body.name);
  if (!wf) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, name: wf.name });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!isValidId(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const ok = await deleteWorkflow(id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
