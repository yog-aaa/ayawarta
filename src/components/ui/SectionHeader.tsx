import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SectionHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string | ReactNode;
  align?: "center" | "left";
  titleClassName?: string;
  subtitleClassName?: string;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  align = "center",
  titleClassName,
  subtitleClassName,
  className,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "mb-12 lg:mb-16",
        align === "center" ? "text-center" : "text-left",
        className
      )}
      {...props}
    >
      <h2
        className={cn(
          "text-3xl font-extrabold text-gray-800 lg:text-4xl",
          titleClassName
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={cn(
            "mt-4 text-lg text-gray-500",
            align === "center" ? "mx-auto max-w-2xl" : "max-w-2xl",
            subtitleClassName
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default SectionHeader;

