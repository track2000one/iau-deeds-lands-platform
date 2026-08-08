"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "./utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
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
