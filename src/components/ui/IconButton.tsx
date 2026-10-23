import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type IconButtonVariant = "primary" | "secondary" | "outline" | "ghost";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  children: ReactNode;
  className?: string;
}

export function IconButton({
  "aria-label": ariaLabel,
  variant = "secondary",
  size = "md",
  children,
  className,
  ...props
}: IconButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center rounded-full transition-[background-color,color,border-color,box-shadow,transform] duration-200 focus-ring disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

  const sizeStyles = {
    sm: "h-9 w-9 p-1.5",
    md: "h-11 w-11 p-2.5", // 44x44px touch target
    lg: "h-12 w-12 p-3",
  }[size];

  const variantStyles = {
    primary:
      "bg-brand-primary text-white shadow-brand hover:bg-brand-primary-hover active:scale-95",
    secondary:
      "bg-white/80 text-gray-800 shadow-md hover:bg-white active:scale-95",
    outline:
      "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:scale-95",
    ghost:
      "bg-transparent text-gray-700 hover:bg-gray-100 active:scale-95",
  }[variant];

  return (
    <button
      aria-label={ariaLabel}
      className={cn(baseStyles, sizeStyles, variantStyles, className)}
      {...props}
    >
      {children}
    </button>
  );
}

export default IconButton;

