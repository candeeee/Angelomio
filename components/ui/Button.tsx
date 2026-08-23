import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Rectangular, versalita y sin escalado al click: el rediseño
          // pide botones discretos, no píldoras grandes de marketplace.
          "inline-flex items-center justify-center gap-2 rounded-sm font-medium uppercase tracking-editorial transition-colors duration-300 disabled:opacity-40 disabled:pointer-events-none",
          variant === "primary" && "bg-ink text-cream hover:bg-earth-600",
          variant === "secondary" &&
            "border border-ink/15 text-ink hover:border-ink hover:bg-ink hover:text-cream",
          variant === "ghost" && "text-ink hover:bg-warmgray-100",
          variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
          size === "sm" && "px-4 py-2 text-[10px]",
          size === "md" && "px-6 py-2.5 text-[11px]",
          size === "lg" && "px-8 py-3.5 text-xs",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export default Button;
