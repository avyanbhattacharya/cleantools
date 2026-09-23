# Clean Local Tools brand guide

## Positioning

Clean Local Tools is a private, local-first toolkit for everyday files and documents.

We are not trying to win by having the largest number of converters. We win by making useful tools people can trust with personal files.

## Master promise

**Your files never leave your machine.**

This is the primary brand promise and should remain visible across the site.

## Supporting language

Use simple, nontechnical language first:

- **Private by design.**
- **Your files stay with you.**
- **Works on your device.**
- **Nothing is uploaded for processing.**
- **Keep your files to yourself.**
- **No account. No upload for processing.**

When a tool needs third-party code, explain that separately and plainly. Do not weaken or overstate the file-processing claim.

## Brand pillars

### Private

Personal files should not have to be handed to a website just to complete a simple task.

### Local

The work happens on the user's device. Prefer the phrase **works on your device** in user-facing copy. Technical implementation details belong in secondary explanations, not the main promise.

### Offline

Offline is an earned capability, not a blanket claim. Only call a tool **Offline Ready** after it can complete its core job with the network unavailable and that behavior is covered by an automated test.

Long-term proof message:

**Load it. Go offline. Keep working.**

## Homepage story

The homepage should make the difference understandable without technical knowledge:

**Many online file tools**

Choose your file → File is sent away → Result comes back

**Clean Local Tools**

Choose your file → Work happens here → Download your result

## Voice

Calm, factual, useful and confident. Avoid fear-based security language, exaggerated privacy claims, jargon and hype.

Prefer:

> Some files are simply too personal to hand to a random website.

Avoid:

> The world's most secure file platform.

## Visual direction

The shipped design system is dark-first: deep slate surfaces, light text,
restrained sky-blue interactions, glassmorphic cards with soft borders, and
subtle aurora background washes. A light theme is available through the header
toggle and persists per device, but dark is the default and the design
reference — do not flip the default without an explicit brand decision.

Design tokens live in `src/styles/global.css` (site chrome) and
`src/styles/tool-system.css` (tool pages). Legacy tool colors are mapped into
those tokens at build time, so every tool inherits the same theme.

Iconography is a single thin-line SVG set (`src/lib/icons.js`): 24px grid,
1.5px stroke, round caps, `currentColor`. Use it for all UI chrome — tool
tiles, privacy panels, buttons, step visuals. Never use emoji as interface
icons. Privacy should feel quiet and trustworthy, not like a cybersecurity
dashboard: the lock mark appears once per context, in accent blue, next to
plain-language copy.

Type is the system stack with a tight, consistent scale (uppercase kickers
are used sparingly for section labels only). Spacing follows a simple rhythm:
generous hero padding, 5rem sections on desktop, cards with 1.25rem radii and
a 4px lift on hover.

## Product test

Prioritize a new tool when it solves a common task involving files people may reasonably consider private, can perform the work on-device, and fits naturally into a future private document workflow.

## Future workflow direction

Atomic tools should gradually connect into useful workflows such as:

Photo or scan → straighten → clean → remove metadata → make PDF → compress → download

The long-term product idea is not merely a catalog of converters. It is a private document workstation that stays on the user's device.
