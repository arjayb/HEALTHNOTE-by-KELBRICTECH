import { expect, test } from "@playwright/test";

test("manual entry, persistence, filtering, archive, and PDF journey", async ({ page }, testInfo) => {
  await page.goto("./");
  await page.getByTestId("create-healthnote").click();
  await page.getByRole("button", { name: "Tap to continue" }).click();
  await expect(page.getByTestId("empty-no-records")).toBeVisible();

  await page.getByTestId("capture-action").click();
  await page.getByRole("button", { name: "Enter Manually" }).click();
  await page.getByLabel("Value").fill("6.1");
  await page.getByLabel("Unit").fill("x10^9/L");
  await page.getByLabel("Clinical date (optional)").fill("2026-08-24");
  await page.getByRole("button", { name: "Save UNVERIFIED Entry" }).click();

  await expect(page.getByText("UNVERIFIED", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("BASELINE", { exact: true })).toBeVisible();
  await expect(page.getByText("No original source is attached")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("unlock-healthnote")).toBeEnabled();
  await page.getByTestId("unlock-healthnote").click();
  await expect(page.getByTestId("result-wbc")).toContainText("6.1");

  await page.getByRole("button", { name: "Verified only" }).click();
  await expect(page.getByTestId("empty-no-verified")).toBeVisible();

  await page.getByRole("button", { name: "Share" }).click();
  await page.getByRole("button", { name: "Generate PDF" }).click();
  await expect(page.locator("iframe[title='PDF preview']")).toBeVisible();

  await page.screenshot({
    path: `screenshots/${testInfo.project.name}-share.png`,
    fullPage: true,
  });
});
