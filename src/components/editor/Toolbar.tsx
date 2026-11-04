"use client";
import * as React from "react";
import Link from "next/link";
import { useReactFlow } from "@xyflow/react";
import { useStore } from "zustand";
import {
  ArrowUpLeft,
  ChevronRight,
  Download,
  Hand,
  Home,
  LayoutGrid,
  Maximize,
  MousePointer2,
  Redo2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { diagramChain } from "@/lib/document";
import { autoLayout } from "@/lib/editor/layout";
import { exportPng } from "@/lib/editor/export";
import { beginInteraction, currentPage, endInteraction, redo, undo, useEditor } from "@/lib/editor/store";
import { timeAgo } from "@/lib/time";
import { TextEditor } from "./nodes/TextEditor";

function ToolButton({
  title,
  onClick,
  active,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md text-white/85 hover:bg-white/15 hover:text-white disabled:opacity-35 disabled:hover:bg-transparent",
        active && "bg-brand-coral text-brand-navy hover:bg-brand-coral hover:text-brand-navy",
      )}
    >
      {children}
    </button>
  );
}

function SaveIndicator() {
  const saveState = useEditor((s) => s.saveState);
  const lastSavedAt = useEditor((s) => s.lastSavedAt);
  const saveError = useEditor((s) => s.saveError);
  const [, tick] = React.useReducer((n: number) => n + 1, 0);
  React.useEffect(() => {
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);
  const text =
    saveState === "saving"
      ? "Saving…"
      : saveState === "error"
        ? `Not saved: ${saveError ?? "error"}`
        : saveState === "unsaved"
          ? "Unsaved changes"
          : lastSavedAt
            ? `Saved ${timeAgo(lastSavedAt)}`
            : "Saved";
  return (
    <span
      className={cn("text-xs", saveState === "error" ? "text-[#ffb4bc]" : "text-white/70")}
      title={saveState === "error" ? "Changes are retried automatically" : undefined}
    >
      {text}
    </span>
  );
}

export function Toolbar({ canvasRef }: { canvasRef: React.RefObject<HTMLDivElement | null> }) {
  const workflow = useEditor((s) => s.workflow);
  const diagramId = useEditor((s) => s.diagramId);
  const tool = useEditor((s) => s.tool);
  const setTool = useEditor((s) => s.setTool);
  const goTo = useEditor((s) => s.goTo);
  const renameWorkflow = useEditor((s) => s.renameWorkflow);
  const past = useStore(useEditor.temporal, (t) => t.pastStates.length);
  const future = useStore(useEditor.temporal, (t) => t.futureStates.length);
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [renaming, setRenaming] = React.useState(false);
  const chain = diagramChain(workflow, diagramId);

  const doLayout = () => {
    const s = useEditor.getState();
    beginInteraction();
    s.setNodes(autoLayout(s.nodes, s.edges));
    endInteraction();
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 20);
  };
  const doExport = async () => {
    const s = useEditor.getState();
    const page = currentPage(s);
    if (!canvasRef.current) return;
    await exportPng(canvasRef.current, s.nodes, `${s.workflow.diagrams[s.diagramId].name} - ${page?.name ?? "page"}`);
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 bg-brand-navy px-3 text-white">
      <Link href="/" title="All workflows" className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/15">
        <Home size={18} />
      </Link>
      <nav className="flex min-w-0 items-center gap-1 text-sm">
        {chain.map((d, i) => {
          const last = i === chain.length - 1;
          const isRoot = i === 0;
          if (last && isRoot) {
            return renaming ? (
              <TextEditor
                key={d.id}
                value={workflow.name}
                multiline={false}
                onCommit={(v) => {
                  renameWorkflow(v);
                  setRenaming(false);
                }}
                onCancel={() => setRenaming(false)}
                className="w-56 rounded-md bg-white px-2 py-1 text-sm text-foreground outline-none"
              />
            ) : (
              <button
                key={d.id}
                type="button"
                onClick={() => setRenaming(true)}
                title="Click to rename"
                className="max-w-64 truncate rounded-md px-2 py-1 font-semibold hover:bg-white/15"
              >
                {workflow.name}
              </button>
            );
          }
          return (
            <React.Fragment key={d.id}>
              {i > 0 && <ChevronRight size={14} className="shrink-0 text-white/50" />}
              {last ? (
                <span className="max-w-56 truncate rounded-md px-2 py-1 font-semibold">{d.name}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => goTo(d.id, chain[i + 1]?.parentPageId ?? undefined)}
                  className="max-w-56 truncate rounded-md px-2 py-1 text-white/80 hover:bg-white/15 hover:text-white"
                >
                  {isRoot ? workflow.name : d.name}
                </button>
              )}
            </React.Fragment>
          );
        })}
        {chain.length > 1 && (
          <button
            type="button"
            onClick={() => {
              const cur = chain[chain.length - 1];
              if (cur.parentDiagramId) goTo(cur.parentDiagramId, cur.parentPageId ?? undefined);
            }}
            title="Up one level"
            className="ml-1 flex h-7 items-center gap-1 rounded-md border border-white/25 px-2 text-xs text-white/85 hover:bg-white/15"
          >
            <ArrowUpLeft size={13} /> Up
          </button>
        )}
      </nav>

      <div className="mx-auto flex items-center gap-0.5 rounded-lg bg-white/10 p-0.5">
        <ToolButton title="Select (V)" active={tool === "select"} onClick={() => setTool("select")}>
          <MousePointer2 size={16} />
        </ToolButton>
        <ToolButton title="Pan (H, or hold Space)" active={tool === "hand"} onClick={() => setTool("hand")}>
          <Hand size={16} />
        </ToolButton>
        <span className="mx-1 h-5 w-px bg-white/20" />
        <ToolButton title="Undo (Ctrl+Z)" onClick={undo} disabled={past === 0}>
          <Undo2 size={16} />
        </ToolButton>
        <ToolButton title="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={future === 0}>
          <Redo2 size={16} />
        </ToolButton>
        <span className="mx-1 h-5 w-px bg-white/20" />
        <ToolButton title="Zoom out" onClick={() => zoomOut({ duration: 150 })}>
          <ZoomOut size={16} />
        </ToolButton>
        <ToolButton title="Zoom in" onClick={() => zoomIn({ duration: 150 })}>
          <ZoomIn size={16} />
        </ToolButton>
        <ToolButton title="Fit to view" onClick={() => fitView({ padding: 0.2, duration: 300 })}>
          <Maximize size={16} />
        </ToolButton>
        <span className="mx-1 h-5 w-px bg-white/20" />
        <ToolButton title="Tidy up (auto-layout)" onClick={doLayout}>
          <LayoutGrid size={16} />
        </ToolButton>
        <ToolButton title="Export this page as PNG" onClick={() => void doExport()}>
          <Download size={16} />
        </ToolButton>
      </div>

      <SaveIndicator />
    </header>
  );
}
