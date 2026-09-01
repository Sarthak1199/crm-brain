"use client"

import * as React from "react"
import { Toast as ToastPrimitive } from "radix-ui"
import { CheckCircle2, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"

function ToastProvider(props: React.ComponentProps<typeof ToastPrimitive.Provider>) {
  return <ToastPrimitive.Provider swipeDirection="right" {...props} />
}

function ToastViewport({ className, ...props }: React.ComponentProps<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      className={cn(
        "fixed bottom-4 right-4 z-100 flex w-full max-w-sm flex-col gap-2 outline-none",
        className
      )}
      {...props}
    />
  )
}

function ToastRoot({
  className,
  variant = "success",
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Root> & { variant?: "success" | "error" }) {
  return (
    <ToastPrimitive.Root
      className={cn(
        "flex items-start gap-2.5 rounded-lg border bg-popover p-3.5 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/10 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-2 data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[swipe=end]:animate-out",
        variant === "success" ? "border-l-4 border-l-green-500" : "border-l-4 border-l-negative",
        className
      )}
      {...props}
    />
  )
}

/** A single, self-contained success/error toast — no global provider needed; mount where used. */
export function SimpleToast({
  open,
  onOpenChange,
  variant,
  message,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant: "success" | "error"
  message: string
}) {
  return (
    <ToastProvider duration={3500}>
      <ToastRoot open={open} onOpenChange={onOpenChange} variant={variant}>
        {variant === "success" ? (
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" />
        ) : (
          <XCircle className="mt-0.5 size-4 shrink-0 text-negative-foreground" />
        )}
        <ToastPrimitive.Description className="text-[13px] leading-relaxed">{message}</ToastPrimitive.Description>
      </ToastRoot>
      <ToastViewport />
    </ToastProvider>
  )
}
