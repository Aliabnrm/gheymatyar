import type { AuthContext } from "@/services/auth";

export const AUTH_ACCOUNT_FIXTURE = {
  user: {
    id: "10d13828-338a-4fc9-8b21-7fe4724935df",
    email: "owner@example.com",
  },
  organization: {
    id: "6c01201c-dbec-4b43-a2e8-f876923441fc",
    name: "شرکت نمونه",
  },
  membership: { role: "OWNER" },
} satisfies AuthContext;
