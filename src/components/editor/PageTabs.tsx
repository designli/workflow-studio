"use client";
import * as React from "react";
import { ChevronDown, CornerDownRight, Plus } from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import { tabOrder } from "@/lib/document";
import { cn } from "@/lib/cn";
import { TextEditor } from "./nodes/TextEditor";

/**
 * The strip at the bottom works like sheet tabs in a spreadsheet: the main
 * process first, then every sub-process as its own tab (indented by depth).
 * A diagram with several pages shows one tab per page.
 */
export function PageTabs() {
  const workflow = useEditor((s) => s.workflow);
  const diagramId = useEditor((s) => s.diagramId);
  const pageId = useEditor((s) => s.pageId);
  const goTo = useEditor((s) => s.goTo);
  const addPage = useEditor((s) => s.addPage);
  const renamePage = useEditor((s) => s.renamePage);
  const renameDiagram = useEditor((s) => s.renameDiagram);
  const movePage = useEditor((s) => s.movePage);
  const deletePage = useEditor((s) => s.deletePage);
  const deleteSubDiagram = useEditor((s) => s.deleteSubDiagram);
  const [renaming, setRenaming] = React.useState<string | null>(null);
  const [menu, setMenu] = React.useState<string | null>(null);
  const tabs = React.useMemo(() => tabOrder(workflow), [workflow]);

  React.useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menu]);

  return (
    <div className="flex h-10 shrink-0 items-stretch border-t border-border bg-card px-2">
      <div className="flex items-stretch gap-0.5 overflow-x-auto">
        {tabs.map(({ diagram, page, depth }) => {
          const active = diagram.id === diagramId && page.id === pageId;
          const isRoot = !diagram.parentDiagramId;
          const multiPage = diagram.pages.length > 1;
          const pageIndex = diagram.pages.findIndex((p) => p.id === page.id);
          // Root pages are named by their page; a sub-process by its shape.
          const label = isRoot ? page.name : multiPage ? `${diagram.name} · ${page.name}` : diagram.name;
          const key = `${diagram.id}:${page.id}`;
          const commitRename = (v: string) => {
            if (isRoot || multiPage) renamePage(page.id, v);
            else renameDiagram(diagram.id, v);
            setRenaming(null);
          };
          const menuItems = [
            { label: "Rename", run: () => setRenaming(key) },
            ...(multiPage
              ? [
                  { label: "Move left", run: () => movePage(page.id, -1), disabled: pageIndex === 0 },
                  {
                    label: "Move right",
                    run: () => movePage(page.id, 1),
                    disabled: pageIndex === diagram.pages.length - 1,
                  },
                  {
                    label: "Delete page",
                    danger: true,
                    run: () => {
                      if (window.confirm(`Delete page "${page.name}" and everything on it?`)) deletePage(page.id);
                    },
                  },
                ]
              : []),
            ...(!isRoot
              ? [
                  {
                    label: "Delete sub-process",
                    danger: true,
                    run: () => {
                      if (
                        window.confirm(
                          `Delete the sub-process "${diagram.name}" with everything inside it? The shape on the parent page stays.`,
                        )
                      )
                        deleteSubDiagram(diagram.id);
                    },
                  },
                ]
              : []),
          ];
          return (
            <div key={key} className="relative flex items-stretch">
              <button
                type="button"
                title={isRoot ? page.name : `Sub-process: ${diagram.name}`}
                onClick={() => !active && goTo(diagram.id, page.id)}
                onDoubleClick={() => setRenaming(key)}
                style={{ marginLeft: depth > 1 ? (depth - 1) * 6 : 0 }}
                className={cn(
                  "my-1 flex items-center gap-1 rounded-md px-3 text-sm",
                  active ? "bg-brand-navy text-white" : "text-foreground hover:bg-muted",
                )}
              >
                {!isRoot && <CornerDownRight size={13} className={cn("shrink-0", active ? "opacity-80" : "opacity-50")} />}
                {renaming === key ? (
                  <TextEditor
                    value={isRoot || multiPage ? page.name : diagram.name}
                    multiline={false}
                    onCommit={commitRename}
                    onCancel={() => setRenaming(null)}
                    className="w-36 rounded bg-white px-1 text-sm text-foreground outline-none"
                  />
                ) : (
                  <span className="max-w-48 truncate">{label}</span>
                )}
                {active && (
                  <span
                    role="button"
                    aria-label="Tab options"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenu(menu === key ? null : key);
                    }}
                    className="-mr-1 rounded p-0.5 hover:bg-white/20"
                  >
                    <ChevronDown size={14} />
                  </span>
                )}
              </button>
              {menu === key && (
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  className="absolute bottom-full left-0 z-30 mb-1 w-44 rounded-lg border border-border bg-card py-1 text-sm shadow-md"
                >
                  {menuItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      disabled={"disabled" in item && item.disabled}
                      onClick={() => {
                        setMenu(null);
                        item.run();
                      }}
                      className={cn(
                        "block w-full px-3 py-1.5 text-left hover:bg-muted disabled:opacity-40",
                        "danger" in item && item.danger && "text-destructive",
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
        title="Add a page to the process you are looking at"
        className="my-1 ml-1 flex items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Plus size={16} /> Page
      </button>
    </div>
  );
}
