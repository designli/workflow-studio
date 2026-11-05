# Workflow Studio

A Visio-style workflow builder for Designli. Draw processes with the standard flowchart
shapes, swimlanes per role, arrows with labels, pages (tabs) per diagram, and nested
sub-processes behind any *Predefined process* shape.

## Run it on your computer

```sh
cd ~/workflow-studio
npm run dev
```

Then open http://localhost:3000 in your browser. Press `Ctrl+C` in the terminal to stop it.

On your computer, workflows are saved as files in `data/workflows/` (one JSON file each).
They are not committed to git. The hosted version on Vercel keeps them in a Postgres
database instead (see "Hosting" below).

## Using it

- **Home** lists every workflow. Create, rename, duplicate or delete from there.
- **Shapes** live in the left panel: drag one onto the canvas or click it to add one in the middle of the view.
- **Text**: double-click a shape (or press Enter with it selected) and type. Enter finishes, Shift+Enter adds a line.
- **Arrows**: drag from one of the four dots on a shape's edge to another shape. Double-click an arrow to label it. Arrows from a Decision get "Yes" and "No" labels automatically.
- **Swimlanes**: add one from the top of the shape list. Double-click a lane name to rename it, drag the line between lanes to resize them, and use the right panel to add, reorder, colour or remove lanes. Dragging the label column moves the whole swimlane with everything inside it.
- **Sub-processes**: double-click a *Predefined process* to open the diagram inside it. The breadcrumb at the top (and the *Up* button) takes you back.
- **Tabs** at the bottom, like sheets in a spreadsheet: the main process first, then every sub-process as its own tab (indented when nested). Click a tab to jump there. The arrow on the active tab opens rename and delete; "+ Page" adds an extra page to the process you are looking at.
- **Canvas**: scroll to pan, Ctrl + scroll to zoom, hold Space (or pick the hand tool) to drag the canvas. Drag on empty space to select several shapes.
- **Keyboard**: Delete removes, Ctrl+Z / Ctrl+Shift+Z undo and redo, Ctrl+C / Ctrl+V copy and paste, Ctrl+D duplicate, Ctrl+A select all, arrow keys nudge.
- **Export**: the download button in the toolbar saves the current page as a PNG.

Everything saves automatically; the top-right corner shows the save state.

## For developers

- Next.js 16 (App Router, TypeScript, Tailwind 4), React Flow 12 (`@xyflow/react`), zustand + zundo for state and undo, dagre for auto-layout, html-to-image for export.
- `src/lib/types.ts` is the document model: a workflow is a tree of diagrams, each diagram has pages, each page holds nodes and edges.
- `src/lib/storage.ts` is the only module the app talks to for persistence. It picks a backend from `src/lib/storage/`: Postgres (`postgres.ts`, Neon serverless driver) when `DATABASE_URL` is set, JSON files (`file.ts`) otherwise. The table is created on first use, no migration step.
- `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- End-to-end smoke test: `npx playwright test` (needs `npx playwright install chromium`; on a bare WSL Ubuntu, Chromium also needs `libnss3`, `libnspr4` and `libasound2`).

## Hosting

- Code: GitHub `designli/workflow-studio`. Every push to `main` deploys to production on Vercel.
- Vercel project `workflow-studio` on Diego Morales' Vercel account, with a **Neon Postgres** database from the Vercel Marketplace. The integration sets `DATABASE_URL` on the project; nothing else is needed.
- To run the hosted database locally: `vercel env pull .env.local`, then `npm run dev`.

## Not in this version (planned)

1. **Sign-in with Designli Google accounts** (`designli.co` only), the same approach as HRIS: Google Identity Services button, server-side `verifyIdToken`, `hd` claim check. `createdBy` / `updatedBy` fields will be added then. Until then the hosted URL is open to anyone who has it.
2. Nice-to-haves: vertical swimlanes, SVG/PDF export, comments.
