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

  it("keeps HTTP transport and manual FormData out of the auth feature", () => {
    const authFeature = readTypeScriptTree("src/features/auth");

    expect(authFeature).not.toMatch(/\bfetch\s*\(/);
    expect(authFeature).not.toMatch(/\bFormData\b/);
    expect(authFeature).not.toMatch(/\.register\s*\(/);
  });

  it("keeps the auth service independent from feature components", () => {
    const authService = readTypeScriptTree("src/services/auth");

    expect(authService).not.toMatch(/@\/features\//);
    expect(authService).not.toMatch(/@\/components\//);
  });

  it("keeps supplier transport out of components and tests out of source", () => {
    const supplierFeature = readTypeScriptTree("src/features/suppliers");
    const supplierService = readTypeScriptTree("src/services/suppliers");

    expect(supplierFeature).not.toMatch(/\bfetch\s*\(/);
    expect(supplierFeature).not.toMatch(/\.register\s*\(/);
    expect(supplierService).not.toMatch(/@\/features\//);
    expect(supplierService).not.toMatch(/@\/components\//);
  });

  it("keeps price-list import transport in its service adapter", () => {
    const importFeature = readTypeScriptTree("src/features/price-list-imports");
    const importService = readTypeScriptTree("src/services/price-list-imports");

    expect(importFeature).not.toMatch(/\bfetch\s*\(/);
    expect(importFeature).not.toMatch(/\.register\s*\(/);
    expect(importFeature).not.toMatch(/\borganizationId\b/);
    expect(importService).not.toMatch(/@\/features\//);
    expect(importService).not.toMatch(/@\/components\//);
  });

  it("keeps price-list version transport and tenant identity out of features", () => {
    const versionFeature = readTypeScriptTree("src/features/price-list-versions");
    const versionService = readTypeScriptTree("src/services/price-list-versions");

    expect(versionFeature).not.toMatch(/\bfetch\s*\(/);
    expect(versionFeature).not.toMatch(/\borganizationId\b/);
    expect(versionService).not.toMatch(/@\/features\//);
    expect(versionService).not.toMatch(/@\/components\//);
  });
});
