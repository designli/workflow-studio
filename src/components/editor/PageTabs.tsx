"use client";
import * as React from "react";
import { ChevronDown, Plus } from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import { cn } from "@/lib/cn";
import { TextEditor } from "./nodes/TextEditor";

export function PageTabs() {
  const workflow = useEditor((s) => s.workflow);
  const diagramId = useEditor((s) => s.diagramId);
  const pageId = useEditor((s) => s.pageId);
  const goTo = useEditor((s) => s.goTo);
  const addPage = useEditor((s) => s.addPage);
  const renamePage = useEditor((s) => s.renamePage);
  const movePage = useEditor((s) => s.movePage);
  const deletePage = useEditor((s) => s.deletePage);
  const [renaming, setRenaming] = React.useState<string | null>(null);
  const [menu, setMenu] = React.useState<string | null>(null);
  const diagram = workflow.diagrams[diagramId];

  React.useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menu]);

  return (
    <div className="flex h-10 shrink-0 items-stretch border-t border-border bg-card px-2">
      <div className="flex items-stretch gap-0.5 overflow-x-auto">
        {diagram.pages.map((p, i) => {
          const active = p.id === pageId;
          return (
            <div key={p.id} className="relative flex items-stretch">
              <button
                type="button"
                onClick={() => !active && goTo(diagramId, p.id)}
                onDoubleClick={() => setRenaming(p.id)}
                className={cn(
                  "my-1 flex items-center gap-1 rounded-md px-3 text-sm",
                  active ? "bg-brand-navy text-white" : "text-foreground hover:bg-muted",
                )}
              >
                {renaming === p.id ? (
                  <TextEditor
                    value={p.name}
                    multiline={false}
                    onCommit={(v) => {
                      renamePage(p.id, v);
                      setRenaming(null);
                    }}
                    onCancel={() => setRenaming(null)}
                    className="w-28 rounded bg-white px-1 text-sm text-foreground outline-none"
                  />
                ) : (
                  <span className="max-w-40 truncate">{p.name}</span>
                )}
                {active && (
                  <span
                    role="button"
                    aria-label="Page options"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenu(menu === p.id ? null : p.id);
                    }}
                    className="-mr-1 rounded p-0.5 hover:bg-white/20"
                  >
                    <ChevronDown size={14} />
                  </span>
                )}
              </button>
              {menu === p.id && (
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  className="absolute bottom-full left-0 z-30 mb-1 w-40 rounded-lg border border-border bg-card py-1 text-sm shadow-md"
                >
                  {[
                    { label: "Rename", run: () => setRenaming(p.id) },
                    { label: "Move left", run: () => movePage(p.id, -1), disabled: i === 0 },
                    { label: "Move right", run: () => movePage(p.id, 1), disabled: i === diagram.pages.length - 1 },
                    {
                      label: "Delete page",
                      danger: true,
                      disabled: diagram.pages.length <= 1,
                      run: () => {
                        if (window.confirm(`Delete page "${p.name}" and everything on it?`)) deletePage(p.id);
                      },
                    },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      disabled={item.disabled}
                      onClick={() => {
                        setMenu(null);
                        item.run();
                      }}
                      className={cn(
                        "block w-full px-3 py-1.5 text-left hover:bg-muted disabled:opacity-40",
                        item.danger && "text-destructive",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={addPage}
        title="Add a page"
        className="my-1 ml-1 flex items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Plus size={16} /> Page
      </button>
    </div>
  );
}
