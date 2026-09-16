import fs from 'node:fs';
import path from 'node:path';

export const toolRoutes = [
  'clean-html-printer', 'clean-pdf-printer', 'compress-pdf', 'document-flattener',
  'heic-to-jpg', 'image-to-pdf', 'japa-counter', 'merge-pdf', 'passport-photo',
  'photo-to-scan', 'qr-code-maker', 'remove-photo-metadata', 'resize-image', 'split-pdf'
];

export const astroManagedToolFiles = {
  'japa-counter': ['index.html']
};

const palette = {
  '#ffffff': 'var(--tool-surface)', '#fff': 'var(--tool-surface)', '#f8f9fa': 'var(--tool-bg)',
  '#f5f8ff': 'var(--tool-privacy-bg)', '#f1f3f4': 'var(--tool-soft)', '#e8f0fe': 'var(--tool-privacy-border)',
  '#202124': 'var(--tool-fg)', '#3c4043': 'var(--tool-ink)', '#5f6368': 'var(--tool-muted)',
  '#9aa0a6': 'var(--tool-muted)', '#aab0b6': 'var(--tool-muted)', '#d1d5db': 'var(--tool-fg)', '#111827': 'var(--tool-fg)',
  '#dadce0': 'var(--tool-border)', '#bdc1c6': 'var(--tool-border-strong)', '#e8eaed': 'var(--tool-soft)',
  '#e0e0e0': 'var(--tool-border)', '#eeeeee': 'var(--tool-border)', '#1a73e8': 'var(--tool-accent)',
  '#1967d2': 'var(--tool-accent)', '#1765cc': 'var(--tool-accent)', '#174ea6': 'var(--tool-accent)',
  '#a50e0e': 'var(--tool-danger)', '#c5221f': 'var(--tool-danger)', '#f6aea9': 'var(--tool-danger-soft)',
  '#137333': 'var(--tool-success)', '#ceead6': 'var(--tool-success-soft)', '#b06000': 'var(--tool-warning)',
  '#fdd663': 'var(--tool-warning-soft)', '#f1dfb7': 'var(--tool-warning-soft)', '#fef7e0': 'var(--tool-warning-bg)',
  '#f6fdf8': 'var(--tool-success-bg)', '#fff8f7': 'var(--tool-surface)', '#fffdf5': 'var(--tool-surface)',
  '#fff4f3': 'var(--tool-danger-soft)', '#fffaf0': 'var(--tool-warning-bg)'
};

function tokenizeCss(css) {
  return css
    .replace(/font-family:\s*Arial,Helvetica,sans-serif/gi, 'font-family:var(--tool-font)')
    .replace(/#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/gi, color => palette[color.toLowerCase()] || color);
}

export function loadLegacyTool(route, file = 'index.html') {
  const source = fs.readFileSync(path.resolve(process.cwd(), route, file), 'utf8');
  const rawHead = source.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] || '';
  const rawBody = source.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || '';
  const sourceDir = path.resolve(process.cwd(), route);
  let styles = '';
  const head = rawHead.replace(
    /<style[^>]*>([\s\S]*?)<\/style>|<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
    (tag, inlineCss, href) => {
      if (inlineCss !== undefined) {
        styles += `\n${tokenizeCss(inlineCss)}`;
        return '';
      }
      const pathname = href.split('?')[0];
      if (pathname.endsWith('/assets/site.css') || pathname === 'assets/site.css') return '';
      if (/^(https?:)?\/\//i.test(pathname) || !pathname.endsWith('.css')) return tag;
      const filename = pathname.startsWith('/')
        ? path.resolve(process.cwd(), `.${pathname}`)
        : path.resolve(sourceDir, pathname);
      if (!fs.existsSync(filename)) return tag;
      styles += `\n${tokenizeCss(fs.readFileSync(filename, 'utf8'))}`;
      return '';
    }
  );
  const body = rawBody.replace(/<header\b[\s\S]*?<\/header>/i, '');
  return { head, styles, body };
}
