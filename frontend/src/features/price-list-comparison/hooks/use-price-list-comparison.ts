import { useEffect, useMemo, useReducer, useRef, useState } from "react";

import { filterComparisonItems } from "../model/filters";
import {
  comparisonRequestReducer,
  getComparisonData,
} from "../model/request-state";
import type { ResultFilter } from "../model/types";
import { ApiRequestError, comparePriceLists } from "../services/price-list-api";
import { validateComparisonFiles } from "../validation/files";

const UNKNOWN_ERROR = {
  code: "UNKNOWN_ERROR",
  message: "خطای پیش‌بینی‌نشده‌ای رخ داد. دوباره تلاش کنید.",
} as const;

export function usePriceListComparison() {
  const [oldFile, setOldFileState] = useState<File | null>(null);
  const [newFile, setNewFileState] = useState<File | null>(null);
  const [filter, setFilter] = useState<ResultFilter>("all");
  const [request, dispatch] = useReducer(comparisonRequestReducer, {
    status: "idle",
  });
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => activeRequest.current?.abort();
  }, []);

  const result = getComparisonData(request);
  const visibleItems = useMemo(
    () => (result ? filterComparisonItems(result.items, filter) : []),
    [filter, result],
  );

  function updateFile(kind: "old" | "new", file: File | null) {
    if (kind === "old") setOldFileState(file);
    else setNewFileState(file);
    dispatch({ type: "error-cleared" });
  }

  async function compare() {
    const validation = validateComparisonFiles(oldFile, newFile);
    if (!validation.valid) {
      dispatch({ type: "validation-failed", error: validation.error });
      return;
    }

    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setFilter("all");
    dispatch({ type: "request-started" });

    try {
      const response = await comparePriceLists(
        validation.files.oldFile,
        validation.files.newFile,
        controller.signal,
      );
      dispatch({ type: "request-succeeded", data: response });
    } catch (error) {
      if (controller.signal.aborted) return;
      dispatch({
        type: "request-failed",
        error:
          error instanceof ApiRequestError
            ? { code: error.code, message: error.message }
            : UNKNOWN_ERROR,
      });
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
      }
    }
  }

  return {
    oldFile,
    newFile,
    filter,
    request,
    result,
    visibleItems,
    setOldFile: (file: File | null) => updateFile("old", file),
    setNewFile: (file: File | null) => updateFile("new", file),
    setFilter,
    compare,
  };
}
