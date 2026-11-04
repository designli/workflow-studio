import { TopBar } from "@/components/home/TopBar";
import { WorkflowList } from "@/components/home/WorkflowList";
import { listWorkflows } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const workflows = await listWorkflows();
  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
        <WorkflowList workflows={workflows} />
      </main>
    </>
  );
}
