import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

interface BaseButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

export type ButtonAsButton = BaseButtonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

export type ButtonAsLink = BaseButtonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold transition-[background-color,color,border-color,box-shadow,transform] duration-200 focus-ring disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

  const sizeStyles = {
    sm: "px-4 py-2 text-xs rounded-md min-h-[36px]",
    md: "px-6 py-3 text-sm rounded-lg min-h-[44px]",
    lg: "px-8 py-3.5 text-base rounded-xl min-h-[48px]",
  }[size];

  const variantStyles = {
    primary:
      "bg-[linear-gradient(90deg,rgba(2,100,255,1)_0%,rgba(1,76,196,1)_100%)] text-white shadow-[0px_4px_15px_rgba(2,100,255,0.4)] hover:opacity-95 hover:shadow-lg active:scale-[0.98]",
    secondary:
      "bg-white text-gray-800 shadow-[0px_4px_15px_rgba(0,0,0,0.1)] hover:bg-gray-50 hover:shadow-lg active:scale-[0.98]",
    outline:
      "border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 hover:border-gray-400 active:scale-[0.98]",
    ghost:
      "bg-transparent text-gray-700 hover:bg-gray-100 active:scale-[0.98]",
  }[variant];

  const combinedClasses = cn(baseStyles, sizeStyles, variantStyles, className);

  if ("href" in props && typeof props.href === "string") {
    const { href, ...anchorProps } = props as ButtonAsLink;
    return (
      <Link href={href} className={combinedClasses} {...anchorProps}>
        {children}
      </Link>
    );
  }

  const buttonProps = props as ButtonAsButton;
  return (
    <button className={combinedClasses} {...buttonProps}>
      {children}
    </button>
  );
}

export default Button;
