import type { HTMLAttributes } from "react";
import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/cn";

interface BaseFramedImageProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  src: ImageProps["src"];
  alt: string;
  priority?: boolean;
  sizes?: string;
  imageClassName?: string;
  aspectRatio?: "square" | "portrait" | "video" | "custom";
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
}

export type FramedImageProps =
  | (BaseFramedImageProps & {
      fill?: true;
      width?: never;
      height?: never;
    })
  | (BaseFramedImageProps & {
      fill: false;
      width: number;
      height: number;
    });

export function FramedImage({
  src,
  alt,
  fill = true,
  width,
  height,
  priority = false,
  sizes,
  imageClassName,
  aspectRatio = "square",
  rounded = "xl",
  className,
  ...props
}: FramedImageProps) {
  const aspectClasses = {
    square: "aspect-square",
    portrait: "aspect-[3/4]",
    video: "aspect-video",
    custom: "",
  }[aspectRatio];

  const roundedClasses = {
    none: "",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    "2xl": "rounded-2xl",
    "3xl": "rounded-3xl",
    full: "rounded-full",
  }[rounded];

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gray-100",
        aspectClasses,
        roundedClasses,
        className
      )}
      {...props}
    >
      <Image
        src={src}
        alt={alt}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        priority={priority}
        sizes={sizes}
        className={cn("object-cover", roundedClasses, imageClassName)}
      />
    </div>
  );
}

export default FramedImage;
