"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { useTranslation } from "react-i18next";

import { cn } from "./utils";

function Switch({
  className,
  id,
  checked,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const yesLabel = isArabic ? "نعم" : "Yes";
  const noLabel = isArabic ? "لا" : "No";
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
            text-align: ${isArabic ? "right" : "left"} !important;
            font-size: 0.875rem !important;
            color: inherit !important;
          }
        `}</style>

        <SwitchPrimitive.Root
          id={id}
          checked={checked}
          data-slot="switch"
          dir={isArabic ? "rtl" : "ltr"}
          className={cn(
            "group relative flex h-10 w-full shrink-0 items-center justify-between rounded-md border px-3 text-sm font-semibold shadow-sm outline-none transition-all duration-200",
            "data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-50 data-[state=checked]:text-emerald-800",
            "data-[state=unchecked]:border-rose-500 data-[state=unchecked]:bg-rose-50 data-[state=unchecked]:text-rose-800",
            "hover:shadow-md",
            "focus-visible:ring-ring/35 focus-visible:ring-[3px]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        >
          <span className="pointer-events-none flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cn(
                "h-2.5 w-2.5 rounded-full shadow-sm transition-colors duration-200",
                checked ? "bg-emerald-500" : "bg-rose-500",
              )}
            />
            <span>{checked ? yesLabel : noLabel}</span>
          </span>

          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none flex h-5 w-5 items-center justify-center text-base leading-none transition-colors duration-200",
              checked ? "text-emerald-700" : "text-rose-700",
            )}
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
        <span className="peer-data-[state=checked]:hidden">{noLabel}</span>
        <span className="hidden peer-data-[state=checked]:inline">{yesLabel}</span>
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
