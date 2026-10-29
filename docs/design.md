# AyaWarta UI Design Contract

## Intent

The implementation is a structural refactor with targeted quality fixes. The current AyaWarta interface is the approved visual baseline. Agents must preserve its identity rather than reinterpret it.

## Visual Direction

AyaWarta should continue to feel friendly, celebratory, modern, and accessible to Indonesian customers. The landing page uses a clean blue product identity; invitation templates have their own themed visual language.

The memorable elements that must remain recognizable are:

- the AyaWarta blue palette;
- the existing logo and landing artwork;
- text-based AyaWarta hero headline using the established “Undangan Digital, Semudah Bercerita” tagline;
- phone/invitation demonstrations;
- rounded cards and friendly motion;
- the ornamental Classic Rose invitation composition.

## Preserve

- Landing-page section order.
- Existing written content unless a clear typo is fixed.
- Header information architecture and anchor destinations.
- Hero artwork and primary calls to action. The hero ends without a wave or user-count band.
- Feature, pricing, theme, testimonial, and footer concepts.
- Classic Rose frames, backgrounds, flowers, dividers, typography, colors, and section order.
- Existing animation intent: gentle entrances, carousel transitions, and invitation opening.

## Allowed Visual Changes

Small changes are allowed when they clearly improve:

- consistent spacing and alignment;
- responsive overflow or clipping;
- focus visibility and keyboard navigation;
- touch-target size;
- contrast or readability;
- image layout stability;
- reduced-motion behavior;
- consistency between repeated controls.

Agents must explain every material visual change in the stage handoff.

## Disallowed Changes

- New color direction or rebranding.
- Generic purple gradients or unrelated dashboard styling.
- Replacing the landing illustrations.
- Reordering sections without explicit approval.
- Removing animation wholesale instead of respecting reduced-motion preferences.
- Introducing a general-purpose component library that changes the established look.
- Converting the invitation template into the landing-page design system.

## Tailwind CSS 4 Tokens

Semantic CSS-first tokens are implemented in `src/app/globals.css`. Token names describe purpose, not a single component.

Required categories:

- `background`, `foreground`, `surface`, and `muted`;
- brand primary blue and matching foreground;
- border and focus ring;
- success, warning, and destructive states;
- small, medium, large, and pill radii;
- subtle, card, floating, and artwork shadows;
- standard content widths and section spacing;
- fast, normal, and deliberate motion durations;
- standard easing curves.

Classic Rose continues to use theme-specific CSS variables supplied by its theme configuration. Do not force landing tokens onto invitation theme colors.

### Implemented token map

| Group | Current tokens and values | Source |
| --- | --- | --- |
| Brand | `brand-primary` `#0264ff`, hover `#014cc4`, secondary `#0d285b`, accent `#2563eb` | `src/app/globals.css` |
| Surface and text | `background` and `surface` `#ffffff`, `foreground` `#111827`, `muted` `#6b7280`, plus subtle and muted surfaces | `src/app/globals.css` |
| Feedback | `success` `#16a34a`, `warning` `#f59e0b`, `destructive` `#dc2626`, `ring` `#0264ff` | `src/app/globals.css` |
| Shape and depth | `radius-sm` through `radius-3xl`, `radius-pill`; `shadow-subtle`, `shadow-card`, `shadow-floating`, `shadow-brand` | `src/app/globals.css` |
| Layout and timing | Narrow/default widths `48rem`/`80rem`; section spacing `4rem`/`5rem`/`8rem`; durations `150ms`/`300ms`/`600ms` | `src/app/globals.css` |

Landing typography uses Noto Sans Thai by default, with Manrope available through `.font-body-alt`. Classic Rose uses Playfair Display, Alice, and Alex Brush. Font variables are loaded in `src/app/layout.tsx`. The `red`, `green`, `blue`, `orange`, `black`, and `white` Classic Rose variants and their static artwork paths are defined in `src/lib/theme-config/classic-rose.ts`; theme assets remain in `public/images/themes/classic-rose/`.

## Shared Component Criteria

Extract a shared component only when at least one is true:

1. It appears in multiple places with the same behavior.
2. It encodes a required accessibility contract.
3. It centralizes a design-system variant used across sections.

Approved initial primitives:

- `Container`
- `SectionHeader`
- `Button`
- `IconButton`
- invitation framed-image primitive

These are implemented in `src/components/ui/`. `Container` offers `default`, `narrow`, and `fluid` widths and an `as` element override. `SectionHeader` renders a section `h2` with optional subtitle and left/center alignment. `Button` supports `primary`, `secondary`, `outline`, and `ghost` variants, `sm`/`md`/`lg` sizes, and either a native button or a Next.js link through `href`. `IconButton` requires `aria-label`; its default `md` size is 44 by 44 CSS pixels. `FramedImage` supports square, portrait, video, and custom aspect ratios and requires alternative text. Use the shared components where their contract fits; local artwork layouts may still need local markup.

Do not create wrappers that merely rename one HTML element without adding a reusable contract.

## Component API Rules

- Variant props must be finite and typed.
- `className` remains available for local composition.
- Buttons expose correct native button attributes.
- Icon-only buttons require an accessible label.
- Link-styled controls remain semantic links.
- Disabled states prevent interaction and remain visually clear.
- Focus rings must be visible against each background.

## Server and Client Components

- Landing sections that only render content are Server Components.
- Carousel state, navigation observation, Framer Motion, clipboard, audio, and Firestore remain Client Components.
- Move client behavior to the smallest practical child component.
- Do not place `"use client"` on a page solely because one descendant is interactive.

## Motion

- Repeated entrance duration, easing, and reduced-motion variants are centralized in `src/lib/motion.ts`.
- Keep high-impact motion purposeful and avoid adding decorative motion during the refactor.
- Honor `prefers-reduced-motion` for nonessential animation.
- Autoplay carousels must keep manual controls.
- Avoid motion that causes layout shift.

## Responsive Contract

Verify at minimum:

- narrow mobile around 360 px;
- common mobile around 390–430 px;
- tablet around 768 px;
- desktop around 1280 px;
- wide desktop around 1440 px.

No page may produce accidental horizontal scrolling. Artwork-specific overflow must be intentional and clipped by the owning section.

## Accessibility Contract

- Use semantic headings in a logical order.
- Every form control has a visible or accessible label.
- Active navigation uses `aria-current`.
- Decorative images have empty alt text; meaningful images describe their purpose or subject.
- Keyboard focus is never removed without a replacement.
- Interactive targets are at least approximately 44 by 44 CSS pixels on touch layouts when practical.
- Error text is associated with the relevant field.
- Loading and submission states are announced or visibly unambiguous.
- Reduced-motion users receive equivalent functionality.

## Admin Login Design

The login page should feel like part of AyaWarta:

- use brand blue and existing typography;
- use a restrained, polished card rather than a generic admin theme;
- keep the form short and clear;
- show generic authentication failure messages;
- make loading, disabled, error, and focus states explicit;
- remain usable on narrow mobile screens.

The protected admin landing page can be minimal. It exists to prove authentication and provide a future dashboard entry point, not to invent the dashboard now.

## Visual Review Evidence

For any stage touching UI, the programmer must provide:

- routes and viewport widths checked;
- before/after screenshots when tooling permits;
- a list of intentional visual differences;
- keyboard and reduced-motion results;
- confirmation that no new horizontal overflow appears.
