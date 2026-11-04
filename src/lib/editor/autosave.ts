"use client";
import * as React from "react";
import { useEditor } from "./store";

const DEBOUNCE_MS = 800;

async function save(keepalive = false): Promise<boolean> {
  const st = useEditor.getState();
  const revision = st.revision;
  const wf = st.commitPage();
  st.setSaveState("saving");
  try {
    const res = await fetch(`/api/workflows/${wf.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(wf),
      keepalive,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Save failed (${res.status})`);
    }
    const body = (await res.json()) as { updatedAt: string };
    useEditor.getState().setSaveState("saved", { lastSavedAt: body.updatedAt, forRevision: revision });
    return true;
  } catch (err) {
    useEditor.getState().setSaveState("error", { error: (err as Error).message });
    return false;
  }
}

/** Save the current state now (used before leaving the page). */
export function flushSave(): Promise<boolean> {
  return useEditor.getState().dirty ? save(true) : Promise.resolve(true);
}

/** Debounced autosave: watches the store revision and writes the whole workflow. */
export function useAutosave() {
  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let retry = 0;
    const schedule = (ms: number) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        timer = null;
        const ok = await save();
        const st = useEditor.getState();
        if (!ok) {
          retry = Math.min(retry + 1, 4);
          schedule(1500 * 2 ** retry);
        } else {
          retry = 0;
          if (st.dirty) schedule(DEBOUNCE_MS);
        }
      }, ms);
    };
    const unsub = useEditor.subscribe((s, prev) => {
      if (s.revision !== prev.revision) schedule(DEBOUNCE_MS);
    });
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && useEditor.getState().dirty) void save(true);
    };
    const onUnload = (e: BeforeUnloadEvent) => {
      if (useEditor.getState().dirty) {
        void save(true);
        e.preventDefault();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, []);
}
