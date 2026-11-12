# Siger Priangan — in-invitation scroll storyboard

**Status:** living design record, 13 November 2026. The illustrative local preview includes a photo chapter, generated sample photos, and section-level scroll transitions. This does not approve a cultural-authenticity claim, Cloudinary upload, or a production release.

## Section-level motion revision

The owner found the large photo chapter compelling but the remaining sections still felt like cards sliding inside static frames. The approved revision changes the scene composition itself at four points:

1. **Couple:** two full-height paper leaves meet over the paired profiles, then hinge outward as both portraits and names become visible. The leaves are decorative and leave the reading state clear.
2. **Photo to events:** a dark green paper veil continues the photo chapter's color field and lifts to uncover the ivory schedule. The image is not rendered a second time at the seam.
3. **Story:** a pale sheet unfurls from the top while the gold/green timeline draws downward through the ordered chapters.
4. **Gallery:** an album cover with the couple's initials turns on its left hinge before the existing photo shutters reveal individual images.

Each transition is linked to its section's view timeline, so scrolling upward reverses it. No scroll snapping or wheel interception is introduced. The base CSS keeps the leaves out of the way and all content present when scroll timelines are unsupported. Existing reduced-motion rules remain in place; the owner asked to defer additional reduced-motion work for this visual iteration.

## Photo-led revision

The reference's three phones are a promotional layout; the invitation uses one reading column. Its strongest cue is a succession of photographic scenes. The current preview therefore places a dedicated photo chapter between the couple profiles and event schedule. On scroll, two paper leaves separate, a rounded portrait aperture expands to a full photo, the image drifts more slowly than the frame, and the couple's names settle over a contrast gradient. The dark green chapter continues into the event section. Each gallery mat also turns away a paper shutter to reveal its photo as it enters; the underlying image crop stays still. Reverse scrolling reverses these sequences. Without scroll-timeline support or with reduced motion, the full image and caption remain visible.

The sample uses five lightweight, generated WebP files from fictional adults (total approximately 218 KiB); see [sample media provenance](siger-priangan-sample-media.md). Customer invitations use their own first gallery image when the gallery is enabled, otherwise their hero photo. The chapter is omitted if both are empty, and the gallery keeps its explicit missing-photo placeholder. The chapter never transmits customer media or uploads anything to Cloudinary.

## Reading the reference

The local `C:\Users\yogaa\Downloads\contoh undangan digital.mp4` is a 30-second, 720 × 1280, 30 fps **promotional montage**. It shows three phone mockups on an orange sales background. The useful reference is the *middle phone's changing invitation composition*, not its phone shells, brand, price badge, copy, photography, or art.

| Approximate video moment | Transferable observation | Siger Priangan interpretation |
| --- | --- | --- |
| 0–5 s | A portrait-led opening gives way to individual profiles, with a visibly different light paper field. | Cover opens into a complete hero; the single portrait mat visually resolves into two profile mats. |
| 6–14 s | A dark interlude and strong white paper cut change pace before the event/date panels. | Use ink-green **peripheral** depth briefly behind an ivory event insert. Keep dates, address, and map link on high-contrast paper. |
| 16–22 s | Story chapters and gallery use alternating image scale and offset panels. | An original diamond-marked timeline leads into two slightly offset album mats. Owner photos and captions stay undistorted. |
| 24–29 s | Utility content and guest responses end the sequence. | Gift and RSVP become a calm reply leaf; the closing seal echoes the cover. No artificial completion animation. |

The reference contains visual content and ceremonial wording that must not be reused. The Siger sample retains neutral, owner-editable event labels and no built-in religious greeting or prayer.

## Art grammar and scene rules

- **Base plane:** selectable HTML names, dates, addresses, captions, account numbers, and controls sit on warm ivory `#F6F1E8` / paper `#FFFAF2`, with ink green `#243B35` for reading text. The first hero heading enters during the one-time opening; later chapter headings sweep into place as their sections arrive. Headings, gift/account details, and RSVP controls remain stationary during reading. Profile, event, story, and gallery **cards** may move briefly as whole units on viewport entry, then settle before guests read or interact with them.
- **Depth plane 1:** a cotton-paper edge or mat creates a physical leaf. Its transform stays local to the section and never changes document flow.
- **Depth plane 2:** an original, sparse diagonal/diamond rhythm and tiny botanical relief live in peripheral gutters. Gold `#B58B53` catches light; it is never small body text. These cues are visual hypotheses informed by the approved board, not copied Batik Garutan or a literal siger.
- **Optional depth plane 3:** a seal, portrait mat, or album mat where that object helps explain the transition. Do not animate all three planes throughout every section.
- **Interaction:** a closed full-screen cover is the only scrollable content after hydration. **Buka Undangan** triggers one deliberate 1.7-second paper-leaf opening, then releases the continuous document with ordinary scrolling. During that opening the inner document is inert. Reduced-motion visitors move to the open document immediately. The server-rendered anchor still reaches the hero if JavaScript does not run. No fixed phone frame, full-page carousel, scroll snapping, pinned sequence, or scroll-jacking inside the invitation.
- **Static first:** each scene has a complete final layout before motion CSS runs. If a section is omitted, neighboring scenes meet through a neutral paper edge without a blank beat.

### Six distinct visual silhouettes

The current implementation already moves a contour, portrait frame, event lip, and gallery mat by small amounts. Merely increasing those motions will not create the experience the owner described. Each scene needs a different **static composition** before entry/exit motion is added:

| Scene | Mobile silhouette without motion | Desktop use of side space |
| --- | --- | --- |
| Cover/hero | Portrait and names remain central; the lower third contains a visible multi-plane cut-paper horizon, with restrained foliage at the outer corners. | The cover remains a keepsake sheet; the horizon can widen behind it and fade into the surrounding canvas. |
| Couple | A two-person portrait tableau: paired mats share a common baseline and an airy center, with a recessed landscape/paper plane behind and a small foreground edge at the sides. | Two profiles can sit side by side while the ornamental planes extend beyond, but do not cover, the reading column. |
| Events | A clearly different ink-green recessed **chapter** surrounds the ivory schedule insert. The date/location information is the bright focal object. | The green recess becomes a broad side field around one or two ivory inserts, not a dark backdrop behind small text. |
| Story | A long fine spine with original open diamonds, large quiet paper space, and flexible chapter text. | The spine can sit off-center, leaving an editorial margin; paragraphs remain in one ordered reading flow. |
| Gallery | A lead album mat feels physically larger than two secondary mats. A paper corner/foreground leaf overlaps only empty mat edges. | A 2-column editorial composition uses the spare width for mats and captions, never stretched photos. |
| Reply/closing | Gift and RSVP settle onto a plain reply leaf; the final seal and returning paper horizon close the visual loop. | The reply stays narrow for legibility; the closing gains surrounding air instead of larger form controls. |

Two new, original lightweight SVGs are available for local preview: [`paper-horizon.svg`](../../public/themes/siger-priangan/scenes/paper-horizon.svg) (cut-paper atmosphere for cover/hero, not a literal place) and [`diamond-margin.svg`](../../public/themes/siger-priangan/scenes/diamond-margin.svg) (sparse geometry for side gutters). They are CSS-background/decorative-layer candidates, not content images or culturally authenticated motifs. Keep them beneath or outside text, portraits, dates, and controls.

### Motion intensity revision after live-preview feedback

The owner found the first scroll transitions visually flat. The revised CSS gives each scene a major 190–260 px decorative plane and stronger movement within its section; it does not append empty tall spacers. The planes stay clipped to their sections and behind text/control safe areas. Motion follows local section progress on downward and reverse scrolling, with a brief entry and a settled reading state. No scroll capture is used.

| Scene | Major moving layers, mobile entry → center → exit | Content behavior |
| --- | --- | --- |
| Cover/hero | Rear paper horizon y `+80 → 0 → −55 px`; foreground corner foliage y `−50 → 0 → +35 px`; cover lip can turn up to 6°. | Portrait, names, date, addressee, open link, and hero copy. |
| Couple | Broad rear paper fan y `+70 → 0 → −45 px`; paired translucent side leaves x `±55 → 0 → ∓35 px`. | Each complete profile card may enter from y `+24–28 px` at opacity `.88`, then remain fixed. Greeting/prayer remains stationary. |
| Events | Ink-green recess is the stable scene ground; a large ivory shutter/edge y `+70 → 0 → −45 px` changes the silhouette around the schedule inserts. | Each complete event card may enter from y `+24–32 px` at opacity `.88`, then remain fixed; section heading stays put. |
| Story | Wide outer paper ribbon y `+60 → 0 → −40 px`; a second peripheral diagonal band may drift about 35 px in the opposite direction. | Each chapter card may enter from y `+18–24 px` at opacity `.88`, then remain fixed; timeline order is unchanged. |
| Gallery | Album backing y `+80 → 0 → −55 px`; foreground corner leaf y `−50 → 0 → +35 px`. | Each photo/placeholder figure may enter from y `+24–32 px` at opacity `.88`, then remain fixed with the original image crop and caption. |
| Reply/closing | Reply leaf edge travels about 50 px as the gallery ends; closing horizon y `+70 → 0 → −30 px`, with the *outer* seal ring scaling about `.94 → 1 → 1.03`. | Gift details, RSVP/wishes form and feedback, thank-you text. |

The large travel values above apply to **decoration**. The latest stronger-motion pass starts profile cards 55 px below and 82 px to either side, event/story cards 75 px below, and gallery figures 80 px below at `.9` scale. Their own `view(block)` timelines settle at `entry 80%`, so they are fully readable before reaching the reading zone. The partial card opacity is confined to viewport entry; cards do not bob during reading or exit. If a large plane needs a transform, put the SVG/CSS background on that plane rather than on an unmoving `.siger-scene` parent. Foreground and rear planes move at distinct speeds so depth remains visible; changing opacity on a 1 px line alone is insufficient.

## Scene-by-scene storyboard

### 1. Cover → inner hero: open the keepsake

**Static frame.** The cover shows real couple names, date, addressee when available, portrait, and the open link. The inner hero starts with the same couple identity and a small seal. No decorative art crosses the portrait or link.

**Layers.** (1) Rear cut-paper horizon with two depth planes, (2) outer cover sheet and abstract embossed contour above the portrait, (3) small foreground foliage/diamond edge and inner hero seal. The contour is a provisional original stationery line, never presented as an exact ceremonial headpiece. The horizon must give the blank-photo preview an intentional scene rather than an empty circle on parchment.

**Opening choreography.** The cover is the complete first frame. On the open action, four paper leaves fan behind it, the cover turns away, the horizon and relief recede, and the first ivory chapter enters with staggered seal, identity, date, and scenery. The opening lasts 1.7 seconds and releases the document at its settled first chapter; the guest never has to scroll through a second cover. Scroll-linked chapter motion then follows ordinary forward and reverse scrolling.

**Implementation hook.** Existing `.siger-cover-paper`, `.siger-cover-relief`, `.siger-hero .siger-seal`; `paper-horizon.svg` can sit in an `aria-hidden` lower scene plane. Use pseudo-elements or a decorative wrapper, and keep the `#siger-content` link and semantic reading order intact.

### 2. Hero → couple: one portrait becomes two stories

**Static frame.** The hero's names/date lead to two equal profile leaves with owner photos, parent names if supplied, and optional social links. Optional greeting/prayer appears only when present.

**Layers.** (1) Recessed paper/landscape shape wide enough to read as a scene, (2) two portrait mats aligned as a tableau, (3) a foreground paper edge or diamond/diagonal margin plane at the far sides. On a no-photo preview, the mats remain neutral and the tableau still looks composed.

**Scroll choreography.** As the couple section enters, a broad rear paper fan travels about 70 px vertically while two foreground vellum leaves cross by about 55 px horizontally on mobile. Each whole profile card, including its portrait and copy, may rise 24–28 px from opacity `.88` to its final position during a short entry range and then stay still. Greeting/prayer text remains stationary. A broad paper-edge overlap connects the hero to the tableau. This is spatial continuity, not a simulated photo reveal.

**Implementation hook.** `.siger-couple-section`, `.siger-profiles`, `.siger-profile`, `.siger-profile .siger-portrait`. Transform the card as one unit during entry; do not separately distort or parallax its photo crop.

### 3. Couple → events: a readable itinerary insert

**Static frame.** One or several event inserts show the event name, full date/time, place, address, and map action in that order. The illustrative first label remains `Upacara Pernikahan`; all labels are owner-editable.

**Layers.** (1) A full-width ink-green recessed chapter field, (2) bright ivory event insert surfaces, (3) original gold/ivory diagonal geometry in the outer recess. The green field must be visibly large enough to change the page rhythm; the reading text remains on ivory. The chapter heading may sit on green only if its color and contrast are explicitly adjusted.

**Scroll choreography.** The green recess remains the chapter ground while a substantial ivory shutter advances about 70 px from below on mobile, then recedes upward as the chapter exits. Each complete ivory event card may rise 24–32 px from opacity `.88` during its own short entry, then settle with date/time, venue, address, and map link stable for reading. A marginal gold diamond can cross the green/ivory boundary. The departing decorative lower rule leads into the next scene's timeline spine.

**Implementation hook.** `.siger-events-section`, `.siger-event`, `.siger-event-heading`, `.siger-event-schedule`, `.siger-event::after`. Add the dark recess as a CSS pseudo-element or `aria-hidden` layer behind the insert; transform the event card only during its entry and leave it settled thereafter.

### 4. Events → story: follow the line

**Static frame.** A vertical timeline gives each chapter a diamond marker, number, title, and flexible paragraph. One chapter still reads as a complete story; longer text expands normally.

**Layers.** (1) Paper ground, (2) hairline timeline, (3) small original diamond marker. No photo or decorative symbol is required for every chapter.

**Scroll choreography.** The event's closing rule aligns visually with the story spine. A broad, pale paper ribbon at the outer margin travels about 60 px through the scene, while a second peripheral diagonal band can drift about 35 px oppositely. Each complete story chapter may rise 18–24 px from opacity `.88` during entry, then stay anchored on the timeline. Its heading and paragraph remain fully legible once in the reading zone.

**Implementation hook.** `.siger-story-section`, `.siger-stories`, `.siger-story`, `.siger-story::before`. Preserve DOM order and avoid a CSS masonry reading order.

### 5. Story → gallery: open the album

**Static frame.** The timeline ends at a paper corner; the gallery has one lead mat and smaller accompanying mats. Owner photos retain their aspect-ratio-safe crop and optional HTML captions. The illustrative preview now uses clearly labeled generated imagery of a fictional couple; actual missing media still uses a neutral paper placeholder.

**Layers.** (1) Recessed album backing, (2) one clearly dominant lead photo mat, (3) one secondary mat and a foreground corner fold that touches only mat edges. Existing portrait/gallery media is content, not an animated texture. The no-photo preview uses original paper geometry rather than imitation photography.

**Scroll choreography.** The rear album backing arrives from about 80 px below on mobile, settles, and departs about 55 px upward; the foreground corner fold travels in the opposite direction by about 50 then 35 px. Each complete gallery figure may rise 24–32 px from opacity `.88` during its own short entry, then stay still. The last story marker leads into the lead album corner. Do not scale or rotate actual images within their frames; keep face-safe crops and captions intact.

**Implementation hook.** `.siger-gallery-section`, `.siger-gallery figure`, `.siger-gallery-frame`, `.siger-gallery-placeholder`. Keep image loading lazy below the initial viewport.

### 6. Gallery → reply leaf → closing: let the guest answer

**Static frame.** Gifts, when present, read as a compact optional note. The RSVP/wishes form and its loading, success, error, and preview states remain plain, high-contrast, and fully operable. The closing thanks guests and repeats the couple identity with a small seal.

**Layers.** (1) Calm ivory reply leaf, (2) a fine paper edge outside the form, (3) closing seal/rule. Keep the decorative layer away from account numbers, input fields, feedback, and buttons.

**Scroll choreography.** The gallery's decorative backing recedes while a quieter reply edge advances about 50 px; form and account details stay fixed. At the end, a returning pale horizon travels about 70 px into the closing scene while the seal's **outer ring** settles independently. No animation conceals the thank-you or asserts that RSVP succeeded. The final frame remains visible at rest.

**Implementation hook.** `.siger-gifts`, `.siger-gift`, `.siger-wishes`, `.siger-wishes-form`, `.siger-wish-list`, `.siger-closing`, `.siger-closing .siger-seal`.

## Responsive and motion fallback

| View | Composition and motion |
| --- | --- |
| 360–430 px | One invitation column. Keep 20–24 px text/control safe margins. Decorative diamonds and paper edges stay in the side gutter or clipped to their section. Profile, event, gallery, gift, and reply leaves stack in DOM order. Major scene-plane offsets can reach 50–80 px within their clipped stage; small line accents move less. Never cover content or create horizontal overflow. |
| ~768 px | Preserve the same reading sequence; pair short profile/event leaves only if each retains a comfortable text width. Avoid ornamental side fields that steal the reading measure. |
| 1280–1440 px | Reading sheet remains approximately 640–760 px. Peripheral paper and diagonal/diamond accents can expand into the side fields, while the inner content does not stretch across the viewport. Pair profile/event leaves; keep story in a single ordered timeline. |

**Reduced motion and unsupported scroll timelines:** render the fully settled static frames, with every section and control immediately visible. Do not require an animation to expose content. The current CSS already gates scroll animations behind `prefers-reduced-motion: no-preference` and `@supports`; its base styles should remain the final frame. A simple color/focus response may remain for interaction, with no transform-based decorative motion.

**Motion gate:** this is a rare first-time invitation experience; the motion's purposes are *spatial consistency* between leaves and *delight* at the cover. Chapter headings enter once, then stop. The RSVP inputs, account copy control, and keyboard focus do not receive decorative movement. The complete RSVP panel can enter as one paper unit and then stays still while guests interact. Map links inside event cards move only with the whole card's brief entry and are stationary in the reading zone. Use CSS scroll-linked `transform`/`opacity` on isolated decoration and entry panels where supported. Keep normal scrolling interruptible in both directions; if the guest scrolls quickly or reverses, every scene should still resolve coherently.

## Mobile performance and review limits

1. At most two or three separately composited decorative layers per visible scene, plus only the entering card when applicable. Do not apply `will-change` to the entire document or all sections; release offscreen work.
2. Prefer CSS/SVG for the small original diamond and paper geometry. Use approved cropped raster only when material texture adds value, at its actual rendered size; lazy-load gallery and below-fold decoration. The existing concept PNGs are source studies, not automatically approved runtime assets.
3. Animate `transform` and `opacity`, not layout dimensions, scroll position, image crop, or large blur/shadow filters. Preserve readable contrast and focus indicators through every scroll position.
4. Test normal and rapid reverse scrolling at 360, 390, 430, 768, 1280, and 1440 px; keyboard entry, long names/story/address, empty optional sections, real owner images, and `prefers-reduced-motion`. On a midrange phone or throttled browser, inspect frame smoothness and image/network payload before considering the scene complete.

## Current implementation gap and cultural review

The current `SigerPrianganView.tsx` has the cover and semantic section order. `siger-priangan.css` has distinct scene planes, an opening cover, viewport-entry card motion, and the full-photo interlude in addition to paper seams, relief, gallery mats, and closing seal. The generated sample photography illustrates the intended tempo; it is not a customer photo or a culturally verified costume reference. Inputs, account numbers, and controls stay on a stable reading plane.

The [approved visual board](siger-priangan-board.md) cites official documentation for Sunda siger bridal context and Garutan diagonal/diamond/flora direction. It does not establish that any generated contour is a correct ceremonial siger, that a diamond carries a specific symbolic meaning, or that an artisan pattern may be copied. A Priangan bridal and Garutan textile practitioner should review the complete designed experience before any authenticity claim or publication.
