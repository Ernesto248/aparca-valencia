import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--coral)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[var(--petrol)] text-white hover:bg-[var(--petrol-strong)]",
        secondary: "bg-white text-[var(--petrol)] shadow-sm ring-1 ring-black/10 hover:bg-slate-50",
        coral: "bg-[var(--coral)] text-white hover:bg-[var(--coral-strong)]",
        ghost: "text-[var(--petrol)] hover:bg-[var(--petrol)]/8"
      },
      size: {
        default: "h-11 px-4",
        sm: "h-9 px-3",
        icon: "size-11"
      }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
