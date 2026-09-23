// Shared thin-line icon set for Clean Local Tools.
//
// Every icon is inline SVG on a 24x24 grid, 1.5px stroke, round caps and
// joins, `fill="none"`, `stroke="currentColor"`. They inherit the text color
// of their context, so dark/light themes just work.
//
// The Astro shell (`src/pages/index.astro`, `src/components/ToolShell.astro`)
// imports these directly. Legacy tool pages are plain static HTML, so they
// carry the same shapes inline in their own markup (see `.ui-icon` in
// `src/styles/global.css` and `src/styles/tool-system.css`). Keep the shapes
// in both places in sync when adding icons.

const S = (inner) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" focusable="false">${inner}</svg>`;

export const ICONS = {
  // ---- privacy / UI metaphors ----
  lock: S(`<rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/>`),
  check: S(`<path d="M5 12.5l4.5 4.5L19 7.5"/>`),
  device: S(`<rect x="4" y="4.5" width="16" height="11.5" rx="2"/><path d="M9.5 20h5M12 16v4"/>`),
  'file-in': S(`<path d="M6 3.5h7.5L18.5 8.5v12h-12.5z"/><path d="M13.5 3.5v5h5"/><path d="M12 11v5.5M9.7 13.3L12 11l2.3 2.3"/>`),
  chip: S(`<rect x="7.5" y="7.5" width="9" height="9" rx="2"/><path d="M10 4.5v3M14 4.5v3M10 16.5v3M14 16.5v3M4.5 10h3M4.5 14h3M16.5 10h3M16.5 14h3"/>`),
  download: S(`<path d="M12 4v10.5M7.5 11L12 15.5 16.5 11"/><path d="M5 19.5h14"/>`),
  bulb: S(`<path d="M9.6 18.5h4.8M10.6 21h2.8"/><path d="M12 3.5a5.5 5.5 0 0 1 3.2 10c-.7.5-1.2 1.1-1.2 2.2h-4c0-1.1-.5-1.7-1.2-2.2A5.5 5.5 0 0 1 12 3.5z"/>`),
  info: S(`<circle cx="12" cy="12" r="8.5"/><path d="M12 11.2v5"/><path d="M12 7.8v.3"/>`),
  sun: S(`<circle cx="12" cy="12" r="4"/><path d="M12 3v1.8M12 19.2V21M3 12h1.8M19.2 12H21M5.6 5.6l1.3 1.3M17.1 17.1l1.3 1.3M18.4 5.6l-1.3 1.3M6.9 17.1l-1.3 1.3"/>`),
  camera: S(`<rect x="3.5" y="7.5" width="17" height="12" rx="2.5"/><circle cx="12" cy="13.5" r="3.4"/><path d="M8.5 7.5l1.3-2.2h4.4L15.5 7.5"/>`),
  file: S(`<path d="M6 3.5h7.5L18.5 8.5v12h-12.5z"/><path d="M13.5 3.5v5h5"/>`),

  // ---- per-tool icons ----
  compress: S(`<path d="M6 3.5h7.5L18.5 8.5v12h-12.5z"/><path d="M13.5 3.5v5h5"/><path d="M9.8 12.2l2.2-2.2 2.2 2.2M9.8 17.8l2.2 2.2 2.2-2.2"/>`),
  merge: S(`<path d="M12 4l8 4-8 4-8-4z"/><path d="M4.7 12.3L12 15.8l7.3-3.5"/><path d="M4.7 16.3L12 19.8l7.3-3.5"/>`),
  scissors: S(`<circle cx="6.5" cy="6.8" r="2.6"/><circle cx="6.5" cy="17.2" r="2.6"/><path d="M8.7 8.6L20 19.5M8.7 15.4L20 4.5"/>`),
  sparkle: S(`<path d="M11 4.5l1.7 4.8 4.8 1.7-4.8 1.7L11 17.5l-1.7-4.8-4.8-1.7 4.8-1.7z"/><path d="M18 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>`),
  code: S(`<path d="M9.5 8.5L6 12l3.5 3.5M14.5 8.5L18 12l-3.5 3.5"/>`),
  convert: S(`<path d="M4 8.5h12.5M12.8 5L16.3 8.5 12.8 12M20 15.5H7.5M11.2 12l-3.5 3.5 3.5 3.5"/>`),
  image: S(`<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M5.5 17.5l4.3-4.3 3 3 2.4-2.4 3.3 3.3"/>`),
  expand: S(`<path d="M9.5 4.5h-5v5M14.5 4.5h5v5M9.5 19.5h-5v-5M14.5 19.5h5v-5"/>`),
  'tag-off': S(`<path d="M4.5 4.5H11l9.5 9.5-6.5 6.5L4.5 11z"/><circle cx="9.5" cy="9.5" r="1.4"/><path d="M4.5 19.5l15-15"/>`),
  perspective: S(`<path d="M7 18.5L8.8 5.5h6.4L17 18.5z"/><circle cx="8.8" cy="5.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="15.2" cy="5.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="7" cy="18.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="17" cy="18.5" r="1.3" fill="currentColor" stroke="none"/>`),
  scan: S(`<path d="M4 8.5V6a2 2 0 0 1 2-2h2.5M15.5 4H18a2 2 0 0 1 2 2v2.5M20 15.5V18a2 2 0 0 1-2 2h-2.5M8.5 20H6a2 2 0 0 1-2-2v-2.5"/><path d="M4.5 12h15"/>`),
  'id-badge': S(`<rect x="5.5" y="4" width="13" height="16" rx="2"/><circle cx="12" cy="10" r="2.4"/><path d="M8.8 15.8c.8-1.7 1.9-2.4 3.2-2.4s2.4.7 3.2 2.4"/>`),
  qr: S(`<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><path d="M13.5 13.5h3v3h-3zM16.5 16.5H20V20h-3.5M13.5 19.5H15"/>`),
  beads: S(`<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="4.5" r="1.1" fill="currentColor" stroke="none"/>`),
  table: S(`<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 10h16M4 14.8h16M10.3 5v14"/>`),
};

const NAMES = Object.keys(ICONS);

/** Decorative inline icon span. Never carries meaning alone; keep text nearby. */
export function uiIcon(name) {
  if (!ICONS[name]) throw new Error(`Unknown icon: ${name}`);
  return `<span class="ui-icon ui-icon--${name}" aria-hidden="true">${ICONS[name]}</span>`;
}

export function iconNames() {
  return NAMES;
}
