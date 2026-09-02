"use client";

import { useActionState, useEffect, useRef } from "react";
import { Mail, X, Loader2, Plus } from "lucide-react";
import { addEmailAlertRecipient, removeEmailAlertRecipient } from "./email-alerts-actions";
import { MAX_RECIPIENTS } from "./email-alerts-constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type EmailAlertRecipientRow = { id: string; email: string };

function RecipientChip({ id, email, canEdit }: { id: string; email: string; canEdit: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 py-1 pl-3 pr-1.5 text-[12px] text-foreground">
      {email}
      {canEdit ? (
        <button
          type="button"
          onClick={() => removeEmailAlertRecipient(id)}
          className="flex size-4 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`Remove ${email}`}
        >
          <X className="size-3" />
        </button>
      ) : null}
    </span>
  );
}

export function EmailAlertsCard({
  recipients,
  canEdit,
}: {
  recipients: EmailAlertRecipientRow[];
  canEdit: boolean;
}) {
  const [error, formAction, isPending] = useActionState(addEmailAlertRecipient, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (isPending) wasPending.current = true;
    else if (wasPending.current) {
      wasPending.current = false;
      if (!error) formRef.current?.reset();
    }
  }, [isPending, error]);

  const atLimit = recipients.length >= MAX_RECIPIENTS;

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-none">
      <div className="flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-full bg-muted">
          <Mail className="size-4 text-foreground" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-foreground">Email Alerts</p>
          <p className="text-[12px] text-muted-foreground">
            Full dashboard snapshot — Mon, Wed, Fri at 9:30 AM IST (rolling last 7 days)
          </p>
        </div>
      </div>

      {recipients.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {recipients.map((r) => (
            <RecipientChip key={r.id} id={r.id} email={r.email} canEdit={canEdit} />
          ))}
        </div>
      ) : (
        <p className="mt-4 text-[12px] text-muted-foreground">No recipients yet — add one below.</p>
      )}

      {canEdit ? (
        <form ref={formRef} action={formAction} className="mt-4 flex items-start gap-2">
          <div className="flex-1">
            <Input
              name="email"
              type="email"
              placeholder="name@dotpe.in"
              disabled={atLimit}
              className="h-9 rounded-lg text-[13px]"
            />
            {error ? <p className="mt-1 text-[12px] text-negative-foreground">{error}</p> : null}
          </div>
          <Button
            type="submit"
            disabled={isPending || atLimit}
            className="h-9 gap-1.5 rounded-lg bg-[#0B1220] text-white hover:bg-[#0B1220]/90"
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            Add
          </Button>
        </form>
      ) : null}

      <p className="mt-2 text-[11px] text-muted-foreground/70">
        {recipients.length}/{MAX_RECIPIENTS} recipients
      </p>
    </div>
  );
}
