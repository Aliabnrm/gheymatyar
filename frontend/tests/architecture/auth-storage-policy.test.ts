import { readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const authSourceRoots = [
  join(frontendRoot, "src/features/auth"),
  join(frontendRoot, "src/services/auth"),
  join(frontendRoot, "src/core/api"),
];

function collectTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTypeScriptFiles(path);
    return [".ts", ".tsx"].includes(extname(entry.name)) ? [path] : [];
  });
}

describe("auth browser storage policy", () => {
  it("does not persist auth state or expose the session cookie to JavaScript", () => {
    const source = authSourceRoots
      .flatMap(collectTypeScriptFiles)
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    expect(source).not.toMatch(/localStorage|sessionStorage/);
    expect(source).not.toMatch(/gheymatyar_session/);
  });
});
