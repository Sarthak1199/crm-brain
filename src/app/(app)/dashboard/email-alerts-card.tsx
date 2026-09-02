"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Mail, X, Loader2, Plus, Send, Check, AlertTriangle } from "lucide-react";
import { addEmailAlertRecipient, removeEmailAlertRecipient } from "./email-alerts-actions";
import { MAX_RECIPIENTS } from "./email-alerts-constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from "@/components/ui/popover";

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

type SendState = { status: "idle" } | { status: "sending" } | { status: "done"; message: string; ok: boolean };

function SendNowButton({ recipientCount }: { recipientCount: number }) {
  const [state, setState] = useState<SendState>({ status: "idle" });

  async function send() {
    setState({ status: "sending" });
    try {
      const res = await fetch("/api/admin/send-email-report", { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        setState({ status: "done", ok: false, message: data.error ?? "Send failed." });
        return;
      }
      if (data.skipped) {
        setState({ status: "done", ok: false, message: "No recipients configured." });
        return;
      }
      setState({ status: "done", ok: true, message: `Sent to ${data.recipients} recipient${data.recipients === 1 ? "" : "s"}.` });
    } catch {
      setState({ status: "done", ok: false, message: "Send failed. Please try again." });
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        type="button"
        variant="outline"
        onClick={send}
        disabled={state.status === "sending" || recipientCount === 0}
        className="h-9 w-full gap-1.5 rounded-lg text-[13px]"
      >
        {state.status === "sending" ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
        Send now
      </Button>
      {state.status === "done" ? (
        <p
          className={`flex items-center gap-1 text-[11px] ${state.ok ? "text-positive-foreground" : "text-negative-foreground"}`}
        >
          {state.ok ? <Check className="size-3" /> : <AlertTriangle className="size-3" />}
          {state.message}
        </p>
      ) : null}
    </div>
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
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Email alerts"
        >
          <Mail className="size-4" />
          {recipients.length > 0 ? (
            <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
              {recipients.length}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverHeader>
          <PopoverTitle className="text-[13px]">Email Alerts</PopoverTitle>
          <PopoverDescription className="text-[12px]">
            Full dashboard snapshot — Mon, Wed, Fri at 9:30 AM IST (rolling last 7 days)
          </PopoverDescription>
        </PopoverHeader>

        {recipients.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {recipients.map((r) => (
              <RecipientChip key={r.id} id={r.id} email={r.email} canEdit={canEdit} />
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-muted-foreground">No recipients yet — add one below.</p>
        )}

        {canEdit ? (
          <form ref={formRef} action={formAction} className="flex items-start gap-2">
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

        <p className="text-[11px] text-muted-foreground/70">
          {recipients.length}/{MAX_RECIPIENTS} recipients
        </p>

        {canEdit ? (
          <div className="border-t border-border pt-2.5">
            <SendNowButton recipientCount={recipients.length} />
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
