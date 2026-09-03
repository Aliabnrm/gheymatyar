import { z } from "zod";

export const SupplierStatusFilterSchema = z.enum(["active", "inactive", "all"]);

export const SupplierSchema = z
  .object({
    id: z.uuid(),
    name: z.string().min(2).max(120),
    is_active: z.boolean(),
    created_at: z.iso.datetime({ offset: true }),
    updated_at: z.iso.datetime({ offset: true }),
  })
  .strict()
  .transform(({ is_active, created_at, updated_at, ...supplier }) => ({
    ...supplier,
    isActive: is_active,
    createdAt: created_at,
    updatedAt: updated_at,
  }));

export const SupplierListSchema = z
  .object({
    items: z.array(SupplierSchema),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive().max(100),
    offset: z.number().int().nonnegative(),
  })
  .strict();

export const SupplierNameInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { error: "نام تأمین‌کننده حداقل ۲ نویسه است." })
      .max(120, { error: "نام تأمین‌کننده حداکثر ۱۲۰ نویسه است." }),
  })
  .strict();

export const UpdateSupplierInputSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((value) => value.name !== undefined || value.isActive !== undefined, {
    error: "حداقل یک تغییر برای تأمین‌کننده وارد کنید.",
  });

export const SupplierListFiltersSchema = z
  .object({
    status: SupplierStatusFilterSchema.default("active"),
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().nonnegative().default(0),
  })
  .strict();

export type Supplier = z.output<typeof SupplierSchema>;
export type SupplierList = z.output<typeof SupplierListSchema>;
export type SupplierNameFormInput = z.input<typeof SupplierNameInputSchema>;
export type SupplierNameInput = z.output<typeof SupplierNameInputSchema>;
export type UpdateSupplierInput = z.output<typeof UpdateSupplierInputSchema>;
export type SupplierListFilters = z.output<typeof SupplierListFiltersSchema>;
export type SupplierStatusFilter = z.output<typeof SupplierStatusFilterSchema>;
