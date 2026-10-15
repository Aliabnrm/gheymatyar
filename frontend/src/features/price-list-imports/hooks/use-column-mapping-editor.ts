"use client";
import { useState } from "react";
import { useContextConfirmation } from "@/components/shared/hooks/use-context-confirmation";
import {
  useRerunImportMutation,
  useSaveMappingTemplateMutation,
} from "@/services/price-list-imports/column-mapping.hooks";
import type {
  MappingReview,
  CanonicalField,
} from "@/services/price-list-imports/column-mapping.schema";
import type { PriceListImportStatus } from "@/services/price-list-imports";
import {
  initialMapping,
  mappingValidation,
  canSaveTemplate,
  updateColumn,
} from "../model/column-mapping";
export function useColumnMappingEditor({
  supplierId,
  importId,
  status,
  review,
}: {
  supplierId: string;
  importId: string;
  status: PriceListImportStatus;
  review: MappingReview;
}) {
  const [mapping, setMapping] = useState(() => initialMapping(review));
  const [sheet, setSheet] = useState(mapping.sheet_name);
  const [header, setHeader] = useState(String(mapping.header_row));
  const [changed, setChanged] = useState(false);
  const rerun = useRerunImportMutation(supplierId, importId);
  const save = useSaveMappingTemplateMutation(supplierId);
  const issues = mappingValidation(mapping);
  const pending = rerun.isPending || save.isPending;
  const selectionChanged = sheet !== mapping.sheet_name || header !== String(mapping.header_row);
  const canSave = canSaveTemplate(review, status, changed || selectionChanged);
  const snapshot = review.inspection;

  const { confirmed, setConfirmed } = useContextConfirmation(
    canSave ? (review.saved_template?.id ?? "first-template") : null,
  );
  function changeColumn(field: CanonicalField, value: string): void {
    setMapping((current) => updateColumn(current, field, value));
    setChanged(true);
  }
  function saveTemplate(): void {
    save.mutate(
      {
        source_import_id: importId,
        expected_template_id: review.saved_template?.id ?? null,
        confirm_replace: confirmed,
      },
      {
        onSuccess: () => setConfirmed(false),
        onError: () => setConfirmed(false),
      },
    );
  }
  return {
    mapping,
    sheet,
    setSheet,
    header,
    setHeader,
    confirmed,
    setConfirmed,
    rerun,
    save,
    issues,
    pending,
    selectionChanged,
    canSave,
    snapshot,
    changeColumn,
    saveTemplate,
  };
}
