"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "./utils";

function Switch({
  className,
  id,
  checked,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  const isPlannedField = id === "isPlanned";

  if (isPlannedField) {
    return (
      <>
        <style>{`
          label[for="isPlanned"] {
            display: flex !important;
            width: 100% !important;
            min-height: 0 !important;
            margin-top: 0 !important;
            padding: 0 !important;
            flex-direction: column-reverse !important;
            align-items: stretch !important;
            justify-content: flex-start !important;
            gap: 0.4rem !important;
            line-height: 1.25 !important;
          }

          label[for="isPlanned"] > span:last-child {
            width: 100% !important;
            text-align: right !important;
            font-size: 0.875rem !important;
            color: inherit !important;
          }
        `}</style>

        <SwitchPrimitive.Root
          id={id}
          checked={checked}
          data-slot="switch"
          dir="rtl"
          className={cn(
            "group relative flex h-10 w-full shrink-0 items-center justify-between rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-all duration-200",
            "hover:border-primary/55 hover:bg-muted/20",
            "focus-visible:border-ring focus-visible:ring-ring/35 focus-visible:ring-[3px]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        >
          <span className="pointer-events-none font-medium text-foreground">
            {checked ? "نعم" : "لا"}
          </span>

          <span
            aria-hidden="true"
            className="pointer-events-none flex h-5 w-5 items-center justify-center text-base leading-none text-muted-foreground transition-transform duration-200 group-data-[state=checked]:text-emerald-700"
          >
            ⌄
          </span>
        </SwitchPrimitive.Root>
      </>
    );
  }

  return (
    <SwitchPrimitive.Root
      id={id}
      checked={checked}
      data-slot="switch"
      dir="ltr"
      className={cn(
        "peer relative inline-flex h-8 w-[74px] shrink-0 items-center overflow-hidden rounded-xl border-2 bg-background p-0.5 shadow-[0_5px_14px_rgba(15,23,42,0.10)] transition-all duration-300 outline-none",
        "data-[state=checked]:border-emerald-500/80 data-[state=checked]:bg-emerald-50",
        "data-[state=unchecked]:border-rose-500/80 data-[state=unchecked]:bg-rose-50",
        "focus-visible:ring-ring/35 focus-visible:ring-[4px]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 flex w-[42px] items-center justify-center text-[10px] font-bold tracking-tight transition-all duration-300",
          "peer-data-[state=checked]:text-emerald-700 peer-data-[state=unchecked]:text-rose-700",
        )}
      >
        <span className="peer-data-[state=checked]:hidden">لا</span>
        <span className="hidden peer-data-[state=checked]:inline">نعم</span>
      </span>

      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none relative z-10 flex h-6 w-7 items-center justify-center rounded-lg bg-white shadow-[0_3px_8px_rgba(15,23,42,0.20)] ring-1 ring-black/5 transition-all duration-300 ease-out",
          "before:block before:h-2 before:w-2 before:rounded-full before:transition-colors",
          "data-[state=checked]:translate-x-[40px] data-[state=checked]:before:bg-emerald-500",
          "data-[state=unchecked]:translate-x-0 data-[state=unchecked]:before:bg-rose-500",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
