import { NextResponse } from "next/server";
import { isValidId } from "@/lib/ids";
import { duplicateWorkflow } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidId(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const copy = await duplicateWorkflow(id);
  if (!copy) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(copy, { status: 201 });
}
