#!/usr/bin/env node
/*
 * Builds the cards from src/ into dist/ (one minified ES module per entry, with a source map).
 * The version comes from package.json and replaces __VERSION__ in the sources.
 *
 *   node scripts/build.mjs [--outdir <dir>]      (npm run build)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const outdir = argv.includes('--outdir') ? path.resolve(argv[argv.indexOf('--outdir') + 1]) : path.join(root, 'dist');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

export const ENTRIES = {
  'house-v5': 'src/v5/index.js',
  'house-wall': 'src/wall/index.js',
};

await esbuild.build({
  absWorkingDir: root,
  entryPoints: Object.fromEntries(Object.entries(ENTRIES).map(([out, src]) => [out, path.join(root, src)])),
  outdir,
  bundle: true,
  format: 'esm',
  // the wall display runs an older Android WebView: keep the output at the syntax level the cards already use
  target: 'es2020',
  minify: true,
  keepNames: true,
  sourcemap: true,
  legalComments: 'none',
  define: { __VERSION__: JSON.stringify(version) },
  logLevel: 'warning',
});
console.log(
  `built ${Object.keys(ENTRIES)
    .map((e) => `${e}.js`)
    .join(', ')} ${version} -> ${path.relative(root, outdir) || '.'}/`,
);
