"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, FileText, Pencil, Plus, Trash2, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { timeAgo } from "@/lib/time";
import type { WorkflowSummary } from "@/lib/types";

type Dialog =
  | { kind: "new" }
  | { kind: "rename"; wf: WorkflowSummary }
  | { kind: "delete"; wf: WorkflowSummary }
  | null;

export function WorkflowList({ workflows }: { workflows: WorkflowSummary[] }) {
  const router = useRouter();
  const [dialog, setDialog] = React.useState<Dialog>(null);
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const open = (d: Dialog) => {
    setError(null);
    setName(d?.kind === "rename" ? d.wf.name : "");
    setDialog(d);
    setTimeout(() => inputRef.current?.select(), 0);
  };
  const close = () => setDialog(null);

  async function call(url: string, init: RequestInit) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { headers: { "content-type": "application/json" }, ...init });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? `Request failed (${res.status})`);
      return await res.json();
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!dialog) return;
    try {
      if (dialog.kind === "new") {
        const wf = await call("/api/workflows", { method: "POST", body: JSON.stringify({ name }) });
        router.push(`/w/${wf.id}`);
        return;
      }
      if (dialog.kind === "rename") {
        await call(`/api/workflows/${dialog.wf.id}`, { method: "PATCH", body: JSON.stringify({ name }) });
      }
      if (dialog.kind === "delete") {
        await call(`/api/workflows/${dialog.wf.id}`, { method: "DELETE" });
      }
      close();
      router.refresh();
    } catch {
      /* error already shown */
    }
  }

  async function duplicate(wf: WorkflowSummary) {
    try {
      await call(`/api/workflows/${wf.id}/duplicate`, { method: "POST" });
      router.refresh();
    } catch {
      /* shown inline */
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black tracking-tight text-brand-navy">Workflows</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everyone at Designli sees and edits the same library.
          </p>
        </div>
        <Button variant="primary" onClick={() => open({ kind: "new" })}>
          <Plus size={18} /> New workflow
        </Button>
      </div>

      {error && !dialog && (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {workflows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center">
          <Workflow className="mx-auto mb-3 text-brand-coral" size={40} />
          <h2 className="text-lg font-semibold">No workflows yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Create your first one and start dragging shapes onto the canvas.
          </p>
          <Button variant="primary" className="mt-5" onClick={() => open({ kind: "new" })}>
            <Plus size={18} /> New workflow
          </Button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map((wf) => (
            <li
              key={wf.id}
              className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md"
            >
              <Link href={`/w/${wf.id}`} className="flex-1">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Workflow size={20} />
                </div>
                <h3 className="line-clamp-2 text-base font-semibold text-foreground">{wf.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Edited {timeAgo(wf.updatedAt)} · {wf.diagramCount} diagram{wf.diagramCount === 1 ? "" : "s"} ·{" "}
                  {wf.pageCount} page{wf.pageCount === 1 ? "" : "s"}
                </p>
              </Link>
              <div className="mt-4 flex items-center gap-1 border-t border-border pt-3">
                <Button size="sm" variant="ghost" onClick={() => open({ kind: "rename", wf })}>
                  <Pencil size={14} /> Rename
                </Button>
                <Button size="sm" variant="ghost" onClick={() => duplicate(wf)} disabled={busy}>
                  <Copy size={14} /> Duplicate
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto text-destructive hover:bg-destructive/10"
                  onClick={() => open({ kind: "delete", wf })}
                >
                  <Trash2 size={14} /> Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={dialog !== null}
        onClose={close}
        title={
          dialog?.kind === "new" ? "New workflow" : dialog?.kind === "rename" ? "Rename workflow" : "Delete workflow"
        }
      >
        <form onSubmit={submit} className="space-y-4">
          {dialog?.kind === "delete" ? (
            <p className="text-sm text-foreground">
              Delete <strong>{dialog.wf.name}</strong> and all its pages and sub-processes? This cannot be undone.
            </p>
          ) : (
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Name</span>
              <Input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hiring process"
                autoFocus
                required
              />
            </label>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" variant={dialog?.kind === "delete" ? "danger" : "primary"} disabled={busy}>
              {dialog?.kind === "new" && (
                <>
                  <FileText size={16} /> Create
                </>
              )}
              {dialog?.kind === "rename" && "Save"}
              {dialog?.kind === "delete" && "Delete"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
