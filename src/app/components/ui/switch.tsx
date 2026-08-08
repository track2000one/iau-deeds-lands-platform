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
        "peer inline-flex h-6 w-11 min-w-11 shrink-0 cursor-pointer items-center rounded-full border border-border/80 bg-muted p-[2px] shadow-inner outline-none transition-all duration-200",
        "data-[state=checked]:border-primary/70 data-[state=checked]:bg-primary",
        "data-[state=unchecked]:bg-muted",
        "hover:data-[state=unchecked]:bg-muted/80 hover:data-[state=checked]:bg-primary/90",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-5 rounded-full border border-border/50 bg-background shadow-sm ring-0 transition-transform duration-200",
          "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
          "dark:data-[state=checked]:bg-primary-foreground",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
