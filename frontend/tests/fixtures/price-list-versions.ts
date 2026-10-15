import { IMPORT_API_FIXTURE } from "./price-list-imports";

export const VERSION_ID = "5d408a88-b9d0-4f06-8a99-93a52e2e1fdd";
export const PREVIOUS_VERSION_ID = "b3aa21c1-5012-4ae0-8d06-a8e7a9446810";

export const VERSION_API_FIXTURE = {
  id: VERSION_ID,
  supplier_id: IMPORT_API_FIXTURE.supplier.id,
  source_import_id: IMPORT_API_FIXTURE.id,
  previous_version_id: PREVIOUS_VERSION_ID,
  version_number: 2,
  created_by_user_id: "9bdc4f9f-875f-4e16-82eb-aa66e9d795f6",
  created_by_email: "owner@example.com",
  row_count: 24,
  created_at: "2026-09-18T08:00:00Z",
  review_status: "READY_FOR_REVIEW",
  decided_by_user_id: null,
  decided_by_email: null,
  decided_at: null,
  decision_note: null,
  is_current: false,
} as const;

export const APPROVED_VERSION_API_FIXTURE = {
  ...VERSION_API_FIXTURE,
  review_status: "APPROVED",
  decided_by_user_id: VERSION_API_FIXTURE.created_by_user_id,
  decided_by_email: VERSION_API_FIXTURE.created_by_email,
  decided_at: "2026-09-21T08:30:00Z",
  decision_note: "تغییرات بررسی شد.",
  is_current: true,
} as const;

export const APPROVAL_RESULT_API_FIXTURE = {
  review: {
    version_id: VERSION_ID,
    status: "APPROVED",
    decided_by_user_id: VERSION_API_FIXTURE.created_by_user_id,
    decided_by_email: VERSION_API_FIXTURE.created_by_email,
    decided_at: "2026-09-21T08:30:00Z",
    decision_note: "تغییرات بررسی شد.",
  },
  previous_current_version_id: PREVIOUS_VERSION_ID,
  current_version_id: VERSION_ID,
} as const;

export const AUDIT_EVENT_API_FIXTURE = {
  id: "7ac2d4d5-617f-4bc9-98ad-54c6a3cba75c",
  actor_user_id: VERSION_API_FIXTURE.created_by_user_id,
  actor_email: VERSION_API_FIXTURE.created_by_email,
  action: "PRICE_LIST_VERSION_APPROVED",
  entity_type: "PRICE_LIST_VERSION",
  entity_id: VERSION_ID,
  occurred_at: "2026-09-21T08:30:00Z",
  details: {
    previous_status: "READY_FOR_REVIEW",
    new_status: "APPROVED",
    previous_current_version_id: PREVIOUS_VERSION_ID,
    new_current_version_id: VERSION_ID,
    decision_note: "تغییرات بررسی شد.",
  },
} as const;

export const VERSION_ITEM_API_FIXTURE = {
  id: "db4cadf9-7da3-4aa7-b784-97f6e3730df2",
  source_row_number: 2,
  product_code_raw: "001-A",
  product_code_normalized: "001-A",
  product_name_raw: "<script>alert(1)</script>",
  product_name_normalized: "کابل شبکه",
  brand: "Example",
  unit: "بسته",
  pack_size: 10,
  price_irr: 15_000_000,
  availability: "in_stock",
  availability_raw: "موجود",
  notes: null,
  created_at: "2026-09-18T08:00:00Z",
} as const;

const previousItem = {
  source_row_number: 2,
  product_code_raw: "001-A",
  product_code_normalized: "001-A",
  product_name_raw: "<script>alert(1)</script>",
  brand: "Example",
  unit: "عدد",
  pack_size: 1,
  price_irr: 12_500_000,
  availability: "in_stock",
  availability_raw: "موجود",
  notes: null,
  raw_row: {},
} as const;

export const IMPORT_CHANGE_REPORT_API_FIXTURE = {
  import_id: IMPORT_API_FIXTURE.id,
  created_version: null,
  baseline_version: {
    id: PREVIOUS_VERSION_ID,
    version_number: 1,
    created_at: "2026-09-17T08:00:00Z",
  },
  summary: {
    old_items: 24,
    new_items: 24,
    added: 2,
    removed: 2,
    price_changed: 18,
    price_increased: 10,
    price_decreased: 8,
    metadata_only_changed: 2,
    unchanged: 2,
    high_risk: 1,
  },
  items: [
    {
      product_code: "001-A",
      change_types: ["PRICE_CHANGED", "UNIT_CHANGED", "PACK_SIZE_CHANGED"],
      previous: previousItem,
      current: {
        ...previousItem,
        unit: "بسته",
        pack_size: 10,
        price_irr: 15_000_000,
      },
      field_changes: [
        { field: "price_irr", previous: 12_500_000, current: 15_000_000 },
        { field: "unit", previous: "عدد", current: "بسته" },
        { field: "pack_size", previous: 1, current: 10 },
      ],
      price_delta_irr: 2_500_000,
      price_change_percent: "20.00",
      is_high_risk: true,
    },
  ],
  total: 1,
  limit: 50,
  offset: 0,
} as const;

export const FIRST_IMPORT_CHANGE_REPORT_API_FIXTURE = {
  import_id: IMPORT_API_FIXTURE.id,
  created_version: null,
  baseline_version: null,
  summary: null,
  items: [],
  total: 0,
  limit: 50,
  offset: 0,
} as const;

export const CURRENT_PRICE_IMPACT_API_FIXTURE = {
  target_version: {
    id: VERSION_ID,
    version_number: 3,
    created_at: "2026-09-18T08:00:00Z",
  },
  baseline_status: "CURRENT_BASELINE",
  baseline_version: {
    id: PREVIOUS_VERSION_ID,
    version_number: 1,
    created_at: "2026-09-16T08:00:00Z",
  },
  is_latest: true,
  supplier_is_active: true,
  summary: IMPORT_CHANGE_REPORT_API_FIXTURE.summary,
  items: IMPORT_CHANGE_REPORT_API_FIXTURE.items,
  total: 1,
  limit: 50,
  offset: 0,
} as const;

export const NO_CURRENT_PRICE_IMPACT_API_FIXTURE = {
  target_version: {
    id: VERSION_ID,
    version_number: 1,
    created_at: "2026-09-18T08:00:00Z",
  },
  baseline_status: "NO_CURRENT",
  baseline_version: null,
  is_latest: true,
  supplier_is_active: true,
  summary: null,
  items: [],
  total: 0,
  limit: 50,
  offset: 0,
} as const;
