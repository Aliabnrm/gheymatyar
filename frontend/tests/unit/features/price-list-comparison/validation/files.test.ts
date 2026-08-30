import { describe, expect, it } from "vitest";

import {
  MAX_FILE_BYTES,
  validateComparisonFiles,
} from "@/features/price-list-comparison/validation/files";

function makeFile(name: string, size: number): File {
  return new File([new Uint8Array(size)], name);
}

describe("comparison file validation", () => {
  it("requires both files", () => {
    expect(validateComparisonFiles(null, null)).toMatchObject({
      valid: false,
      error: { code: "FILES_REQUIRED" },
    });
  });

  it("accepts XLSX extensions case-insensitively", () => {
    expect(
      validateComparisonFiles(makeFile("old.XLSX", 1), makeFile("new.xlsx", 1)),
    ).toMatchObject({ valid: true });
  });

  it("rejects unsupported files", () => {
    expect(
      validateComparisonFiles(makeFile("old.xls", 1), makeFile("new.xlsx", 1)),
    ).toMatchObject({
      valid: false,
      error: { code: "INVALID_FILE_TYPE" },
    });
  });

  it("rejects files larger than 10 MiB", () => {
    expect(
      validateComparisonFiles(
        makeFile("old.xlsx", MAX_FILE_BYTES + 1),
        makeFile("new.xlsx", 1),
      ),
    ).toMatchObject({
      valid: false,
      error: { code: "FILE_TOO_LARGE" },
    });
  });
});
