import * as React from "react";
import { cn } from "./utils";

const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select">
>(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-slate-900 shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "[color-scheme:light] [&>option]:bg-white [&>option]:text-slate-900 [&>optgroup]:bg-white [&>optgroup]:text-slate-900",
        "dark:bg-slate-950 dark:text-slate-100 dark:[color-scheme:dark] dark:[&>option]:bg-slate-950 dark:[&>option]:text-slate-100 dark:[&>optgroup]:bg-slate-950 dark:[&>optgroup]:text-slate-100",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});

NativeSelect.displayName = "NativeSelect";

export { NativeSelect };
