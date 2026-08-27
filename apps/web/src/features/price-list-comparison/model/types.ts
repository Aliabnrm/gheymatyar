export const CHANGE_TYPES = [
  "ADDED",
  "REMOVED",
  "PRICE_CHANGED",
  "PACK_SIZE_CHANGED",
  "UNIT_CHANGED",
  "NAME_CHANGED",
  "BRAND_CHANGED",
  "AVAILABILITY_CHANGED",
  "NOTES_CHANGED",
  "UNCHANGED",
] as const;

export type ChangeType = (typeof CHANGE_TYPES)[number];

export const AVAILABILITIES = [
  "in_stock",
  "limited",
  "out_of_stock",
  "unknown",
] as const;

export type Availability = (typeof AVAILABILITIES)[number];

export interface PriceListItem {
  source_row_number: number;
  product_code_raw: string;
  product_code_normalized: string;
  product_name_raw: string;
  brand: string | null;
  unit: string | null;
  pack_size: number | null;
  price_irr: number;
  availability: Availability;
  availability_raw: string | null;
  notes: string | null;
  raw_row: Record<string, unknown>;
}

export interface FieldChange {
  field: string;
  previous: string | number | null;
  current: string | number | null;
}

export interface ComparisonItem {
  product_code: string;
  change_types: ChangeType[];
  previous: PriceListItem | null;
  current: PriceListItem | null;
  field_changes: FieldChange[];
  price_delta_irr: number | null;
  price_change_percent: string | null;
  is_high_risk: boolean;
}

export interface ComparisonSummary {
  old_items: number;
  new_items: number;
  added: number;
  removed: number;
  price_changed: number;
  price_increased: number;
  price_decreased: number;
  metadata_only_changed: number;
  unchanged: number;
  high_risk: number;
}

export interface ComparisonResponse {
  api_version: "1";
  currency: "IRR";
  summary: ComparisonSummary;
  items: ComparisonItem[];
}

export interface ComparisonError {
  code: string;
  message: string;
}

export interface ApiErrorResponse {
  error: ComparisonError & {
    details: Record<string, unknown>;
  };
}

export type ResultFilter =
  | "all"
  | "high-risk"
  | "price"
  | "added"
  | "removed"
  | "metadata"
  | "unchanged";
