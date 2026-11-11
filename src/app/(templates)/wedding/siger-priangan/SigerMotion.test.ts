import { readFileSync } from "node:fs";
import path from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

const css = postcss.parse(readFileSync(path.join(import.meta.dirname, "siger-priangan.css"), "utf8"));

describe("Siger Priangan decorative motion", () => {
  it("keeps scroll effects behind feature detection and a no-preference setting", () => {
    let animatedRules = 0;
    css.walkDecls("animation-name", (declaration) => {
      if (!declaration.value.startsWith("siger-")) return;
      animatedRules += 1;
      const ancestors = [declaration.parent?.parent, declaration.parent?.parent?.parent].map((parent) =>
        parent?.type === "atrule" ? `${parent.name} ${parent.params}` : "",
      );
      expect(ancestors).toContain("media (prefers-reduced-motion: no-preference)");
      expect(ancestors.some((ancestor) => ancestor.includes("animation-timeline: view()") && ancestor.includes("animation-range: entry"))).toBe(true);
      expect(declaration.parent?.type).toBe("rule");
      if (declaration.parent?.type === "rule") {
        expect(declaration.parent.selector).not.toMatch(/\b(?:button|input|textarea|address|h[1-6]|p)\b/);
      }
    });
    expect(animatedRules).toBeGreaterThan(0);
  });

  it("animates only composited transform and opacity properties", () => {
    let keyframes = 0;
    css.walkAtRules("keyframes", (rule) => {
      if (!rule.params.startsWith("siger-")) return;
      keyframes += 1;
      rule.walkDecls((declaration) => {
        expect(["transform", "opacity"]).toContain(declaration.prop);
      });
    });
    expect(keyframes).toBeGreaterThan(0);
  });
});
