import type { Metadata } from "next";

import { AuthPageShell, PublicAuthGate, RegisterForm } from "@/features/auth";

export const metadata: Metadata = { title: "ثبت‌نام | قیمت‌یار" };

export default function RegisterPage() {
  return (
    <PublicAuthGate>
      <AuthPageShell
        title="ساخت حساب پایلوت"
        description="یک حساب مالک و سازمان اولیه در یک فرایند امن ساخته می‌شود."
        alternateText="قبلاً حساب ساخته‌اید؟"
        alternateHref="/login"
        alternateLabel="ورود"
      >
        <RegisterForm />
      </AuthPageShell>
    </PublicAuthGate>
  );
}
