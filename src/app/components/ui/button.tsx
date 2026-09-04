import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const buttonText = (node: React.ReactNode): string => {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(buttonText).join(" ");
  if (React.isValidElement(node)) {
    return buttonText((node.props as { children?: React.ReactNode }).children);
  }
  return "";
};

const semanticActionClass = (children: React.ReactNode) => {
  const label = buttonText(children).replace(/\s+/g, " ").trim();
  if (!label) return "";

  // جميع أزرار الإلغاء والحذف تكون حمراء بنص أبيض في كامل المنصة.
  if (/(?:إلغاء|الغاء|حذف)/.test(label)) {
    return "border-red-600 bg-red-600 text-white hover:border-red-700 hover:bg-red-700 hover:text-white focus-visible:ring-red-500/30 dark:border-red-600 dark:bg-red-600 dark:text-white dark:hover:bg-red-700";
  }

  // جميع أزرار الإنشاء والحفظ وحفظ التعديلات تكون خضراء بنص أبيض في كامل المنصة.
  if (/(?:إنشاء|انشاء|حفظ)/.test(label)) {
    return "border-emerald-600 bg-emerald-600 text-white hover:border-emerald-700 hover:bg-emerald-700 hover:text-white focus-visible:ring-emerald-500/30 dark:border-emerald-600 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-700";
  }

  return "";
};

function Button({
  className,
  variant,
  size,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  const actionClass = semanticActionClass(children);

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }), actionClass)}
      {...props}
    >
      {children}
    </Comp>
  );
}

export { Button, buttonVariants };
