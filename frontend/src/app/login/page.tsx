import type { Metadata } from "next";

import {
  AuthFeedback,
  AuthPageShell,
  LoginForm,
  PublicAuthGate,
} from "@/features/auth";

export const metadata: Metadata = { title: "ورود | قیمت‌یار" };

const loginNotices = {
  "session-expired": "نشست شما معتبر نیست یا منقضی شده است. دوباره وارد شوید.",
  "logged-out": "با موفقیت از نشست جاری خارج شدید.",
} as const;

interface LoginPageProps {
  searchParams: Promise<{ reason?: string | string[] }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const reason = (await searchParams).reason;
  const notice =
    typeof reason === "string" && reason in loginNotices
      ? loginNotices[reason as keyof typeof loginNotices]
      : null;

  return (
    <PublicAuthGate>
      <AuthPageShell
        title="ورود به قیمت‌یار"
        description="برای مشاهده فضای کاری و مقایسه فایل‌های سازمان خود وارد شوید."
        alternateText="هنوز حساب پایلوت ندارید؟"
        alternateHref="/register"
        alternateLabel="ثبت‌نام اولیه"
      >
        {notice ? (
          <AuthFeedback message={notice} tone="info" className="mb-5" />
        ) : null}
        <LoginForm />
      </AuthPageShell>
    </PublicAuthGate>
  );
}
