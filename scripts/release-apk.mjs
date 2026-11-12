#!/usr/bin/env node
/**
 * Write the two files a GitHub Release needs, for the APK half of updating.
 *
 *   NOTES.md           the Release body, taken from CHANGELOG.md
 *   updates/apk.json   what the app polls to find out an APK is waiting
 *
 * The web updater (release-web.mjs) replaces HTML and JavaScript and is the
 * one used for almost every change. This one is for the rarer case where the
 * native side moved - a new plugin, a permission, a Capacitor upgrade - which
 * no amount of new JavaScript can deliver.
 *
 * apk.json names a GitHub Release asset rather than something on Vercel: it
 * is a permanent public URL that needs no login, and an APK is too big to
 * want in this repository on every release. native.js downloads it and hands
 * it to Android's package installer, which asks the user to confirm; nothing
 * installs quietly.
 *
 *   node scripts/release-apk.mjs                 write both
 *   node scripts/release-apk.mjs --check         print, write nothing
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { notesFor } from './release-web.mjs';

/**
 * The manifest native.js checkApkUpdate expects: a version to compare and a
 * url to fetch. Pure, so the tests can check the URL shape without a release.
 */
export const apkManifest = ({ version, repo, notes = '', size = 0, builtAt = null }) => {
  if (!version) throw new Error('apkManifest needs a version');
  if (!repo || !repo.includes('/')) throw new Error(`apkManifest needs owner/name, got ${repo}`);
  const m = {
    version,
    url: `https://github.com/${repo}/releases/download/v${version}/mobifixer-${version}.apk`,
    notes: notes.trim(),
    builtAt: builtAt || new Date().toISOString(),
  };
  // Only when known. The update sheet shows it beside the version, because
  // this is a phone and the shop may be on mobile data; an absent size shows
  // nothing rather than "0 MB".
  if (Number(size) > 0) m.size = Number(size);
  return m;
};

export const FALLBACK_NOTES = 'No CHANGELOG entry for this version.';

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const checkOnly = process.argv.includes('--check');
  const root = process.cwd();

  const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) {
    console.error('GITHUB_REPOSITORY is not set (expected owner/name).');
    process.exit(1);
  }

  const changelog = existsSync(join(root, 'CHANGELOG.md'))
    ? readFileSync(join(root, 'CHANGELOG.md'), 'utf8') : '';
  const notes = notesFor(changelog, version) || FALLBACK_NOTES;

  // The workflow builds mobifixer-<version>.apk beside this script's cwd and
  // then runs it, so the file is normally right here. Measured rather than
  // declared, and simply left out when it is not - a wrong size is worse than
  // no size.
  const apkPath = join(root, `mobifixer-${version}.apk`);
  const size = existsSync(apkPath) ? statSync(apkPath).size : 0;
  if (!size) console.log(`no ${apkPath} to measure; apk.json will carry no size`);

  const manifest = apkManifest({ version, repo, notes, size });

  if (checkOnly) {
    console.log('NOTES.md would be:\n' + notes + '\n');
    console.log('updates/apk.json would be:\n' + JSON.stringify(manifest, null, 2));
    process.exit(0);
  }

  writeFileSync(join(root, 'NOTES.md'), notes + '\n');
  mkdirSync(join(root, 'updates'), { recursive: true });
  writeFileSync(join(root, 'updates/apk.json'), JSON.stringify(manifest, null, 2) + '\n');

  console.log(`wrote NOTES.md (${notes.split('\n').length} lines)`);
  console.log(`wrote updates/apk.json for ${version}`);
  console.log(`  ${manifest.url}`);
}
