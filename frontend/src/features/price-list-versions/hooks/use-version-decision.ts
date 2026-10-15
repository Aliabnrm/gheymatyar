"use client";
import { useEffect, useRef, useState } from "react";
import { useContextConfirmation } from "@/components/shared/hooks/use-context-confirmation";
import { ApiRequestError } from "@/core/api/api-error";
import {
  RejectionInputSchema,
  useApprovePriceListVersionMutation,
  useRejectPriceListVersionMutation,
} from "@/services/price-list-versions";
import {
  approvalBlockedReason,
  decisionError,
  type VersionApprovalProps,
} from "../model/version-decision";
export function useVersionDecision({
  supplierId,
  versionId,
  reviewStatus,
  isOwner,
  approvalContext,
  onApprovalConflict,
}: VersionApprovalProps) {
  const approve = useApprovePriceListVersionMutation();
  const reject = useRejectPriceListVersionMutation();
  const { confirmed: approvalConfirmed, setConfirmed: setApprovalConfirmed } =
    useContextConfirmation(approvalContext?.key ?? null);
  const [approvalNote, setApprovalNote] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionConfirmed, setRejectionConfirmed] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const pending = approve.isPending || reject.isPending;

  useEffect(() => {
    if (rejectOpen) reasonRef.current?.focus();
  }, [rejectOpen]);

  const errorMessage = decisionError(approve.error ?? reject.error);
  const approvalBlockedMessage = approvalBlockedReason(approvalContext);
  const canApprove =
    reviewStatus === "READY_FOR_REVIEW" && isOwner && approvalBlockedMessage === null;

  async function approveVersion(): Promise<void> {
    if (!approvalConfirmed || pending || !canApprove || !approvalContext) return;
    setSuccessMessage(null);
    approve.reset();
    reject.reset();
    try {
      await approve.mutateAsync({
        supplierId,
        versionId,
        input: {
          expectedCurrentVersionId: approvalContext.expectedCurrentVersionId,
          confirmApproval: true,
          decisionNote: approvalNote.trim() || null,
        },
      });
      setSuccessMessage("نسخه تأیید شد و به‌عنوان قیمت جاری انتخاب شد.");
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 409) {
        setApprovalConfirmed(false);
        onApprovalConflict();
      }
      // Safe mutation error is rendered below.
    }
  }

  async function rejectVersion(): Promise<void> {
    if (pending || !isOwner || reviewStatus !== "READY_FOR_REVIEW") return;
    const parsed = RejectionInputSchema.safeParse({
      confirmRejection: rejectionConfirmed,
      reason,
    });
    if (!parsed.success) {
      setReasonError(
        rejectionConfirmed
          ? (parsed.error.issues[0]?.message ?? "دلیل رد را وارد کنید.")
          : "تأیید صریح رد نسخه الزامی است.",
      );
      reasonRef.current?.focus();
      return;
    }
    setReasonError(null);
    setSuccessMessage(null);
    approve.reset();
    reject.reset();
    try {
      await reject.mutateAsync({ supplierId, versionId, input: parsed.data });
      setRejectOpen(false);
      setSuccessMessage("نسخه رد شد و قیمت جاری قبلی بدون تغییر باقی ماند.");
    } catch {
      // Safe mutation error is rendered below.
    }
  }

  return {
    approve,
    reject,
    pending,
    errorMessage,
    approvalBlockedMessage,
    canApprove,
    approvalConfirmed,
    setApprovalConfirmed,
    approvalNote,
    setApprovalNote,
    rejectOpen,
    setRejectOpen,
    rejectionConfirmed,
    setRejectionConfirmed,
    reason,
    setReason,
    reasonError,
    setReasonError,
    successMessage,
    reasonRef,
    approveVersion,
    rejectVersion,
  };
}
