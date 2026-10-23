import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface ContainerProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  size?: "default" | "narrow" | "fluid";
  children: ReactNode;
  className?: string;
}

export function Container({
  as: Component = "div",
  size = "default",
  children,
  className,
  ...props
}: ContainerProps) {
  return (
    <Component
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        size === "default" && "max-w-[var(--content-width-default,80rem)]",
        size === "narrow" && "max-w-[var(--content-width-narrow,48rem)]",
        size === "fluid" && "max-w-[var(--content-width-fluid,100%)]",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export default Container;

