import type { Transition, Variants } from "framer-motion";

export const MOTION_DURATIONS = {
  fast: 0.15,
  normal: 0.3,
  deliberate: 0.6,
  slow: 0.8,
} as const;

export const MOTION_EASINGS = {
  standard: [0.4, 0.0, 0.2, 1] as const,
  easeOut: [0.33, 1, 0.68, 1] as const,
  easeInOut: [0.65, 0, 0.35, 1] as const,
} as const;

export const defaultTransition: Transition = {
  duration: MOTION_DURATIONS.deliberate,
  ease: MOTION_EASINGS.easeOut,
};

export const createFadeInUp = (shouldReduceMotion = false): Variants => ({
  hidden: {
    opacity: 0,
    y: shouldReduceMotion ? 0 : 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: shouldReduceMotion ? 0.01 : MOTION_DURATIONS.deliberate,
      ease: MOTION_EASINGS.easeOut,
    },
  },
});

export const createFadeIn = (shouldReduceMotion = false): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: shouldReduceMotion ? 0.01 : MOTION_DURATIONS.deliberate,
    },
  },
});

export const createStaggerContainer = (
  stagger = 0.2,
  delay = 0.3,
  shouldReduceMotion = false
): Variants => ({
  hidden: { opacity: shouldReduceMotion ? 1 : 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: shouldReduceMotion ? 0 : stagger,
      delayChildren: shouldReduceMotion ? 0 : delay,
    },
  },
});

export const createScaleIn = (shouldReduceMotion = false): Variants => ({
  hidden: {
    opacity: 0,
    scale: shouldReduceMotion ? 1 : 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: shouldReduceMotion ? 0.01 : MOTION_DURATIONS.deliberate,
      ease: MOTION_EASINGS.easeOut,
    },
  },
});

export const createSlideIn = (
  direction: "left" | "right" = "right",
  shouldReduceMotion = false
): Variants => ({
  hidden: {
    opacity: 0,
    x: shouldReduceMotion ? 0 : direction === "right" ? 100 : -100,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: shouldReduceMotion ? 0.01 : MOTION_DURATIONS.slow,
      ease: MOTION_EASINGS.easeOut,
    },
  },
});

