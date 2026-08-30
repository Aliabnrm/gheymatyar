import type { AuthContext } from "@/services/auth";

export const ORGANIZATION_ROLE_LABELS: Record<
  AuthContext["membership"]["role"],
  string
> = {
  OWNER: "مالک",
  OPERATOR: "اپراتور",
};
