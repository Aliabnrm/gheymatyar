import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { PriceListImport } from "@/services/price-list-imports";

export function BlockingImportError({
  error,
}: {
  error: NonNullable<PriceListImport["blockingError"]>;
}) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertTitle>استخراج فایل کامل نشد</AlertTitle>
      <AlertDescription>
        <p>{error.message}</p>
        <p className="text-xs" dir="ltr">
          {error.code}
        </p>
      </AlertDescription>
    </Alert>
  );
}
