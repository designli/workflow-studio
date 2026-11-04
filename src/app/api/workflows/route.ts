import { NextResponse } from "next/server";
import { createWorkflow, listWorkflows } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listWorkflows());
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const wf = await createWorkflow(typeof body.name === "string" ? body.name : "");
  return NextResponse.json(wf, { status: 201 });
}
