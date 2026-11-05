import { expect, test, type Page } from "@playwright/test";

const NAME = `Smoke ${Date.now()}`;

async function handleCenter(page: Page, nodeIndex: number, side: "top" | "bottom" | "left" | "right") {
  const handle = page.locator(".react-flow__node").nth(nodeIndex).locator(`.react-flow__handle-${side}`);
  const box = await handle.boundingBox();
  if (!box) throw new Error("handle not found");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test.describe.serial("workflow studio smoke", () => {
  let workflowUrl = "";

  test("home lists the example and creates a workflow", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Workflows" })).toBeVisible();
    await expect(page.getByText("Hiring process (example)")).toBeVisible();
    await page.getByRole("button", { name: "New workflow" }).first().click();
    await page.getByPlaceholder("e.g. Hiring process").fill(NAME);
    await page.getByRole("button", { name: "Create" }).click();
    await page.waitForURL(/\/w\//);
    workflowUrl = page.url();
    await expect(page.getByRole("button", { name: NAME })).toBeVisible();
    await expect(page.locator(".react-flow__node")).toHaveCount(0);
  });

  test("adds shapes, types text and connects them", async ({ page }) => {
    await page.goto(workflowUrl);
    await expect(page.locator(".react-flow")).toBeVisible();
    await page.getByRole("button", { name: "Process", exact: true }).click();
    await page.keyboard.type("First step");
    await page.keyboard.press("Enter");
    await expect(page.locator(".react-flow__node").first()).toContainText("First step");

    await page.getByRole("button", { name: "Decision", exact: true }).click();
    await page.keyboard.type("All good?");
    await page.keyboard.press("Enter");
    await expect(page.locator(".react-flow__node")).toHaveCount(2);

    // Move the second shape down so the two do not overlap, then connect bottom -> top.
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Escape");

    await page.locator(".react-flow__node").first().hover();
    const from = await handleCenter(page, 0, "bottom");
    const to = await handleCenter(page, 1, "top");
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 8 });
    await page.mouse.move(to.x, to.y, { steps: 8 });
    await page.mouse.up();
    await expect(page.locator(".react-flow__edge")).toHaveCount(1);

    await expect(page.getByText(/^Saved/)).toBeVisible({ timeout: 15_000 });
  });

  test("persists after reload", async ({ page }) => {
    await page.goto(workflowUrl);
    await expect(page.locator(".react-flow__node")).toHaveCount(2);
    await expect(page.locator(".react-flow__edge")).toHaveCount(1);
    await expect(page.locator(".react-flow__node").first()).toContainText("First step");
  });

  test("pages: add, rename via menu, switch", async ({ page }) => {
    await page.goto(workflowUrl);
    await page.getByRole("button", { name: "Page", exact: true }).click();
    await expect(page.getByRole("button", { name: /Page 2/ })).toBeVisible();
    await expect(page.locator(".react-flow__node")).toHaveCount(0);
    await expect(page).toHaveURL(/p=/);
    await page.getByRole("button", { name: "Page 1", exact: true }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(2);
    await expect(page.getByText(/^Saved/)).toBeVisible({ timeout: 15_000 });
  });

  test("nesting: double-click a predefined process, then go back up", async ({ page }) => {
    await page.goto(workflowUrl);
    await page.getByRole("button", { name: "Predefined process", exact: true }).click();
    await page.keyboard.type("Onboarding");
    await page.keyboard.press("Enter");
    await expect(page.locator(".react-flow__node")).toHaveCount(3);
    await page.locator(".react-flow__node", { hasText: "Onboarding" }).dblclick();
    // The sub-process shows up in the breadcrumb and as its own tab at the bottom.
    await expect(page.getByText("Onboarding", { exact: true }).first()).toBeVisible();
    await expect(page.getByTitle("Sub-process: Onboarding")).toBeVisible();
    await expect(page.locator(".react-flow__node")).toHaveCount(0);
    await expect(page).toHaveURL(/d=/);
    await page.getByRole("button", { name: "Process", exact: true }).click();
    await page.keyboard.type("Inside step");
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Up", exact: true }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(3);
    // Tabs switch between the main process and the sub-process.
    await page.getByTitle("Sub-process: Onboarding").click();
    await expect(page.locator(".react-flow__node", { hasText: "Inside step" })).toBeVisible();
    await page.getByTitle("Page 1").click();
    await expect(page.locator(".react-flow__node")).toHaveCount(3);
    await expect(page.getByText(/^Saved/)).toBeVisible({ timeout: 15_000 });
    await page.reload();
    await page.locator(".react-flow__node", { hasText: "Onboarding" }).dblclick();
    await expect(page.locator(".react-flow__node", { hasText: "Inside step" })).toBeVisible();
  });

  test("swimlane, undo, redo and export", async ({ page }) => {
    await page.goto(workflowUrl);
    await page.getByRole("button", { name: "Swimlane" }).click();
    await expect(page.locator(".react-flow__node-swimlane")).toHaveCount(1);
    await expect(page.locator(".react-flow__node-swimlane")).toContainText("Lane 1");
    await page.getByRole("button", { name: "Add lane" }).click();
    await expect(page.locator(".react-flow__node-swimlane")).toContainText("Lane 4");
    await page.locator(".react-flow__pane").click({ position: { x: 20, y: 20 } });
    await page.keyboard.press("Control+z");
    await expect(page.locator(".react-flow__node-swimlane")).not.toContainText("Lane 4");
    await page.keyboard.press("Control+z");
    await expect(page.locator(".react-flow__node-swimlane")).toHaveCount(0);
    await page.keyboard.press("Control+Shift+z");
    await expect(page.locator(".react-flow__node-swimlane")).toHaveCount(1);

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export this page as PNG" }).click();
    expect((await download).suggestedFilename()).toMatch(/\.png$/);
  });


  test("swimlane carries its shapes when dragged and lanes resize", async ({ page }) => {
    await page.goto(workflowUrl);
    // Work on a fresh page so earlier tests' shapes cannot interfere.
    await page.getByRole("button", { name: "Page", exact: true }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(0);
    await page.getByRole("button", { name: "Swimlane" }).click();
    await page.getByRole("button", { name: "Process", exact: true }).click();
    await page.keyboard.type("In lane");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
    const shape = page.locator(".react-flow__node-shape", { hasText: "In lane" });
    const lane = page.locator(".react-flow__node-swimlane");
    const before = (await shape.boundingBox())!;
    const label = lane.locator(".lane-drag-handle").first();
    const lb = (await label.boundingBox())!;
    await page.mouse.move(lb.x + lb.width / 2, lb.y + lb.height / 2);
    await page.mouse.down();
    await page.mouse.move(lb.x + lb.width / 2 + 60, lb.y + lb.height / 2 + 40, { steps: 10 });
    await page.mouse.move(lb.x + lb.width / 2 + 120, lb.y + lb.height / 2 + 80, { steps: 10 });
    await page.mouse.up();
    const after = (await shape.boundingBox())!;
    expect(after.x - before.x).toBeGreaterThan(80);
    expect(after.y - before.y).toBeGreaterThan(50);

    // Drag the first lane divider down: the lane grows and the swimlane gets taller.
    const laneBox = (await lane.boundingBox())!;
    const divider = lane.locator("[title='Drag to resize lane']").first();
    const db = (await divider.boundingBox())!;
    await page.mouse.move(db.x + db.width / 2, db.y + db.height / 2);
    await page.mouse.down();
    await page.mouse.move(db.x + db.width / 2, db.y + db.height / 2 + 50, { steps: 10 });
    await page.mouse.up();
    const laneAfter = (await lane.boundingBox())!;
    expect(laneAfter.height - laneBox.height).toBeGreaterThan(30);
    await expect(page.getByText(/^Saved/)).toBeVisible({ timeout: 15_000 });
  });

  test("deletes the workflow from home", async ({ page }) => {
    await page.goto("/");
    const card = page.locator("li", { hasText: NAME });
    await card.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.locator("li", { hasText: NAME })).toHaveCount(0);
  });
});
