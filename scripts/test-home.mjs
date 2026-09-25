#!/usr/bin/env node
/**
 * Regression tests for the job list on the home page.
 *
 * What this pins:
 *
 *  1. Jobs are CLOSED by default and the closed row is useful. Every job used
 *     to render fully expanded - device, complaints, amounts, a note box and
 *     six status buttons - for all 1248 jobs on a real shop. A collapse existed
 *     (tap the nav) but set height:10px, so a closed job showed nothing at all,
 *     not even whose it was. Nobody used it.
 *
 *  2. The whole row opens the card. The old handler was
 *     `e.target.tagName === 'nav'`, true only when the tap landed on the nav's
 *     own padding, so tapping the name or the serial did nothing.
 *
 *  3. Customer data is escaped. Names, models, complaints, notes and phone
 *     numbers went into innerHTML raw, and those fields are attacker-writable
 *     while the database still has no rules on it.
 *
 *   node scripts/test-home.mjs
 */
import { readFileSync } from 'node:fs';

const at = (src, needle, what) => {
  const i = needle instanceof RegExp ? src.search(needle) : src.indexOf(needle);
  if (i < 0) throw new Error(`could not find ${what} (${needle}) - renamed?`);
  return i;
};

const card = readFileSync('cardLayout.js', 'utf8');
const main = readFileSync('main.js', 'utf8');
const css  = readFileSync('style.css', 'utf8');

let pass = 0, fail = 0;
const ck = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  ok    ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '   ' + extra : '')); }
};

// Resolved against the working directory, like the readFileSync calls above.
// '../cardLayout.js' would be relative to THIS file, so the suite would always
// import the real module no matter which copy it was pointed at.
const { pathToFileURL } = await import('node:url');
const { resolve } = await import('node:path');
const { cardSummary, cardLayout } = await import(pathToFileURL(resolve('cardLayout.js')).href);
globalThis.localStorage = { getItem: () => 'Saheer Babu' };

const JOB = {
  sn: 1206, name: 'Arun Kumar', status: 'pending', number: '9876544416',
  amount: '1800', advance: '500', author: 'Saheer Babu',
  devices: [{ model: 'Realme 9 Pro', complaints: 'Back glass replacement', lock: '' }]
};
const text = (html) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

console.log('\nThe closed row carries the job');
{
  const html = cardSummary(JOB);
  ck('the customer', html.includes('Arun Kumar'));
  ck('the serial', /class="sn">1206</.test(html));
  ck('the device', html.includes('Realme 9 Pro'));
  ck('the status, as a word and not only a colour', /class="chip s-pending">Pending</.test(html));
  ck('initials for the avatar', /class="circle">AK</.test(html));
  ck('what is still owed, not the total', /class="due"[^>]*>₹1,300</.test(html), text(html));
}
{
  // A job with no amount entered is not a settled balance.
  for (const empty of [undefined, '', '   ', null]) {
    const html = cardSummary({ ...JOB, amount: empty, advance: empty });
    ck(`no amount recorded (${JSON.stringify(empty)}) claims nothing about money`,
       !/Settled/.test(html) && !/class="due"/.test(html), text(html));
  }
  ck('a fully paid job says so instead of showing ₹0',
     /class="due settled">Settled</.test(cardSummary({ ...JOB, advance: '1800' })));
  ck('an overpaid job is settled too',
     /settled/.test(cardSummary({ ...JOB, advance: '2000' })));
  ck('the old single-device shape still resolves a model',
     cardSummary({ ...JOB, devices: undefined, model: 'iPhone XR' }).includes('iPhone XR'));
  ck('a job with no name still renders', cardSummary({ sn: 1, name: '' }).includes('No name'));
  ck('and gets a placeholder avatar', /class="circle">\?</.test(cardSummary({ sn: 1, name: '' })));
  for (const s of ['pending', 'spare', 'progress', 'done', 'collected', 'return'])
    ck(`${s} has its own chip class`, cardSummary({ ...JOB, status: s }).includes(`chip s-${s}`));
}

console.log('\nCustomer data is escaped');
{
  const evil = {
    sn: 7, amount: 100, advance: 0, author: '<i>hax</i>',
    name: '<img src=x onerror=alert(1)>', number: '"onmouseover="alert(2)',
    notes: '</textarea><script>alert(3)<\/script>',
    devices: [{ model: '<b>X</b>', complaints: '<script>alert(4)<\/script>', lock: '<u>l</u>' }]
  };
  const sum = cardSummary(evil), body = cardLayout(evil);
  ck('no tag survives into the summary row', !/<(script|img|b>|u>)/i.test(sum), sum.slice(0, 120));
  ck('nor into the open card', !/<(script|img|b>|u>)/i.test(body));
  const inner = body.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/)[1];
  ck('a note cannot break out of its textarea', !inner.includes('<'), JSON.stringify(inner.slice(0, 60)));
  ck('and the textarea is still closed exactly once', (body.match(/<\/textarea>/g) || []).length === 1);
  ck('a quote in a phone number cannot escape the attribute',
     !/data-num="\+91[^"]*"[^>]*onmouseover/i.test(body));
  const noMoney = cardLayout({ sn: 1, amount: '', advance: '', devices: [] });
  ck('an empty amount reads "Not set", not a bare ₹',
     /class="value-unset">Not set</.test(noMoney) && !new RegExp('>₹<').test(noMoney));
  ck('a real amount still renders',
     cardLayout({ sn: 1, amount: '1800', advance: '500', devices: [] }).includes('₹1,800'));

  ck('our own <i>unknown</i> fallbacks are left alone',
     cardLayout({ sn: 1, devices: [{ model: '', complaints: '' }] }).includes('<i>unknown</i>'));
}

console.log('\nEvery list builder renders the same row');
{
  // The live one passes cardMeta as well; the other two are in createCardsyyyy,
  // which has been dead since 2.6.0 and is left alone.
  ck('all three call cardSummary', (main.match(/cardSummary\(item[,)]/g) || []).length === 3,
     String((main.match(/cardSummary\(item[,)]/g) || []).length));
  ck('and all three start closed', (main.match(/classList\.add\('collapse'\)/g) || []).length === 3);
  ck('nothing builds its own nav markup any more', !/nav\.innerHTML\s*=\s*`/.test(main));
}

console.log('\nOpening and closing');
{
  const handler = main.slice(at(main, "const summaryRow = e.target.closest", 'the open/close handler'),
                             at(main, 'const remindBtn', 'the handler end'));
  ck('the whole row is the target, not just the nav element',
     /closest\('\.list-item > nav'\)/.test(handler));
  ck('selecting a job does not open it', /!e\.target\.closest\('\.pick'\)/.test(handler));
  ck('nor does the edit pencil', /!e\.target\.closest\('\.editIcon'\)/.test(handler));
  ck('the old tagName check is gone', !/tagName\.toLowerCase\(\) === 'nav'/.test(main));
}

console.log('\nThe closed state actually shows the row');
{
  const rule = css.slice(at(css, /\.list-item\.collapse\s*\{/, 'the collapse rule'),
                         at(css, '.list-item.collapse > *:not(nav)', 'the collapse rule end'));
  ck('a closed card is no longer squashed to 10px', !/height:\s*10px/.test(rule), rule.slice(0, 80));
  ck('nor faded out', !/opacity:\s*0\.5/.test(rule));
  ck('closing hides the detail, not the summary',
     /\.list-item\.collapse > \*:not\(nav\)\s*\{\s*display:\s*none/.test(css));
  ck('the summary row is in the flow, not the absolute blue bar',
     /\.home \.list \.list-item > nav\s*\{[^}]*position:\s*static/.test(css));
}

console.log('\nStyling that was wrong');
{
  ck('Remind has a base style, not just modifiers',
     /^\.remind-btn\s*\{/m.test(css), 'it fell through to the solid white default');
  ck('the debug-style ": " prefix is dropped on the home card',
     /\.home \.list \.list-item p\.value::before\s*\{\s*content:\s*none/.test(css));
  // It draws its own bordered box, so padding insets the contents and leaves
  // the border running to the card's edges.
  ck('the status block is inset with margin, not padding',
     /\.home \.list \.list-item > \.status\s*\{[^}]*margin:\s*0\.9rem 0\.9rem 0/.test(css));
  ck('and it is excluded from the padding rule',
     /\.home \.list \.list-item > \*:not\(nav\):not\(\.status\)/.test(css));
  ck('the date divider is not drawn with light-theme rules',
     /\.home \.list \.date-divider\s*\{[^}]*border:\s*none/.test(css));
  ck('the list is not inside a double gutter',
     /\.home \.list-section \.list\s*\{[^}]*margin:\s*0/.test(css));
  ck('search results are coloured per status, not all amber',
     ['pending','spare','progress','done','return'].every(s => css.includes(`.search-out .status.${s}`)));
}

console.log('\nHeader and search');
{
  const html = readFileSync('index.html', 'utf8');
  const header = html.slice(at(html, '<header>', 'the header'), at(html, '</header>', 'the header end'));

  // It was fixed to the top-left of the viewport in near-black text on a
  // near-black background, showing "0ms". Only ever read and removed.
  ck('the debug timer is gone', !html.includes('timerElement'));
  ck('and nothing still reads it', !readFileSync('main.js', 'utf8').includes("$('#timerElement')"));

  ck('the shop name element is kept', header.includes('id="shopname"'));
  ck('as are the three actions',
     (header.match(/class="nav-icon"/g) || []).length === 3);
  ck('the bell keeps a child for its handler to bind to',
     /id="toggle_fullscreen_notification"[^>]*>\s*<i/.test(header));
  ck('the dead accessories and MKLM links are gone',
     !header.includes('box-archive') && !header.includes('MKLM'));

  ck('the search field has a clear button', header.includes('id="searchClear"'));
  ck('the results dropdown is anchored inside the search bar',
     at(header, 'class="search-bar"', 'the search bar') < at(header, 'class="search-out', 'the dropdown') &&
     header.indexOf('</div>', at(header, 'class="search-out', 'the dropdown')) > 0);
  ck('the field does not autocapitalize or autocorrect a serial number',
     /id="search"[\s\S]{0,200}autocapitalize="none"/.test(header) &&
     /id="search"[\s\S]{0,200}autocorrect="off"/.test(header));

  // `position: relative` with a leftover `right: 50%` shifts a box LEFT by half
  // its container - it put the search bar 163px off the side of the screen.
  ck('the search bar clears the offsets it used to be positioned with',
     /header \.search-bar\s*\{[^}]*position:\s*relative[^}]*inset:\s*auto/.test(css));
  ck('the field is 16px so iOS does not zoom on focus',
     /header \.search-bar input#search\s*\{[^}]*font-size:\s*16px/.test(css));
  ck('and has no surface of its own inside the bar',
     /header \.search-bar input#search\s*\{[^}]*background:\s*transparent\s*!important/.test(css));
  ck('the header no longer scrolls sideways',
     /header \.shop-selector-wrap\s*\{[^}]*overflow:\s*visible/.test(css));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
