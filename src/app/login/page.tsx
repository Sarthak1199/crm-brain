import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const params = await searchParams;
  const callbackUrlRaw = params?.callbackUrl;
  const callbackUrl = Array.isArray(callbackUrlRaw) ? callbackUrlRaw[0] : callbackUrlRaw;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex justify-center">
          <Logo className="scale-110" />
        </div>

        <div className="rounded-xl border border-border bg-card px-7 py-8 shadow-sm">
          <h1 className="text-[20px] font-bold text-foreground">Welcome back</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Sign in to access the CRM Brain dashboard.
          </p>

          <div className="mt-6">
            <LoginForm callbackUrl={callbackUrl} />
          </div>
        </div>

        <p className="mt-6 text-center text-[12px] text-muted-foreground">
          Internal tool for DotPe CRM sales &amp; onboarding. Access is by invite only.
        </p>
      </div>
    </div>
  );
}
