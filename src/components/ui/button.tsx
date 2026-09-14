import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "matte-control inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium cursor-pointer transition-[transform,color,background-color,border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border border-primary/60 bg-primary/90 text-primary-foreground glow-control hover:bg-primary",
        destructive: "border border-destructive/60 bg-destructive/90 text-destructive-foreground glow-control hover:bg-destructive",
        outline:
          "border border-input bg-card/55 text-foreground glow-control hover:border-primary/60 hover:bg-accent hover:text-accent-foreground",
        secondary: "border border-border bg-secondary/80 text-secondary-foreground glow-control hover:bg-secondary",
        ghost: "border border-transparent hover:border-primary/35 hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-11 px-4 text-xs",
        lg: "h-12 px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
