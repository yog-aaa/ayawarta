# AyaWarta Pricing and Extension Contract

## Current public offer

AyaWarta offers three paid packages for **one event each**, with a single payment rather than a monthly subscription. The AyaWarta team assembles the invitation from details supplied by the customer. All packages use the currently available Classic Rose theme with its six color variants, have no AyaWarta watermark, and do not cap the number of invitation links a customer shares.

| Package | Price per event | Included service and content |
| --- | ---: | --- |
| Kabar | Rp49.000 | Event details, map, countdown, RSVP, wishes, up to 5 photos supplied by the event owner, and 1 content revision. |
| Cerita | Rp99.000 | Everything in Kabar, up to 20 owner photos, 1 embedded video, a story section, background music, digital gift information, and 2 content revisions. |
| Istimewa | Rp149.000 | Everything in Cerita, up to 30 owner photos, writing curation by the AyaWarta team, priority in the production queue, and 3 content revisions. |

The landing page is the current source of truth for these displayed offers (`src/config/landing.ts`). Each call to action leads to the existing contact section. There is no online purchase, automatic provisioning, or customer self-service editor in this stage.

## Planned extensions

These are **not included** in any package and are **not available yet**. Once implemented, either extension should be available for any package. Prices will be decided separately after storage, delivery, moderation, and operations costs are known.

- **Private guest photo gallery:** a guest can take or choose 3–5 photos and upload them through AyaWarta. Only the invitation owner can view the collected guest photos; they do not appear publicly in the invitation.
- **QR check-in:** event attendance check-in through a QR-based flow. Its final workflow and price still need design.

The owner-photo allowance in each package is separate from guest-uploaded photos. Package copy must not imply that guest uploads or QR check-in are live or bundled.

## Future admin panel

The protected admin area currently has authentication foundations, but no pricing editor. A future admin panel should be able to manage package prices, displayed inclusions, revision/photo allowances, theme or content customization options, and each extension's availability and price independently. Public pricing must read from the approved published configuration once that system exists. Any order or agreed quote should retain a snapshot of its selected offer so later admin edits do not silently change an existing customer's terms.

This document records product intent. It does not authorize schema changes, payment integration, checkout, or extension implementation in the current pricing update.
