"use client";
import * as React from "react";

/** Inline text editor used by shapes, edge labels and lane labels. Enter commits, Shift+Enter adds a line, Esc cancels. */
export function TextEditor({
  value,
  onCommit,
  onCancel,
  multiline = true,
  className = "",
  style,
}: {
  value: string;
  onCommit: (v: string) => void;
  onCancel: () => void;
  multiline?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [text, setText] = React.useState(value);
  const ref = React.useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const done = React.useRef(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.select();
  }, []);

  const commit = () => {
    if (done.current) return;
    done.current = true;
    onCommit(text);
  };
  const cancel = () => {
    if (done.current) return;
    done.current = true;
    onCancel();
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Enter" && (!multiline || !e.shiftKey)) {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };
  const shared = {
    ref,
    value: text,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => setText(e.target.value),
    onKeyDown,
    onBlur: commit,
    onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
    className: `nodrag nopan nowheel ${className}`,
    style,
    spellCheck: false,
  };
  return multiline ? <textarea {...shared} rows={1} /> : <input {...shared} />;
}
