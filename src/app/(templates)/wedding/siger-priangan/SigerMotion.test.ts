import { readFileSync } from "node:fs";
import path from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

const css = postcss.parse(readFileSync(path.join(import.meta.dirname, "siger-priangan.css"), "utf8"));

describe("Siger Priangan decorative motion", () => {
  it("keeps a continuous paper sheet and section folds in the static frame", () => {
    const reading = css.nodes.find((node) => node.type === "rule" && node.selector === ".siger-reading");
    const fold = css.nodes.find((node) => node.type === "rule" && node.selector.includes(".siger-section + .siger-section::before"));
    expect(reading?.type).toBe("rule");
    expect(fold?.type).toBe("rule");
    if (reading?.type === "rule" && fold?.type === "rule") {
      expect(reading.nodes.some((node) => node.type === "decl" && node.prop === "background" && node.value.includes("--siger-paper"))).toBe(true);
      expect(fold.nodes.some((node) => node.type === "decl" && node.prop === "background" && node.value.includes("linear-gradient"))).toBe(true);
      expect(fold.parent?.type).toBe("root");
    }
  });

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
        expect(declaration.parent.selector).not.toMatch(/\b(?:button|input|textarea|address)\b/);
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

  it("does not animate photos, captions, or controls directly within entering paper cards", () => {
    const targets: string[] = [];
    css.walkDecls("animation-name", (declaration) => {
      if (declaration.value.startsWith("siger-") && declaration.parent?.type === "rule") {
        targets.push(declaration.parent.selector);
      }
    });
    const selectors = targets.join(" ");
    expect(selectors).toContain(".siger-scene::before");
    expect(selectors).toContain(".siger-cover-horizon");
    expect(selectors).toContain(".siger-gallery-mat");
    expect(selectors).not.toMatch(/siger-gallery-(?:frame|image)|siger-portrait|figcaption|siger-button/);
  });

  it("gives every major scene a full decorative plane with a short scroll reveal", () => {
    for (const scene of ["opening", "pair", "schedule", "spine", "album", "ending"]) {
      const plane = css.nodes.find((node) => node.type === "rule" && node.selector === `.siger-scene-${scene}::before`);
      expect(plane?.type).toBe("rule");
      if (plane?.type === "rule") {
        expect(plane.nodes.some((node) => node.type === "decl" && (node.prop === "background" || node.prop === "background-image"))).toBe(true);
      }
    }
    const reveal = css.nodes.find((node) => node.type === "atrule" && node.name === "media" && node.params.includes("no-preference"));
    expect(reveal?.type).toBe("atrule");
    if (reveal?.type === "atrule") {
      const ranges: string[] = [];
      reveal.walkDecls("animation-range", (declaration) => { ranges.push(declaration.value); });
      expect(ranges).toContain("entry 0% cover 65%");
      expect(ranges).toContain("entry 0% entry 80%");
      const localCardTimeline: string[] = [];
      reveal.walkDecls("animation-timeline", (declaration) => {
        if (declaration.value === "view(block)" && declaration.parent?.type === "rule") {
          localCardTimeline.push(declaration.parent.selector);
        }
      });
      expect(localCardTimeline.join(" ")).toContain(".siger-event");
      expect(localCardTimeline.join(" ")).toContain(".siger-gallery figure");
    }
  });

  it("gives later chapters distinct continuing paper motion while controls stay still", () => {
    const names = new Set<string>();
    css.walkDecls("animation-name", (declaration) => {
      if (declaration.parent?.type === "rule" && declaration.parent.selector.includes("::after")) names.add(declaration.value);
    });
    for (const name of ["siger-pair-fan", "siger-event-curtain", "siger-story-ribbon", "siger-album-backdrop", "siger-gift-leaf", "siger-reply-leaf"]) {
      expect(names.has(name)).toBe(true);
    }
    const ranges: string[] = [];
    css.walkDecls("animation-range", (declaration) => { ranges.push(declaration.value); });
    expect(ranges).toContain("entry 0% exit 100%");
  });
});
