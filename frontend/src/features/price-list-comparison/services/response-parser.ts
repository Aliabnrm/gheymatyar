import {
  AVAILABILITIES,
  CHANGE_TYPES,
  type ApiErrorResponse,
  type Availability,
  type ChangeType,
  type ComparisonItem,
  type ComparisonResponse,
  type ComparisonSummary,
  type FieldChange,
  type PriceListItem,
} from "../model/types";

const changeTypes = new Set<string>(CHANGE_TYPES);
const availabilities = new Set<string>(AVAILABILITIES);

export function parseComparisonResponse(
  payload: unknown,
): ComparisonResponse | null {
  if (!isRecord(payload)) return null;
  if (payload.api_version !== "1" || payload.currency !== "IRR") return null;

  const summary = parseSummary(payload.summary);
  const items = parseArray(payload.items, parseComparisonItem);
  if (!summary || !items) return null;

  return {
    api_version: "1",
    currency: "IRR",
    summary,
    items,
  };
}

export function parseApiErrorResponse(
  payload: unknown,
): ApiErrorResponse | null {
  if (!isRecord(payload) || !isRecord(payload.error)) return null;
  const { code, message, details } = payload.error;
  if (typeof code !== "string" || typeof message !== "string") return null;
  if (!isRecord(details)) return null;

  return { error: { code, message, details } };
}

function parseSummary(value: unknown): ComparisonSummary | null {
  if (!isRecord(value)) return null;
  const oldItems = parseNonNegativeInteger(value.old_items);
  const newItems = parseNonNegativeInteger(value.new_items);
  const added = parseNonNegativeInteger(value.added);
  const removed = parseNonNegativeInteger(value.removed);
  const priceChanged = parseNonNegativeInteger(value.price_changed);
  const priceIncreased = parseNonNegativeInteger(value.price_increased);
  const priceDecreased = parseNonNegativeInteger(value.price_decreased);
  const metadataOnlyChanged = parseNonNegativeInteger(
    value.metadata_only_changed,
  );
  const unchanged = parseNonNegativeInteger(value.unchanged);
  const highRisk = parseNonNegativeInteger(value.high_risk);

  if (
    oldItems === null ||
    newItems === null ||
    added === null ||
    removed === null ||
    priceChanged === null ||
    priceIncreased === null ||
    priceDecreased === null ||
    metadataOnlyChanged === null ||
    unchanged === null ||
    highRisk === null
  ) {
    return null;
  }

  return {
    old_items: oldItems,
    new_items: newItems,
    added,
    removed,
    price_changed: priceChanged,
    price_increased: priceIncreased,
    price_decreased: priceDecreased,
    metadata_only_changed: metadataOnlyChanged,
    unchanged,
    high_risk: highRisk,
  };
}

function parseComparisonItem(value: unknown): ComparisonItem | null {
  if (!isRecord(value)) return null;
  if (typeof value.product_code !== "string") return null;

  const changeTypesValue = parseArray(value.change_types, parseChangeType);
  const previous = parseNullable(value.previous, parsePriceListItem);
  const current = parseNullable(value.current, parsePriceListItem);
  const fieldChanges = parseArray(value.field_changes, parseFieldChange);

  if (!changeTypesValue || changeTypesValue.length === 0) return null;
  if (previous === undefined || current === undefined) return null;
  if (previous === null && current === null) return null;
  if (!fieldChanges) return null;
  if (!isNullableInteger(value.price_delta_irr)) return null;
  if (!isNullableString(value.price_change_percent)) return null;
  if (typeof value.is_high_risk !== "boolean") return null;

  return {
    product_code: value.product_code,
    change_types: changeTypesValue,
    previous,
    current,
    field_changes: fieldChanges,
    price_delta_irr: value.price_delta_irr,
    price_change_percent: value.price_change_percent,
    is_high_risk: value.is_high_risk,
  };
}

function parsePriceListItem(value: unknown): PriceListItem | null {
  if (!isRecord(value)) return null;
  if (!isPositiveInteger(value.source_row_number)) return null;
  if (typeof value.product_code_raw !== "string") return null;
  if (typeof value.product_code_normalized !== "string") return null;
  if (typeof value.product_name_raw !== "string") return null;
  if (!isNullableString(value.brand)) return null;
  if (!isNullableString(value.unit)) return null;
  if (!isNullableInteger(value.pack_size)) return null;
  if (!isPositiveInteger(value.price_irr)) return null;
  const availability = parseAvailability(value.availability);
  if (!availability) return null;
  if (!isNullableString(value.availability_raw)) return null;
  if (!isNullableString(value.notes)) return null;
  if (!isRecord(value.raw_row)) return null;

  return {
    source_row_number: value.source_row_number,
    product_code_raw: value.product_code_raw,
    product_code_normalized: value.product_code_normalized,
    product_name_raw: value.product_name_raw,
    brand: value.brand,
    unit: value.unit,
    pack_size: value.pack_size,
    price_irr: value.price_irr,
    availability,
    availability_raw: value.availability_raw,
    notes: value.notes,
    raw_row: value.raw_row,
  };
}

function parseFieldChange(value: unknown): FieldChange | null {
  if (!isRecord(value) || typeof value.field !== "string") return null;
  if (!isScalarValue(value.previous) || !isScalarValue(value.current)) {
    return null;
  }
  return {
    field: value.field,
    previous: value.previous,
    current: value.current,
  };
}

function parseChangeType(value: unknown): ChangeType | null {
  return isChangeType(value) ? value : null;
}

function parseAvailability(value: unknown): Availability | null {
  return isAvailability(value) ? value : null;
}

function isChangeType(value: unknown): value is ChangeType {
  return typeof value === "string" && changeTypes.has(value);
}

function isAvailability(value: unknown): value is Availability {
  return typeof value === "string" && availabilities.has(value);
}

function parseArray<T>(
  value: unknown,
  parseItem: (item: unknown) => T | null,
): T[] | null {
  if (!Array.isArray(value)) return null;
  const parsed: T[] = [];
  for (const item of value) {
    const result = parseItem(item);
    if (result === null) return null;
    parsed.push(result);
  }
  return parsed;
}

function parseNullable<T>(
  value: unknown,
  parser: (input: unknown) => T | null,
): T | null | undefined {
  if (value === null) return null;
  return parser(value) ?? undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseNonNegativeInteger(value: unknown): number | null {
  return Number.isInteger(value) && typeof value === "number" && value >= 0
    ? value
    : null;
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value > 0;
}

function isNullableInteger(value: unknown): value is number | null {
  return (
    value === null || (typeof value === "number" && Number.isInteger(value))
  );
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isScalarValue(value: unknown): value is string | number | null {
  return (
    value === null ||
    typeof value === "string" ||
    (typeof value === "number" && Number.isInteger(value))
  );
}
