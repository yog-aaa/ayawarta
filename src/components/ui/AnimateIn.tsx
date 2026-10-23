"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { MOTION_DURATIONS, MOTION_EASINGS } from "@/lib/motion";

export interface AnimateInProps {
  children: ReactNode;
  direction?: "up" | "down" | "left" | "right" | "none";
  delay?: number;
  duration?: number;
  className?: string;
  viewportAmount?: number;
}

export function AnimateIn({
  children,
  direction = "up",
  delay = 0,
  duration,
  className,
  viewportAmount = 0.2,
}: AnimateInProps) {
  const shouldReduceMotion = Boolean(useReducedMotion());

  const getOffset = () => {
    if (shouldReduceMotion) return { x: 0, y: 0 };
    switch (direction) {
      case "up":
        return { x: 0, y: 20 };
      case "down":
        return { x: 0, y: -20 };
      case "left":
        return { x: -30, y: 0 };
      case "right":
        return { x: 30, y: 0 };
      case "none":
        return { x: 0, y: 0 };
    }
  };

  const offset = getOffset();

  return (
    <motion.div
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: viewportAmount }}
      transition={{
        duration: shouldReduceMotion
          ? 0.01
          : (duration ?? MOTION_DURATIONS.deliberate),
        delay: shouldReduceMotion ? 0 : delay,
        ease: MOTION_EASINGS.easeOut,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default AnimateIn;

