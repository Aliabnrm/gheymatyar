import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { VersionAuditTimeline } from "@/features/price-list-versions";
import { PriceListAuditEventSchema } from "@/services/price-list-versions";

import { IMPORT_API_FIXTURE } from "../../../fixtures/price-list-imports";
import {
  AUDIT_EVENT_API_FIXTURE,
  VERSION_ID,
} from "../../../fixtures/price-list-versions";

const mocks = vi.hoisted(() => ({ audit: {} as Record<string, unknown> }));

vi.mock("@/services/price-list-versions", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/services/price-list-versions")>();
  return {
    ...original,
    usePriceListVersionAuditEventsQuery: () => mocks.audit,
  };
});

beforeEach(() => {
  mocks.audit = {
    isPending: false,
    isError: false,
    data: {
      items: [PriceListAuditEventSchema.parse(AUDIT_EVENT_API_FIXTURE)],
      total: 1,
      limit: 20,
      offset: 0,
    },
  };
});

describe("VersionAuditTimeline", () => {
  it("shows action, actor and safe decision note", () => {
    render(
      <VersionAuditTimeline
        supplierId={IMPORT_API_FIXTURE.supplier.id}
        versionId={VERSION_ID}
      />,
    );

    expect(screen.getByText("نسخه تأیید شد")).toBeInTheDocument();
    expect(screen.getByText(/owner@example.com/)).toBeInTheDocument();
    expect(screen.getByText("تغییرات بررسی شد.")).toBeInTheDocument();
  });

  it("shows loading, empty and error states", () => {
    mocks.audit = { isPending: true, isError: false };
    const view = render(
      <VersionAuditTimeline
        supplierId={IMPORT_API_FIXTURE.supplier.id}
        versionId={VERSION_ID}
      />,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();

    mocks.audit = {
      isPending: false,
      isError: false,
      data: { items: [], total: 0, limit: 20, offset: 0 },
    };
    view.rerender(
      <VersionAuditTimeline
        supplierId={IMPORT_API_FIXTURE.supplier.id}
        versionId={VERSION_ID}
      />,
    );
    expect(screen.getByText(/هنوز تصمیمی/)).toBeInTheDocument();

    mocks.audit = {
      isPending: false,
      isError: true,
      error: { message: "خطای ممیزی" },
      refetch: vi.fn(),
    };
    view.rerender(
      <VersionAuditTimeline
        supplierId={IMPORT_API_FIXTURE.supplier.id}
        versionId={VERSION_ID}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("خطای ممیزی");
  });
});
