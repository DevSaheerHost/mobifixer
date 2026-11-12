#!/usr/bin/env node
/**
 * Assemble www/ — the web payload that ships inside the APK, and the same
 * payload the over-the-air updater downloads.
 *
 * This repo IS the website: index.html and main.js sit at the root next to
 * scripts/, firebase/ and push-worker/. So the APK cannot just ship the repo;
 * it would carry the test suite, the proposed security rules and the Cloudflare
 * worker's source to every shop's phone. This copies the shipping files and
 * nothing else, by an ALLOW list rather than a deny list: a file added to the
 * repo later is left out until someone adds it here, which is the safe way
 * round for a directory that holds credentials-adjacent material.
 *
 *   node scripts/build-www.mjs            assemble www/
 *   node scripts/build-www.mjs --check    say what would be copied, write nothing
 *
 * Two things are rewritten on the way in, and only for the native build:
 *   - the app records which build it is, so the updater can compare versions
 *   - nothing else; the source files are the ones the website serves, byte for
 *     byte, so a bug in the APK is reproducible by opening the website.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, statSync, readdirSync }
  from 'node:fs';
import { join, dirname, relative } from 'node:path';

const root = process.cwd();
const out = join(root, 'www');
const checkOnly = process.argv.includes('--check');

// Everything the app serves. Directories are copied whole.
const FILES = [
  'index.html',
  'manifest.json',
  'main.js',
  'style.css',
  'm3.css',
  'sw.js',
  'cardLayout.js',
  'jobMeta.js',
  'pattern.js',
  'generateWhatsappLink.js',
  'searchCard.js',
  'searchPouchCard.js',
  'inventoryCard.js',
  'data.js',
  'native.js',
  'nativeLogic.js',
  'icon-192.jpg',
  'mixkit.wav',
  'update.mp3',
  'disconnect.mp3',
  'CHANGELOG.md',            // the changelog page fetches this at runtime
  'Error 404.json',
  'Loading Animation.json',
];

const DIRS = [
  'assets',
  'auth',
];

// Copied as part of a directory above, then dropped again. Paths are relative
// to the repo root. Each one has to earn its place on a shop's phone.
//
// Empty since the sibling apps left the payload: the two entries here were
// both inside cashbook/, which is no longer copied at all. Kept because the
// next directory that ships a folder no shop needs belongs here.
const PRUNE = {};

// Named so the next reader knows the omissions are deliberate, not oversights.
const DELIBERATELY_OMITTED = {
  'scripts': 'the test suite; no shop needs it and it is 300KB',
  'firebase': 'proposed security rules and the security audit',
  'push-worker': 'the Cloudflare worker source',
  '.github': 'CI configuration',
  'vercel.json': 'host configuration for a host this does not use',
  'README.md': 'repository documentation',
  'node_modules': 'build-time only',
  'android': 'the native project that wraps this payload',
  'updates': 'the over-the-air bundle this script\'s output is zipped into; '
    + 'shipping it inside itself would nest a copy of the app in every release',

  // The other apps in this repo. They were in the payload and nothing in
  // Mobifixer could reach any of them: accessories is linked by an absolute
  // github.io URL, which opens the website, and the rest are not linked at
  // all. Together they were 7.1MB of a 9.4MB payload - carried in the APK,
  // and downloaded again by every shop on every over-the-air update, for
  // files the app has no route to. They stay on the website, where they are
  // reached directly.
  'cashbook': 'a separate app; reached on the website, never from inside this one',
  'accessories': 'a separate app; the two buttons that open it use an absolute '
    + 'URL, so they load the website copy whether or not it ships here',
  'ordertraker': 'a separate app; nothing in this one links to it',
  'invoice': 'a separate app; nothing in this one links to it',
};

const copied = [];
const missing = [];

const sizeOf = (p) => {
  const s = statSync(p);
  if (!s.isDirectory()) return s.size;
  return readdirSync(p).reduce((n, f) => n + sizeOf(join(p, f)), 0);
};

if (!checkOnly) {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
}

for (const f of FILES) {
  const src = join(root, f);
  if (!existsSync(src)) { missing.push(f); continue; }
  if (!checkOnly) {
    mkdirSync(dirname(join(out, f)), { recursive: true });
    cpSync(src, join(out, f));
  }
  copied.push([f, sizeOf(src)]);
}

let pruned = 0;
for (const d of DIRS) {
  const src = join(root, d);
  if (!existsSync(src)) { missing.push(d + '/'); continue; }
  if (!checkOnly) cpSync(src, join(out, d), { recursive: true });
  let size = sizeOf(src);
  for (const p of Object.keys(PRUNE)) {
    if (p !== d && !p.startsWith(d + '/')) continue;
    const full = join(root, p);
    if (!existsSync(full)) continue;
    size -= sizeOf(full);
    pruned += sizeOf(full);
    if (!checkOnly) rmSync(join(out, p), { recursive: true, force: true });
  }
  copied.push([d + '/', size]);
}

// The build stamp. The updater compares the version it has downloaded against
// the one baked in here, so it has to be written, not guessed.
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const stamp = {
  version: pkg.version,
  builtAt: new Date().toISOString(),
};
if (!checkOnly) writeFileSync(join(out, 'build.json'), JSON.stringify(stamp, null, 2) + '\n');

const total = copied.reduce((n, [, s]) => n + s, 0);
const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB';

console.log(`\n${checkOnly ? 'Would copy' : 'Copied'} ${copied.length} entries into www/  (${mb(total)})\n`);
for (const [name, size] of copied.sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(Math.round(size / 1024)).padStart(7)} KB  ${name}`);
}

if (missing.length) {
  console.error(`\nMissing, so NOT in the payload:`);
  for (const m of missing) console.error('  ' + m);
}

if (pruned) {
  console.log(`\nPruned back out of the payload  (${mb(pruned)} saved):`);
  for (const [p, why] of Object.entries(PRUNE)) console.log(`  ${p}\n      ${why}`);
}

console.log(`\nDeliberately left out:`);
for (const [name, why] of Object.entries(DELIBERATELY_OMITTED)) {
  console.log(`  ${name.padEnd(20)} ${why}`);
}

// Anything at the top of the repo that is in neither list is a file somebody
// added without deciding. Say so rather than silently shipping or dropping it.
const known = new Set([...FILES, ...DIRS, ...Object.keys(DELIBERATELY_OMITTED),
                       'package.json', 'package-lock.json', '.gitignore', '.git',
                       '.vscode', 'www', 'capacitor.config.json']);
const unclassified = readdirSync(root).filter(f => !known.has(f));
if (unclassified.length) {
  console.error(`\nNot listed either way - decide, then add to FILES, DIRS or`
    + ` DELIBERATELY_OMITTED in this script:`);
  for (const u of unclassified) console.error('  ' + u);
  process.exit(1);
}

if (missing.length) process.exit(1);
console.log(`\nwww/ is ready.\n`);
