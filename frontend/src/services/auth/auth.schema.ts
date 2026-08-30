import { z } from "zod";

export const OrganizationRoleSchema = z.enum(["OWNER", "OPERATOR"]);

const EmailInputSchema = z
  .string()
  .trim()
  .pipe(z.email({ error: "ایمیل معتبر وارد کنید." }));

export const AuthContextSchema = z
  .object({
    user: z
      .object({
        id: z.uuid(),
        email: z.email(),
      })
      .strict(),
    organization: z
      .object({
        id: z.uuid(),
        name: z.string().trim().min(2).max(120),
      })
      .strict(),
    membership: z
      .object({
        role: OrganizationRoleSchema,
      })
      .strict(),
  })
  .strict();

export const LoginInputSchema = z
  .object({
    email: EmailInputSchema,
    password: z
      .string()
      .min(1, { error: "رمز عبور را وارد کنید." })
      .max(128, { error: "رمز عبور حداکثر ۱۲۸ نویسه است." }),
  })
  .strict();

export const RegisterInputSchema = z
  .object({
    organizationName: z
      .string()
      .trim()
      .min(2, { error: "نام سازمان حداقل ۲ نویسه است." })
      .max(120, { error: "نام سازمان حداکثر ۱۲۰ نویسه است." }),
    email: EmailInputSchema,
    password: z
      .string()
      .min(12, { error: "رمز عبور باید حداقل ۱۲ نویسه باشد." })
      .max(128, { error: "رمز عبور حداکثر ۱۲۸ نویسه است." }),
  })
  .strict();

export type AuthContext = z.infer<typeof AuthContextSchema>;
export type LoginFormInput = z.input<typeof LoginInputSchema>;
export type LoginInput = z.output<typeof LoginInputSchema>;
export type RegisterFormInput = z.input<typeof RegisterInputSchema>;
export type RegisterInput = z.output<typeof RegisterInputSchema>;
