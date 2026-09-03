import { Badge } from "@/components/ui/badge";

export function SupplierStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant={isActive ? "secondary" : "outline"}>
      {isActive ? "فعال" : "غیرفعال"}
    </Badge>
  );
}
