#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const publicRoot = path.join(root, 'public');
const directories = [
  'about', 'assets', 'clean-html-printer', 'clean-pdf-printer', 'compress-pdf', 'docs',
  'document-flattener', 'heic-to-jpg', 'image-to-pdf', 'japa-counter', 'merge-pdf',
  'passport-photo', 'photo-to-scan', 'principles', 'qr-code-maker', 'remove-photo-metadata',
  'resize-image', 'split-pdf'
];
const files = ['CNAME', 'google5f4708aeb39de005.html', 'manifest.webmanifest', 'robots.txt', 'sitemap.xml', 'sw.js', 'VERSION'];

fs.rmSync(publicRoot, { recursive: true, force: true });
fs.mkdirSync(publicRoot, { recursive: true });
for (const directory of directories) fs.cpSync(path.join(root, directory), path.join(publicRoot, directory), { recursive: true });
for (const file of files) fs.copyFileSync(path.join(root, file), path.join(publicRoot, file));
console.log(`Synced ${directories.length} static route directories into public/.`);
