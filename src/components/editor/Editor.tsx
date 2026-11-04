"use client";
import * as React from "react";
import dynamic from "next/dynamic";
import type { Workflow } from "@/lib/types";
import { redo, undo, useEditor } from "@/lib/editor/store";

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export function useKeyboard() {
  React.useEffect(() => {
    let spaceHeld = false;
    let toolBeforeSpace: "select" | "hand" = "select";
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const s = useEditor.getState();
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && key === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && key === "c") {
        s.copy();
        return;
      }
      if (mod && key === "v") {
        e.preventDefault();
        s.paste();
        return;
      }
      if (mod && key === "d") {
        e.preventDefault();
        s.duplicate();
        return;
      }
      if (mod && key === "a") {
        e.preventDefault();
        s.selectAll();
        return;
      }
      if (e.key === "Escape") {
        s.setEditing(null);
        s.deselectAll();
        return;
      }
      if (e.key === "Enter" || e.key === "F2") {
        const sel = s.nodes.filter((n) => n.selected);
        if (sel.length === 1 && sel[0].type === "shape") {
          e.preventDefault();
          s.setEditing(sel[0].id);
        }
        return;
      }
      if (!mod && key === "v") {
        s.setTool("select");
        return;
      }
      if (!mod && key === "h") {
        s.setTool("hand");
        return;
      }
      if (e.key === " " && !e.repeat && !spaceHeld) {
        spaceHeld = true;
        toolBeforeSpace = s.tool;
        s.setTool("hand");
        e.preventDefault();
        return;
      }
      const step = e.shiftKey ? 1 : 10;
      const arrows: Record<string, [number, number]> = {
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
      };
      if (arrows[e.key] && s.nodes.some((n) => n.selected)) {
        e.preventDefault();
        s.nudge(...arrows[e.key]);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === " " && spaceHeld) {
        spaceHeld = false;
        useEditor.getState().setTool(toolBeforeSpace);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);
}

export function useUrlSync() {
  const workflowId = useEditor((s) => s.workflow.id);
  const diagramId = useEditor((s) => s.diagramId);
  const pageId = useEditor((s) => s.pageId);
  const rootId = useEditor((s) => s.workflow.rootDiagramId);
  React.useEffect(() => {
    const url = new URL(window.location.href);
    url.pathname = `/w/${workflowId}`;
    url.search = "";
    if (diagramId !== rootId) url.searchParams.set("d", diagramId);
    const diagram = useEditor.getState().workflow.diagrams[diagramId];
    if (diagram && diagram.pages[0]?.id !== pageId) url.searchParams.set("p", pageId);
    if (url.toString() !== window.location.href) window.history.replaceState(null, "", url.toString());
  }, [workflowId, diagramId, pageId, rootId]);
}

function Loading({ name }: { name: string }) {
  return (
    <div className="flex h-screen flex-col">
      <div className="h-12 bg-brand-navy" />
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Loading {name}…</div>
    </div>
  );
}

// The editor is client-only: zustand serves its initial (empty) state during server
// rendering, so the shell is loaded in the browser and initialises the store there.
const EditorShell = dynamic(() => import("./EditorShell").then((m) => m.EditorShell), {
  ssr: false,
  loading: () => <Loading name="" />,
});

export function Editor({
  workflow,
  initialDiagramId,
  initialPageId,
}: {
  workflow: Workflow;
  initialDiagramId: string;
  initialPageId: string;
}) {
  return <EditorShell workflow={workflow} initialDiagramId={initialDiagramId} initialPageId={initialPageId} />;
}
