"use client";
import * as React from "react";
import { ReactFlowProvider } from "@xyflow/react";
import type { Workflow } from "@/lib/types";
import { useEditor } from "@/lib/editor/store";
import { useAutosave } from "@/lib/editor/autosave";
import { Canvas } from "./Canvas";
import { useKeyboard, useUrlSync } from "./Editor";
import { Inspector } from "./Inspector";
import { PageTabs } from "./PageTabs";
import { ShapePalette } from "./ShapePalette";
import { Toolbar } from "./Toolbar";

function Shell() {
  const canvasRef = React.useRef<HTMLDivElement | null>(null);
  useAutosave();
  useKeyboard();
  useUrlSync();
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Toolbar canvasRef={canvasRef} />
      <div className="flex min-h-0 flex-1">
        <ShapePalette canvasRef={canvasRef} />
        <div className="relative min-w-0 flex-1">
          <Canvas wrapperRef={canvasRef} />
        </div>
        <Inspector />
      </div>
      <PageTabs />
    </div>
  );
}

export function EditorShell({
  workflow,
  initialDiagramId,
  initialPageId,
}: {
  workflow: Workflow;
  initialDiagramId: string;
  initialPageId: string;
}) {
  // Runs once, in the browser, before any child reads the store.
  React.useState(() => {
    useEditor.getState().init(workflow, initialDiagramId, initialPageId);
    return true;
  });
  return (
    <ReactFlowProvider>
      <Shell />
    </ReactFlowProvider>
  );
}
