import { notFound } from "next/navigation";
import { getWorkflow } from "@/lib/storage";
import { Editor } from "@/components/editor/Editor";

export const dynamic = "force-dynamic";

export default async function EditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ workflowId: string }>;
  searchParams: Promise<{ d?: string; p?: string }>;
}) {
  const { workflowId } = await params;
  const { d, p } = await searchParams;
  const wf = await getWorkflow(workflowId);
  if (!wf) notFound();
  const diagramId = d && wf.diagrams[d] ? d : wf.rootDiagramId;
  const diagram = wf.diagrams[diagramId];
  const pageId = p && diagram.pages.some((pg) => pg.id === p) ? p : diagram.pages[0].id;
  return <Editor key={wf.id} workflow={wf} initialDiagramId={diagramId} initialPageId={pageId} />;
}
