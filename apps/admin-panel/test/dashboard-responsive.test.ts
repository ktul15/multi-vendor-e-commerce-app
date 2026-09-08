import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("admin dashboard responsive styles", () => {
  const css = readFileSync(`${process.cwd()}/app/globals.css`, "utf8");

  it("collapses metric cards at tablet and mobile breakpoints", () => {
    expect(css).toMatch(
      /@media \(max-width: 70rem\)[\s\S]*?admin-overview__metrics[\s\S]*?repeat\(2/,
    );
    expect(css).toMatch(/@media \(max-width: 42rem\)[\s\S]*?admin-overview__metrics[\s\S]*?1fr/);
  });

  it("keeps wide recent-order content horizontally scrollable", () => {
    expect(css).toMatch(/admin-orders-table-wrap[\s\S]*?overflow-x: auto/);
    expect(css).toMatch(/admin-orders-table[\s\S]*?min-width: 54rem/);
  });
});
