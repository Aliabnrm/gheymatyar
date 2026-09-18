export const IMPORT_ID = "2f04c0aa-5644-40c7-9268-426b2e228f60";
export const DOCUMENT_ID = "2aef0a84-8f28-4937-a10c-8930df3a7a29";

export const IMPORT_API_FIXTURE = {
  id: IMPORT_ID,
  supplier: {
    id: "01e82339-1b65-44ee-9910-b32673050856",
    name: "تأمین‌کننده نمونه",
  },
  source_document: {
    id: DOCUMENT_ID,
    original_filename: "price-list.xlsx",
    media_type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    size_bytes: 24_576,
    sha256_hex: "a".repeat(64),
    created_at: "2026-09-03T10:00:00Z",
  },
  status: "DRAFT",
  row_count: 1,
  blocking_error: null,
  created_at: "2026-09-03T10:00:00Z",
  completed_at: "2026-09-03T10:00:01Z",
} as const;

export const EXTRACTED_ROW_API_FIXTURE = {
  id: "db4cadf9-7da3-4aa7-b784-97f6e3730df2",
  source_row_number: 2,
  product_code_raw: "001-A",
  product_code_normalized: "001-A",
  product_name_raw: "کابل شبکه",
  product_name_normalized: "کابل شبکه",
  brand: "Example",
  unit: "عدد",
  pack_size: 10,
  price_irr: 12_500_000,
  availability: "in_stock",
  availability_raw: "موجود",
  notes: null,
  raw_row: { code: "001-A" },
  created_at: "2026-09-03T10:00:01Z",
} as const;
