#!/usr/bin/env node
/**
 * Publish an over-the-air update of the web payload.
 *
 * The APK carries its own copy of the site in assets/public and serves that
 * forever, so editing the website reaches browser users and nobody else. This
 * writes the two things that close that gap:
 *
 *   updates/web.json              what the app polls: version, url, notes
 *   updates/mobifixer-<ver>.zip   the payload the app downloads
 *
 * Both are committed and served by Vercel from this repo, so the app fetches
 * them from https://mobifixer.vercel.app/updates/.
 *
 * WHAT COUNTS AS A CHANGE. This repo holds several apps. cashbook,
 * accessories, ordertraker and invoice ship inside the payload but are not
 * reachable from the Mobifixer app - accessories is linked by an absolute
 * github.io URL, which opens the website, and the others are not linked at
 * all. A change to any of them is not a change to this app, and must not
 * prompt a shop to restart for an update they cannot see. So the trigger is a
 * hash over APP_PATHS below, not over the whole payload.
 *
 * AND WHAT COUNTS AS A RELEASE. Two conditions, both required:
 *
 *   1. the app's own files changed since the published manifest, and
 *   2. package.json carries a higher version than the published one.
 *
 * The second makes releasing deliberate. The app shows the shop what changed,
 * and that text comes from CHANGELOG.md, which only means something if a
 * human decided this was a version. An app change with no version bump is
 * reported and skipped, not published.
 *
 *   node scripts/release-web.mjs           publish if both conditions hold
 *   node scripts/release-web.mjs --check   say what would happen, write nothing
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync, statSync }
  from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { compareVersions } from '../nativeLogic.js';

export const UPDATE_HOST = 'https://mobifixer.vercel.app';
export const MANIFEST_PATH = 'updates/web.json';

/**
 * The Mobifixer app itself. A change under any of these is a change the shop
 * running the APK would actually see; a change anywhere else is not.
 *
 * Directories are matched by prefix. Keep this in step with the FILES and DIRS
 * lists in build-www.mjs: a new file that belongs to this app and is missing
 * here would ship without ever prompting anyone to restart.
 */
export const APP_PATHS = [
  'index.html', 'main.js', 'style.css', 'sw.js', 'manifest.json',
  'cardLayout.js', 'jobMeta.js', 'pattern.js', 'generateWhatsappLink.js',
  'searchCard.js', 'searchPouchCard.js', 'inventoryCard.js', 'data.js',
  'native.js', 'nativeLogic.js',
  'icon-192.jpg', 'mixkit.wav', 'update.mp3', 'disconnect.mp3',
  'CHANGELOG.md', 'Error 404.json', 'Loading Animation.json',
  'auth/', 'assets/',
];

/** Everything in the payload that is deliberately NOT a reason to update. */
export const NOT_APP_PATHS = ['cashbook/', 'accessories/', 'ordertraker/', 'invoice/'];

export const isAppPath = (rel) => {
  const p = rel.split('\\').join('/');
  return APP_PATHS.some(a => (a.endsWith('/') ? p.startsWith(a) : p === a));
};

/** Every file under dir, as paths relative to it, sorted so the hash is stable. */
const walk = (dir, base = dir) => {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, base));
    else out.push(relative(base, full));
  }
  return out.sort();
};

/**
 * A hash of the app's own files in a built payload.
 *
 * Path and content both go in, so a rename counts as a change. build.json is
 * excluded: it carries a build timestamp, which would make every build look
 * different and defeat the whole point of asking whether anything changed.
 */
export const hashApp = (wwwDir) => {
  const h = createHash('sha256');
  const files = walk(wwwDir).filter(f => isAppPath(f) && f !== 'build.json');
  for (const f of files) {
    h.update(f, 'utf8');
    h.update('\0');
    h.update(readFileSync(join(wwwDir, f)));
    h.update('\0');
  }
  return { hash: h.digest('hex'), count: files.length };
};

/**
 * Release or not, and why. Pure, so the tests can run every branch.
 *
 * @returns { release, reason } - reason is shown in CI and read by the tests
 */
export const releaseDecision = ({
  publishedVersion = null,
  publishedHash = null,
  currentVersion,
  currentHash,
} = {}) => {
  if (!currentVersion) return { release: false, reason: 'no-version' };
  if (!publishedVersion || !publishedHash) {
    return { release: true, reason: 'first-release' };
  }
  if (publishedHash === currentHash) {
    return { release: false, reason: 'no-app-changes' };
  }
  if (compareVersions(currentVersion, publishedVersion) <= 0) {
    return { release: false, reason: 'version-not-bumped' };
  }
  return { release: true, reason: 'app-changed' };
};

/** The CHANGELOG section for a version, as the shop's "what's new". */
export const notesFor = (changelog, version) => {
  const esc = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^##\\s*\\[?${esc}\\]?.*$`, 'm');
  const m = changelog.match(re);
  if (!m) return '';
  const rest = changelog.slice(m.index + m[0].length);
  const next = rest.search(/^#{1,2}\s/m);
  return (next === -1 ? rest : rest.slice(0, next))
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !/^-{3,}$/.test(l))
    .join('\n')
    .trim();
};

// ---------------------------------------------------------------------------
// Running it

const isMain = process.argv[1] && process.argv[1].endsWith('release-web.mjs');
if (isMain) {
  const checkOnly = process.argv.includes('--check');
  const root = process.cwd();
  const www = join(root, 'www');

  if (!existsSync(www)) {
    console.error('www/ is not built. Run: node scripts/build-www.mjs');
    process.exit(1);
  }

  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const { hash, count } = hashApp(www);

  const manifestFile = join(root, MANIFEST_PATH);
  const published = existsSync(manifestFile)
    ? JSON.parse(readFileSync(manifestFile, 'utf8'))
    : null;

  const decision = releaseDecision({
    publishedVersion: published && published.version,
    publishedHash: published && published.appHash,
    currentVersion: pkg.version,
    currentHash: hash,
  });

  console.log(`app files hashed   ${count}`);
  console.log(`payload version    ${pkg.version}`);
  console.log(`published version  ${published ? published.version : '(none yet)'}`);
  console.log(`app hash           ${hash.slice(0, 16)}...`);
  console.log(`published hash     ${published && published.appHash ? published.appHash.slice(0, 16) + '...' : '(none yet)'}`);
  console.log('');

  if (!decision.release) {
    if (decision.reason === 'no-app-changes') {
      console.log('Nothing to release: the Mobifixer app is unchanged.');
      console.log('Changes under cashbook/, accessories/, ordertraker/ or invoice/ do');
      console.log('not prompt a shop to restart, by design.');
    } else if (decision.reason === 'version-not-bumped') {
      console.log(`The app changed, but package.json is still ${pkg.version}, which is not`);
      console.log(`newer than the published ${published.version}. Nothing published.`);
      console.log('Bump the version in package.json and add a CHANGELOG entry for it,');
      console.log('so the shop can be told what changed.');
    } else {
      console.log(`Nothing to release (${decision.reason}).`);
    }
    process.exit(0);
  }

  const version = pkg.version;
  const zipName = `mobifixer-${version}.zip`;
  const changelog = existsSync(join(root, 'CHANGELOG.md'))
    ? readFileSync(join(root, 'CHANGELOG.md'), 'utf8') : '';
  const notes = notesFor(changelog, version);

  const manifest = {
    version,
    url: `${UPDATE_HOST}/updates/${zipName}`,
    appHash: hash,
    notes,
    builtAt: new Date().toISOString(),
  };

  if (checkOnly) {
    console.log(`Would release ${version} (${decision.reason}).`);
    console.log(JSON.stringify(manifest, null, 2));
    process.exit(0);
  }

  const outDir = join(root, 'updates');
  mkdirSync(outDir, { recursive: true });

  // Only the newest bundle is ever downloaded, so older ones are removed
  // rather than left to grow the repository a payload at a time.
  for (const f of readdirSync(outDir)) {
    if (f.endsWith('.zip') && f !== zipName) {
      rmSync(join(outDir, f));
      console.log(`removed old bundle   ${f}`);
    }
  }

  rmSync(join(outDir, zipName), { force: true });
  // Zip the payload's contents, not the www folder itself: the updater
  // unpacks this over the running bundle, so index.html must be at the root.
  execFileSync('zip', ['-r', '-q', '-X', join(outDir, zipName), '.'], { cwd: www });

  writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');

  const kb = (statSync(join(outDir, zipName)).size / 1024 / 1024).toFixed(2);
  console.log(`Released ${version} (${decision.reason}).`);
  console.log(`  ${MANIFEST_PATH}`);
  console.log(`  updates/${zipName}  ${kb} MB`);
  console.log(notes ? `  notes: ${notes.split('\n')[0]}` : '  notes: (no CHANGELOG entry for this version)');
}
