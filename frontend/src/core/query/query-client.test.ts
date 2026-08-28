import { describe, expect, it } from "vitest";

import { createQueryClient } from "./query-client";

describe("createQueryClient", () => {
  it("uses conservative defaults for dashboard queries", () => {
    const options = createQueryClient().getDefaultOptions();

    expect(options.queries).toMatchObject({
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    });
  });

  it("does not retry user-triggered mutations automatically", () => {
    const options = createQueryClient().getDefaultOptions();

    expect(options.mutations).toMatchObject({ retry: false });
  });
});
