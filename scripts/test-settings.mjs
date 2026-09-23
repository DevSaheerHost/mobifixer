#!/usr/bin/env node
/**
 * Regression tests for Settings and its sub-pages.
 *
 * What was wrong, and what these pin:
 *
 *  1. Seven of eighteen rows did nothing at all - no link, no handler, no id -
 *     while showing a chevron that implied they went somewhere. Two more
 *     pointed at #settings/shop and #settings/password, which are not routes,
 *     so they landed on the 404 page.
 *  2. The Shop Details row nested an <a> inside another <a>, so the parser split
 *     them and WHERE you tapped decided whether you got the right page or the
 *     404. Six <a> elements were also direct children of <ul>, which is invalid.
 *  3. The profile card shipped the developer's own name and email as its default
 *     text, replaced only by an async read that returns early when the owner
 *     node is missing.
 *  4. A 90KB circuit-board photo sat behind all four pages under a black wash.
 *
 *   node scripts/test-settings.mjs
 */
import { readFileSync } from 'node:fs';

const at = (src, needle, what, offset = 0) => {
  const hay = offset ? src.slice(offset) : src;
  const i = needle instanceof RegExp ? hay.search(needle) : hay.indexOf(needle);
  if (i < 0) throw new Error(`could not find ${what} (${needle}) - renamed?`);
  return i + offset;
};
// The end marker is searched for AFTER the start, not from the top of the file.
// Looking from 0 finds an earlier match and slices backwards into an empty
// string, which then "passes" every test run against it.
const region = (src, from, to, what) => {
  const a = at(src, from, what + ' start');
  return src.slice(a, at(src, to, what + ' end', a + 1));
};
const noComments = (html) => html.replace(/<!--[\s\S]*?-->/g, '');

const html = readFileSync('index.html', 'utf8');
const main = readFileSync('main.js', 'utf8');
const css  = readFileSync('style.css', 'utf8');

const settings = noComments(region(html, '<main class="settings_page', '<!-- ########## PROFILE_PAGE', 'the settings page'));
const profile  = noComments(region(html, '<main class="profile_page', '<main class="bacup_restore_page', 'the profile page'));

let pass = 0, fail = 0;
const ck = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  ok    ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '   ' + extra : '')); }
};

// Every route the app knows about.
const routeBlock = region(main, 'const routes = {', '};', 'the routes table');
const ROUTES = new Set([...routeBlock.matchAll(/['"]([^'"]*)['"]\s*:/g)].map(m => m[1]));

console.log('\nEvery row goes somewhere');
{
  const rows = settings.match(/<li class="list-item">[\s\S]*?<\/li>/g) || [];
  ck('eleven rows, down from eighteen', rows.length === 11, String(rows.length));

  const inert = rows.filter(r => !/class="row"[^>]*href=/.test(r) && !/class="row[^"]*"[^>]*id=/.test(r));
  ck('none of them is inert', inert.length === 0,
     inert.map(r => (r.match(/list-item-title">([^<]*)/) || [])[1]).join(', '));

  const hrefs = [...settings.matchAll(/class="row" href="(#[^"]*)"/g)].map(m => m[1]);
  ck('every link has a route', hrefs.every(h => ROUTES.has(h)),
     hrefs.filter(h => !ROUTES.has(h)).join(', ') || 'all resolve');
  ck('and there are eight of them', hrefs.length === 8, String(hrefs.length));

  // These two were the 404s.
  ck('#settings/shop is gone', !settings.includes('#settings/shop'));
  ck('#settings/password is gone', !settings.includes('#settings/password'));
  ck('Shop details points at the page that exists', settings.includes('href="#shop-details"'));

  for (const dead of ['Language', 'Default Home Page', 'Printer Settings',
                      'Spare Parts Threshold', 'Auto Sync', 'Report a Bug', 'Privacy Policy'])
    ck(`the dead "${dead}" row is gone`, !settings.includes(dead));

  const ids = [...settings.matchAll(/class="row[^"]*" type="button" id="([^"]+)"/g)].map(m => m[1]);
  ck('every button id has a handler in main.js',
     ids.length === 3 && ids.every(id => main.includes(`$('#${id}')`)), ids.join(', '));
}

console.log('\nThe markup is valid');
{
  for (const [name, page] of [['settings', settings], ['profile', profile]]) {
    ck(`${name}: no <a> is a direct child of a <ul>`,
       !/<ul[^>]*>\s*<a[\s>]/.test(page) && !/<\/li>\s*<a[\s>]/.test(page));
    ck(`${name}: no anchor is nested inside another`,
       !/<a [^>]*>(?:(?!<\/a>)[\s\S])*?<a /.test(page));
  }
  ck('the broken Shop Details tags are gone',
     !html.includes('<p class="list-item-title"></p>Shop Details</p>'));
  ck('every row carries exactly one .row',
     (settings.match(/<li class="list-item">[\s\S]*?<\/li>/g) || [])
       .every(r => (r.match(/class="row/g) || []).length === 1));
}

console.log('\nNobody else\'s details ship as defaults');
{
  for (const [name, page] of [['settings', settings], ['profile', profile]]) {
    ck(`${name}: no hardcoded personal name`, !/SAHEER BABU/i.test(page));
    ck(`${name}: no hardcoded email`, !/sheerbabu549/i.test(page));
  }
  ck('the fields start as muted placeholders', /class="name value-unset"/.test(settings));
  const setter = region(main, 'const setProfileField = ', '\n};', 'setProfileField');
  ck('one helper fills both pages', /\['\.settings_page', '\.profile_page'\]/.test(setter));
  ck('and drops the placeholder styling with the text',
     /classList\.toggle\('value-unset', !text\)/.test(setter), setter.slice(0, 80));
  ck('"(null)" is never shown to a shop owner', !main.includes("|| '(null)'"));
  ck('the placeholder staff rows are gone', !/\(DEVELOPER\)|\(DESIGNER\)/.test(profile));
  ck('an empty staff list says so rather than showing nothing',
     main.includes('Nobody else has signed in to this shop yet'));
  ck('staff names are escaped', /const esc = /.test(region(main, 'const staffList', 'getStaff()', 'getStaff')));
}

console.log('\nChange password reaches the reset flow');
{
  const handler = region(main, "$('#changePasswordBtn')", '};', 'the change-password handler');
  ck('it sends a Firebase reset email', /sendPasswordResetEmail\(auth, email\)/.test(handler));
  ck('imported from firebase-auth', /import \{[^}]*sendPasswordResetEmail[^}]*\} from "https:\/\/www\.gstatic\.com\/firebasejs/.test(main));
  ck('to the address on the shop record', /shops\/\$\{shopName\}\/owner\/email/.test(handler));
  ck('it asks first', /confirm\(/.test(handler));
  ck('the address is masked in what it shows', /\*\*\*@/.test(handler));
  // Email Enumeration Protection resolves the call either way, so a definite
  // "sent" would be a claim we cannot make.
  ck('and the confirmation stays conditional', /If an account exists for/.test(handler));
  ck('a shop with no email on record is told, not left guessing',
     /No email on record/.test(handler));
}

console.log('\nThe photo background is gone');
{
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');
  ck('no rule references bg.jpeg', !rules.includes('bg.jpeg'));
  ck('removed at source, so it is never fetched', !/background-image:[^;]*bg\.jpeg/.test(css));
  ck('the four pages use the app background',
     /\.settings_page,\s*\n\.profile_page,\s*\n\.theme_page,\s*\n\.sound_page \{[^}]*background:\s*var\(--bg-color\)/.test(css));
}

console.log('\nThe dead light-mode toggle is gone');
{
  // It animated and wrote theme=light to localStorage, but .light-mode has no
  // rules anywhere, so nothing changed.
  ck('.light-mode still has no rules', !css.replace(/\/\*[\s\S]*?\*\//g, '').includes('light-mode'));
  ck('and the toggle that claimed to set it is off the profile page',
     !/name="theme"/.test(profile));
}

console.log('\nThe row styling stays off the pages that have their own');
{
  // Stripping the theme page's list padding to fit this row shape broke its
  // colour swatches.
  // Anchored on the new block's own comment: `.settings_page ul.settings_list`
  // also appears in an older rule further up, which does include .theme_page.
  const listRule = region(css, 'Only the settings and profile lists.', '{', 'the new settings list rule');
  ck('the theme page is not caught by the new row layout', !listRule.includes('.theme_page'));
  ck('nor is the sound page', !listRule.includes('.sound_page'));
  ck('but both still get the surface change',
     /\.theme_page,\s*\n\.sound_page \{/.test(css));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
