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

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
