import { Logo } from "@/components/logo";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex justify-center">
          <Logo className="scale-110" />
        </div>

        <div className="rounded-xl border border-border bg-card px-7 py-8 shadow-sm">
          <h1 className="text-[20px] font-bold text-foreground">Set a new password</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            This account was created with a temporary password. Set your own before continuing.
          </p>

          <div className="mt-6">
            <ResetPasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}
