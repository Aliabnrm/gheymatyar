export const SUPPLIER_API_FIXTURE = {
  id: "590ad124-2742-4727-8bd2-f01c81570f3e",
  name: "تأمین‌کننده نمونه",
  is_active: true,
  created_at: "2026-09-02T10:00:00+00:00",
  updated_at: "2026-09-02T10:00:00+00:00",
} as const;

export const SUPPLIER_FIXTURE = {
  id: SUPPLIER_API_FIXTURE.id,
  name: SUPPLIER_API_FIXTURE.name,
  isActive: true,
  createdAt: SUPPLIER_API_FIXTURE.created_at,
  updatedAt: SUPPLIER_API_FIXTURE.updated_at,
} as const;
