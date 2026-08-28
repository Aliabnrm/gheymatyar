import { useMemo, useState } from "react";

import { ApiRequestError } from "@/core/api/api-error";
import { useComparePriceListsMutation } from "@/services/price-list-comparison/price-list-comparison.hooks";

import { filterComparisonItems } from "../model/filters";
import type { ComparisonError, ResultFilter } from "../model/types";
import { validateComparisonFiles } from "../validation/files";

const UNKNOWN_ERROR = {
  code: "UNKNOWN_ERROR",
  message: "خطای پیش‌بینی‌نشده‌ای رخ داد. دوباره تلاش کنید.",
} as const;

export function usePriceListComparison() {
  const [oldFile, setOldFileState] = useState<File | null>(null);
  const [newFile, setNewFileState] = useState<File | null>(null);
  const [filter, setFilter] = useState<ResultFilter>("all");
  const [validationError, setValidationError] =
    useState<ComparisonError | null>(null);
  const comparisonMutation = useComparePriceListsMutation();

  const result = comparisonMutation.data ?? null;
  const error = validationError ?? getRequestError(comparisonMutation.error);
  const visibleItems = useMemo(
    () => (result ? filterComparisonItems(result.items, filter) : []),
    [filter, result],
  );

  function updateFile(kind: "old" | "new", file: File | null) {
    if (kind === "old") setOldFileState(file);
    else setNewFileState(file);

    setValidationError(null);
    if (comparisonMutation.isError) comparisonMutation.reset();
  }

  function compare() {
    const validation = validateComparisonFiles(oldFile, newFile);
    if (!validation.valid) {
      setValidationError(validation.error);
      return;
    }

    setValidationError(null);
    setFilter("all");
    comparisonMutation.mutate(validation.files);
  }

  return {
    oldFile,
    newFile,
    filter,
    result,
    error,
    isSubmitting: comparisonMutation.isPending,
    visibleItems,
    setOldFile: (file: File | null) => updateFile("old", file),
    setNewFile: (file: File | null) => updateFile("new", file),
    setFilter,
    compare,
  };
}

function getRequestError(error: unknown): ComparisonError | null {
  if (error === null) return null;

  return error instanceof ApiRequestError
    ? { code: error.code, message: error.message }
    : UNKNOWN_ERROR;
}
