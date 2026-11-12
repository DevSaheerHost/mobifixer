#!/usr/bin/env node
/**
 * Tests for the over-the-air release decision.
 *
 * Two things have to be true at once, and they are easy to get wrong in
 * opposite directions:
 *
 *   - a change to the Mobifixer app DOES reach the shops running the APK,
 *     which until now it never did: the manifest URL was relative, so the app
 *     asked its own bundle for its own update and got a 404 forever; and
 *
 *   - a change to one of the OTHER apps in this repo does NOT prompt a shop
 *     to restart Mobifixer. cashbook, accessories, ordertraker and invoice
 *     all ship inside the payload but none of them is reachable from this
 *     app, so an update notice for one of them is a lie.
 *
 *   node scripts/test-release-web.mjs
 */
import { readFileSync } from 'node:fs';
import {
  releaseDecision, notesFor, isAppPath, APP_PATHS, NOT_APP_PATHS, UPDATE_HOST,
} from './release-web.mjs';
import { apkManifest } from './release-apk.mjs';

let pass = 0, fail = 0;
const ck = (label, cond, got) => {
  if (cond) { pass++; console.log('  ok   ', label); }
  else { fail++; console.log('  FAIL ', label, got === undefined ? '' : `(got ${JSON.stringify(got)})`); }
};

const H1 = 'a'.repeat(64), H2 = 'b'.repeat(64);

// ---------------------------------------------------------------------------
console.log('\nOnly this app triggers an update');
{
  ck('index.html is the app', isAppPath('index.html'));
  ck('main.js is the app', isAppPath('main.js'));
  ck('native.js is the app', isAppPath('native.js'));
  ck('the login screen is the app', isAppPath('auth/main.js'));
  ck('its images are the app', isAppPath('assets/images/icon-512.png'));

  ck('cashbook is NOT', !isAppPath('cashbook/main.js'));
  ck('  nor anything under it', !isAppPath('cashbook/assets/icons/x.svg'));
  ck('accessories is NOT', !isAppPath('accessories/index.html'));
  ck('ordertraker is NOT', !isAppPath('ordertraker/index.html'));
  ck('invoice is NOT', !isAppPath('invoice/index.html'));

  ck('the two lists do not overlap',
    !NOT_APP_PATHS.some(n => APP_PATHS.includes(n)));
  ck('a path outside both lists is not the app', !isAppPath('push-worker/worker.js'));
  ck('backslashes do not smuggle a path past the check', !isAppPath('cashbook\\main.js'));
}

// ---------------------------------------------------------------------------
console.log('\nWhen it releases, and when it refuses');
{
  const first = releaseDecision({ currentVersion: '5.1.0', currentHash: H1 });
  ck('the very first run releases', first.release === true, first);
  ck('  and says why', first.reason === 'first-release', first.reason);

  const same = releaseDecision({
    publishedVersion: '5.1.0', publishedHash: H1,
    currentVersion: '5.1.0', currentHash: H1,
  });
  ck('an unchanged app does not release', same.release === false, same);
  ck('  and says why', same.reason === 'no-app-changes', same.reason);

  // The one the whole thing is for: cashbook moved, the app did not, so the
  // app hash is identical and no shop is asked to restart.
  const other = releaseDecision({
    publishedVersion: '5.1.0', publishedHash: H1,
    currentVersion: '5.1.0', currentHash: H1,
  });
  ck('a change to another app in the repo does not release', other.release === false, other);

  const noBump = releaseDecision({
    publishedVersion: '5.1.0', publishedHash: H1,
    currentVersion: '5.1.0', currentHash: H2,
  });
  ck('the app changed but the version did not: refuses', noBump.release === false, noBump);
  ck('  and says why', noBump.reason === 'version-not-bumped', noBump.reason);

  const bumped = releaseDecision({
    publishedVersion: '5.1.0', publishedHash: H1,
    currentVersion: '5.1.1', currentHash: H2,
  });
  ck('changed and bumped: releases', bumped.release === true, bumped);
  ck('  and says why', bumped.reason === 'app-changed', bumped.reason);

  const back = releaseDecision({
    publishedVersion: '5.2.0', publishedHash: H1,
    currentVersion: '5.1.0', currentHash: H2,
  });
  ck('never publishes a version older than the live one', back.release === false, back);

  ck('no version at all refuses', releaseDecision({ currentHash: H1 }).release === false);
  ck('no arguments refuses', releaseDecision().release === false);
}

// ---------------------------------------------------------------------------
console.log('\nWhat is new comes from the CHANGELOG');
{
  const cl = [
    '# Changelog', '', '## [5.1.1] - 2026-01-02', '### Added',
    '- Reminders now ask permission', '- Faster search', '', '---', '',
    '## [5.1.0] - 2025-12-01', '- Older release', '',
  ].join('\n');

  const n = notesFor(cl, '5.1.1');
  ck('finds the section for the version', n.includes('Reminders now ask permission'), n);
  ck('  and stops at the next one', !n.includes('Older release'), n);
  ck('  and drops the --- rules', !n.includes('---'), n);
  ck('an older version still resolves', notesFor(cl, '5.1.0').includes('Older release'));
  ck('a version with no entry gives empty, not a crash', notesFor(cl, '9.9.9') === '');
  ck('an empty changelog gives empty', notesFor('', '5.1.1') === '');
  ck('a dot in the version is not a wildcard', notesFor(cl, '5X1X1') === '');
}

// ---------------------------------------------------------------------------
// The URL was the actual bug: relative meant the app asked its own bundle.
console.log('\nThe app asks the website, not itself');
{
  const native = readFileSync('native.js', 'utf8');
  ck('the update host is absolute', /UPDATE_HOST\s*=\s*['"`]https:\/\//.test(native));
  ck('the web manifest is built from it', /WEB_MANIFEST\s*=\s*[`'"].*\$\{UPDATE_HOST\}/.test(native));
  ck('the apk manifest too', /APK_MANIFEST\s*=\s*[`'"].*\$\{UPDATE_HOST\}/.test(native));
  ck('no relative manifest is left behind', !/MANIFEST\s*=\s*['"`]\.\//.test(native));
  ck('the release script agrees on the host', native.includes(UPDATE_HOST));

  ck('the notice names the version', /title:\s*`Update ready\$\{/.test(native));
  ck('the notice can show the notes', /notes/.test(native) && /checkWebUpdate/.test(native));
  ck('checkWebUpdate returns the notes', /notes:\s*manifest\.notes/.test(native));
}

// ---------------------------------------------------------------------------
// The sibling apps are out of the payload entirely now, which makes the
// "only this app triggers an update" rule true by construction rather than
// only by the hash. Both still matter: the hash is what stops a payload
// change from prompting a restart, and this is what stops 7MB of unreachable
// files being carried and re-downloaded in the first place.
console.log('\nThe other apps are not in the payload');
{
  const build = readFileSync('scripts/build-www.mjs', 'utf8');
  const dirs = (build.match(/const DIRS = \[([\s\S]*?)\]/) || [])[1] || '';
  for (const d of ['cashbook', 'accessories', 'ordertraker', 'invoice']) {
    ck(`${d} is not copied into the payload`, !dirs.includes(`'${d}'`), dirs.trim());
  }
  ck('the login screen still is', dirs.includes("'auth'"));
  ck('its images still are', dirs.includes("'assets'"));

  for (const d of ['cashbook', 'accessories', 'ordertraker', 'invoice']) {
    ck(`  and ${d} is listed as deliberate, not forgotten`,
      new RegExp(`'${d}':\\s*'a separate app`).test(build));
  }

  // updates/ is written at the repo root by this very script. build-www.mjs
  // fails on any top-level entry it has not been told about, so leaving it
  // unlisted breaks the next build after the first release.
  ck('updates/ is classified, so a published release does not break the build',
    /'updates':/.test(build));
}

// ---------------------------------------------------------------------------
// The APK half. The web updater replaces HTML and JavaScript; this one is for
// the rarer change the native side needs, and it points at a GitHub Release
// asset rather than Vercel - a permanent public URL that needs no login.
console.log('\nThe APK manifest');
{
  const m = apkManifest({ version: '5.1.1', repo: 'DevSaheerHost/mobifixer', notes: ' hi \n' });
  ck('names the version', m.version === '5.1.1', m);
  ck('points at the release asset', m.url ===
    'https://github.com/DevSaheerHost/mobifixer/releases/download/v5.1.1/mobifixer-5.1.1.apk', m.url);
  ck('  the tag carries the v, the file does not', /\/v5\.1\.1\/mobifixer-5\.1\.1\.apk$/.test(m.url), m.url);
  ck('trims the notes', m.notes === 'hi', m.notes);
  ck('stamps a build time', !Number.isNaN(Date.parse(m.builtAt)), m.builtAt);

  let threw = false;
  try { apkManifest({ repo: 'a/b' }); } catch { threw = true; }
  ck('refuses without a version', threw);
  threw = false;
  try { apkManifest({ version: '1.0.0', repo: 'nope' }); } catch { threw = true; }
  ck('refuses a repo that is not owner/name', threw);

  // checkApkUpdate compares against App.getInfo().version, which is the APK's
  // versionName. If that stayed hardcoded at 1.0 while the manifest said
  // 5.1.0, every install would be told it was out of date forever, however
  // many times it downloaded the same file.
  const gradle = readFileSync('android/app/build.gradle', 'utf8');
  ck('the APK takes its versionName from package.json',
    /versionName\s+appVersionName/.test(gradle));
  ck('  and its versionCode is derived from the same place',
    /versionCode\s+appVersionCode/.test(gradle));
  ck('  nothing is hardcoded any more', !/versionName\s+"1\.0"/.test(gradle));
  ck('  a minor or patch over 99 is rejected rather than wrapping',
    /vMinor > 99 \|\| vPatch > 99/.test(gradle));
}

console.log('\nThe release workflow');
{
  const wf = readFileSync('.github/workflows/release.yml', 'utf8');
  ck('it is driven by a tag, not every push', /tags:\s*\['v\*'\]/.test(wf));
  ck('it refuses to run without the signing secrets', /Missing repository secrets/.test(wf));
  ck('it checks the tag matches package.json', /tag v\$tag but package.json/.test(wf));
  ck('it verifies the APK is signed before publishing',
    /apksigner verify/.test(wf) && /grep -q '\^Verifies\$'/.test(wf));
  ck('  and fails if it is not', /signature does not verify/.test(wf));
  ck('it checks the built versionName is the one being released',
    /APK versionName \$name but releasing/.test(wf));
  ck('the keystore is removed whatever happens', /if: always\(\)[\s\S]{0,120}rm -f/.test(wf));
  ck('the keystore is written outside the workspace', /RUNNER_TEMP\/release\.jks/.test(wf));
  ck('no secret is ever echoed', !/echo .*secrets\./.test(wf));
}

// ---------------------------------------------------------------------------
// Play Protect blocked the install: "Harmful app blocked". The app declared
// REQUEST_INSTALL_PACKAGES so it could install the new APK itself, and on a
// sideloaded APK whose signing key has no history that is what gets blocked.
// The app now opens the download in the browser instead, so the browser is
// the installer and this permission is not needed.
console.log('\nThe app does not install APKs any more');
{
  const native = readFileSync('native.js', 'utf8');
  const manifest = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');

  ck('the manifest does not declare REQUEST_INSTALL_PACKAGES',
    !/<uses-permission[^>]*REQUEST_INSTALL_PACKAGES/.test(manifest));
  ck('  and says why, so it is not added back by reflex',
    /Deliberately NOT declared: REQUEST_INSTALL_PACKAGES/.test(manifest));

  ck('nothing downloads the APK in-app any more', !/Filesystem/.test(native));
  ck('  and nothing hands it to the installer', !/FileOpener/.test(native));
  ck('SELF_INSTALL is gone', !/SELF_INSTALL/.test(native));
  ck('  replaced by a flag a Play build can turn off', /export const APK_UPDATES/.test(native));

  ck('the update is offered as a notification', /kind: 'apk-update'/.test(native));
  ck('  carrying the download url', /url: manifest\.url/.test(native));
  ck('  and tapping it opens the browser',
    /extra\.kind === 'apk-update'[\s\S]{0,120}openUrl\(extra\.url\)/.test(native));
  ck('openUrl opens externally, not in the app', /window\.open\(url, '_blank'\)/.test(native));

  // It existed but nothing ever called it, so a new APK was never mentioned.
  ck('checkApkUpdate is actually called at start-up',
    /initNative[\s\S]*checkApkUpdate\(\)/.test(native));
  ck('  and is not awaited, so a slow server cannot hold up the job list',
    /\n  checkApkUpdate\(\);/.test(native));

  ck('it still falls back to an in-app notice without permission',
    /told-in-app/.test(native));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
