"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentAccountQuery } from "@/services/auth";
import {
  useCreateSupplierMutation,
  type SupplierNameInput,
} from "@/services/suppliers";

import { SupplierPageHeader } from "./supplier-page-header";
import { SupplierNameForm } from "../forms/supplier-name-form";

export function CreateSupplierPage() {
  const router = useRouter();
  const account = useCurrentAccountQuery();
  const creation = useCreateSupplierMutation();

  async function create(input: SupplierNameInput): Promise<void> {
    creation.reset();
    try {
      const supplier = await creation.mutateAsync(input);
      router.replace(`/suppliers/${supplier.id}`);
    } catch {
      // Mutation state is rendered and focused by SupplierNameForm.
    }
  }

  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-5 py-10">
      <SupplierPageHeader
        title="تأمین‌کننده جدید"
        description="نام canonical تأمین‌کننده مبنای اتصال importها و نسخه‌های قیمت آینده خواهد بود."
        action={
          <Button asChild variant="outline">
            <Link href="/suppliers">
              <ArrowRight aria-hidden="true" /> بازگشت به فهرست
            </Link>
          </Button>
        }
      />
      {account.data?.membership.role === "OWNER" ? (
        <Card>
          <CardContent className="py-6">
            <SupplierNameForm
              submitLabel="ثبت تأمین‌کننده"
              pendingLabel="در حال ثبت…"
              isPending={creation.isPending}
              error={creation.error}
              onSubmit={create}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            فقط مالک سازمان می‌تواند تأمین‌کننده جدید ثبت کند.
          </CardContent>
        </Card>
      )}
    </main>
  );
}
