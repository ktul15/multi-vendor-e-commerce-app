import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const tokenSource = readFileSync(resolve(process.cwd(), "src/tokens.css"), "utf8");

function token(name: string) {
  const match = tokenSource.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match?.[1]) throw new Error(`Missing hexadecimal token: --${name}`);
  return match[1];
}

function relativeLuminance(hex: string) {
  const channels = [1, 3, 5].map(
    (offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255,
  );
  const [red = 0, green = 0, blue = 0] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: string, second: string) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

describe("semantic color contrast", () => {
  it("keeps focus indicators distinguishable on supported surfaces", () => {
    expect(contrast(token("color-brand-700"), token("color-neutral-0"))).toBeGreaterThanOrEqual(3);
    expect(contrast(token("color-brand-700"), token("color-neutral-50"))).toBeGreaterThanOrEqual(3);
  });

  it("keeps danger text readable on badges and buttons", () => {
    expect(contrast(token("color-danger-text"), token("color-danger-50"))).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(contrast(token("color-danger-600"), token("color-neutral-0"))).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});
