#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const outputRoot = path.resolve(__dirname, '..', 'dist');
const nestedRoute = path.join(outputRoot, 'japa-counter', 'tap.html');
const nestedIndex = path.join(nestedRoute, 'index.html');
const finalFile = path.join(outputRoot, 'japa-counter', 'tap.html');

if (fs.existsSync(nestedIndex)) {
  const page = fs.readFileSync(nestedIndex);
  fs.rmSync(nestedRoute, { recursive: true, force: true });
  fs.writeFileSync(finalFile, page);
}
