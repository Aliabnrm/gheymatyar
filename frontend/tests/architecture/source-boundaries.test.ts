import { readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

function collectFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  });
}

function readTypeScriptTree(relativePath: string): string {
  return collectFiles(join(frontendRoot, relativePath))
    .filter((path) => [".ts", ".tsx"].includes(extname(path)))
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
}

describe("frontend source boundaries", () => {
  it("keeps executable tests outside the production source tree", () => {
    const sourceTests = collectFiles(join(frontendRoot, "src")).filter((path) =>
      /\.(test|spec)\.[jt]sx?$/.test(path),
    );

    expect(sourceTests).toEqual([]);
  });

  it("keeps fetch and manual form state out of the auth feature", () => {
    const authFeature = readTypeScriptTree("src/features/auth");

    expect(authFeature).not.toMatch(/\bfetch\s*\(/);
    expect(authFeature).not.toMatch(/\bFormData\b/);
    expect(authFeature).not.toMatch(/\buseState\s*\(/);
    expect(authFeature).not.toMatch(/\.register\s*\(/);
  });

  it("keeps the auth service independent from feature components", () => {
    const authService = readTypeScriptTree("src/services/auth");

    expect(authService).not.toMatch(/@\/features\//);
    expect(authService).not.toMatch(/@\/components\//);
  });
});
