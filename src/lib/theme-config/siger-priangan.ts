export const sigerPrianganTheme = {
  id: "siger-priangan",
  name: "Siger Priangan",
  variants: ["ivory"],
  readingWidth: 760,
  colors: {
    ivory: "#F6F1E8",
    ink: "#243B35",
    gold: "#B58B53",
    blush: "#C8A69A",
  },
} as const;

export function isSigerPrianganVariant(value: string): value is "ivory" {
  return value === sigerPrianganTheme.variants[0];
}
