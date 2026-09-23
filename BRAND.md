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

The shipped design system is **Precision Light**: light-first, airy, and
restrained. A light theme is the default; a dark theme is available through
the header toggle and persists per device (stored choice wins, otherwise
light). The design language is Stripe/Linear-grade refinement: generous
whitespace, flat surfaces, hairline borders, and quiet blue accents — no
glassmorphism, no aurora washes, no glow effects.

Design tokens live in `src/styles/global.css` (site chrome, 19 tokens per
mode) and `src/styles/tool-system.css` (tool pages, `--tool-*` tokens).
Legacy tool colors are mapped into those tokens at build time, so every tool
inherits the same theme.

Dark-mode rules, agreed with the owner: the dark variant uses a refined blue
accent (`#78a6ff`) and contains no red, rose, or crimson anywhere. The mode
toggle swaps only colors — typography, spacing, radii, border widths, and
shadow geometry are pixel-identical between modes (the shared card shadow is
`0 22px 50px` in both). Do not introduce per-mode geometry changes.

Iconography is a single thin-line SVG set (`src/lib/icons.js`): 24px grid,
1.5px stroke, round caps, `currentColor`. Use it for all UI chrome — tool
tiles, privacy panels, buttons, step visuals. Never use emoji as interface
icons. Privacy should feel quiet and trustworthy, not like a cybersecurity
dashboard: the lock mark appears once per context, in accent blue, next to
plain-language copy.

Type is `"Avenir Next", "Segoe UI"` and system fallbacks, with `IBM Plex Mono`
reserved for micro-labels (eyebrow, status pill, section labels). The hero
headline sets the tone: `clamp(44px, 5.1vw, 70px)`, weight 600, tight
tracking. The "Why" trust section is a dark band (`--why-bg`) in both modes —
a deliberate inversion, not a theming bug.

Every tool page shares one header and footer composition with the homepage:
the brand lockup carries the `C` brand mark in the header, and a single
canonical footer (promise, footer nav, version, copyright) replaces each
legacy tool's own header/footer at build time (`src/lib/legacy-tools.js`
strips them; `src/components/ToolShell.astro` renders the shared chrome).
Tool-specific footer notes a tool carried (e.g. passport-photo's "No
generative face editing") are preserved in the canonical footer. Never
reintroduce per-tool header/footer markup.

## Product test

Prioritize a new tool when it solves a common task involving files people may reasonably consider private, can perform the work on-device, and fits naturally into a future private document workflow.

## Future workflow direction

Atomic tools should gradually connect into useful workflows such as:

Photo or scan → straighten → clean → remove metadata → make PDF → compress → download

The long-term product idea is not merely a catalog of converters. It is a private document workstation that stays on the user's device.
