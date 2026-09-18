import type { MappingReview } from "@/services/price-list-imports/column-mapping.schema";
export const MAPPING_REVIEW_FIXTURE: MappingReview = {
  can_edit: true,
  historical_snapshot: true,
  saved_template: null,
  inspection: {
    sheets: ["Sheet"],
    detected_mapping: {
      sheet_name: "Sheet",
      header_row: 1,
      columns: { product_code: 1, product_name: 2, price_irr: 3 },
    },
    used_mapping: {
      sheet_name: "Sheet",
      header_row: 1,
      columns: { product_code: 1, product_name: 2, price_irr: 3 },
    },
    origin: "detected",
    template_id: null,
    columns: [
      { index: 1, label: "کد کالا" },
      { index: 2, label: "نام کالا" },
      { index: 3, label: "قیمت ریال" },
    ],
    ambiguous_fields: {},
    preview: [{ source_row_number: 2, values: ["001", "کابل", "1000"] }],
    issues: [],
    total_errors: 0,
    errors_truncated: false,
  },
};
