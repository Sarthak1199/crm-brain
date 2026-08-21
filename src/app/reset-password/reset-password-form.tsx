"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { resetPassword } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-[#0B1220] text-white hover:bg-[#0B1220]/90 h-10"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Setting password...
        </>
      ) : (
        "Set password"
      )}
    </Button>
  );
}

export function ResetPasswordForm() {
  const [errorMessage, formAction] = useActionState(resetPassword, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password" className="text-[13px] font-medium text-foreground">
          New password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          required
          minLength={8}
          autoComplete="new-password"
          className="h-10 rounded-lg"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword" className="text-[13px] font-medium text-foreground">
          Confirm password
        </Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Re-enter password"
          required
          minLength={8}
          autoComplete="new-password"
          className="h-10 rounded-lg"
        />
      </div>

      {errorMessage ? (
        <p className="rounded-lg border border-negative/30 bg-negative/10 px-3 py-2 text-[13px] text-negative-foreground">
          {errorMessage}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
