#!/usr/bin/env node
/**
 * Regression tests for writing a job.
 *
 * Editing a job used to call set(), which replaces the whole node. The object
 * it writes has a fixed field list, so any field not on that list was deleted
 * by the act of editing:
 *
 *   - paidInfo   written when a payment is collected (main.js), and read back
 *                for the day's collection total - so editing a job after
 *                taking payment dropped it out of the takings.
 *   - isDeleted  the soft-delete flag - so editing a deleted job resurrected it.
 *
 * An edit uses update() now. These tests apply the field list the shipped code
 * actually writes against real Realtime Database set/update semantics, so they
 * check the outcome rather than just the spelling of the call.
 *
 *   node scripts/test-job-save.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
// parsePattern and dotBetween decide what gets written into a live record.
// They used to be lifted out of main.js with a string match and eval'd; they
// live in pattern.js now, so the test runs the real exports.
import { PATTERN_MIN, parsePattern, formatPattern, dotBetween, patternSvg, patternText }
  from '../pattern.js';

const main = readFileSync('main.js', 'utf8');

let pass = 0, fail = 0;
const ck = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  ok    ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '   ' + extra : '')); }
};

const at = (needle, what) => {
  const i = main.indexOf(needle);
  if (i < 0) throw new Error(`could not find ${what} (${needle}) - renamed?`);
  return i;
};

// The field list the shipped code writes, read out of main.js so the test
// tracks the source instead of a copy of it.
const newDataBlock = main.slice(at('const newData = {', 'the newData literal'),
                                at('// ✅ Save', 'the save call'));
const WRITTEN = [...newDataBlock.matchAll(/^\s{6}([a-zA-Z]+)[,:]/gm)].map(m => m[1]);

// Realtime Database semantics.
const applySet    = (node, payload) => ({ ...payload });
const applyUpdate = (node, payload) => {
  const out = { ...node };
  for (const [k, v] of Object.entries(payload)) {
    if (v === null) delete out[k]; else out[k] = v;
  }
  return out;
};

// A job that has been paid for, on the current multi-device shape.
const PAID = {
  sn: 1206, name: 'Arun Kumar', number: '9876544416', altNumber: '', status: 'collected',
  notes: '', amount: '1800', advance: '1800', author: 'Saheer Babu',
  devices: [{ model: 'Realme 9 Pro', complaints: 'Back glass', lock: '' }],
  date: '18-SEP-2026', time: '10:24 AM', token: 'tok1', updateInfo: {},
  paidInfo: { date: '18-SEP-2026', time: '4:10 PM', by: 'Saheer Babu', amount: '1800' }
};
// A job someone deleted, on the legacy single-device shape.
const DELETED = {
  sn: 63, name: '-', number: '7292949476', status: 'pending',
  model: 'Redmi', complaints: 'Network issue', lock: '',
  isDeleted: true, deletedAt: 1758000000000, deletedBy: 'Saheer Babu'
};

const editPayload = (record) => {
  const out = {};
  for (const k of WRITTEN) out[k] = record[k] ?? '';
  // The edit form reads a legacy record's model/complaints/lock into devices[0].
  out.devices = Array.isArray(record.devices) && record.devices.length
    ? record.devices
    : [{ model: record.model || '', complaints: record.complaints || '', lock: record.lock || '' }];
  return { ...out, model: null, complaints: null, lock: null };
};

console.log('\nThe field list the code writes');
{
  ck('it was read out of main.js', WRITTEN.length >= 12, WRITTEN.join(','));
  for (const f of ['sn', 'name', 'number', 'status', 'amount', 'advance', 'devices', 'date', 'time'])
    ck(`includes ${f}`, WRITTEN.includes(f));
  ck('and does NOT include paidInfo - which is the whole problem', !WRITTEN.includes('paidInfo'));
  ck('nor isDeleted', !WRITTEN.includes('isDeleted'));
}

console.log('\nA paid job survives an edit');
{
  const payload = editPayload(PAID);
  const withSet    = applySet(PAID, payload);
  const withUpdate = applyUpdate(PAID, payload);
  ck('set() deleted the payment record - the old behaviour', withSet.paidInfo === undefined);
  ck('update() keeps it', !!withUpdate.paidInfo && withUpdate.paidInfo.amount === '1800');
  ck('and the day\'s takings can still find it',
     withUpdate.status === 'collected' && !!withUpdate.paidInfo.date);
}

console.log('\nA deleted job stays deleted');
{
  const payload = editPayload(DELETED);
  const withSet    = applySet(DELETED, payload);
  const withUpdate = applyUpdate(DELETED, payload);
  ck('set() resurrected it - the old behaviour', withSet.isDeleted === undefined);
  ck('update() keeps it deleted', withUpdate.isDeleted === true);
  ck('with who deleted it and when', withUpdate.deletedBy === 'Saheer Babu' && !!withUpdate.deletedAt);
}

console.log('\nThe legacy single-device migration still completes');
{
  // 175 of the 1248 real jobs store model/complaints/lock at the top level.
  const withUpdate = applyUpdate(DELETED, editPayload(DELETED));
  ck('the device details move into devices[0]',
     withUpdate.devices[0].model === 'Redmi' && withUpdate.devices[0].complaints === 'Network issue');
  ck('and no stale copy is left beside them',
     !('model' in withUpdate) && !('complaints' in withUpdate) && !('lock' in withUpdate));
}

console.log('\nThe shipped code');
{
  const save = main.slice(at('const savePromise = wasEdit', 'the save branch'),
                          at('try {\n      await withTimeout(savePromise', 'the save await'));
  ck('an edit uses update()', /update\(itemRef, \{ \.\.\.newData/.test(save), save.trim().slice(0, 90));
  ck('a new job still uses set()', /: set\(itemRef, newData\)/.test(save));
  ck('and the legacy keys are cleared on edit',
     /model: null, complaints: null, lock: null/.test(save));

  // undefined is rejected by Firebase; oldData is empty if the record vanished
  // between opening the form and saving.
  ck('date falls back rather than writing undefined', /date: \(wasEdit \? oldData\.date : null\) \?\?/.test(main));
  ck('so does time', /time: \(wasEdit \? oldData\.time : null\) \?\?/.test(main));
}

/* ---------------------------------------------------------------------------
 * The form the shop types into.
 *
 * The status <select> offered five of the card's six statuses - there was no
 * "return" option. The save path reads `$('#status').value.trim() || 'pending'`,
 * and a <select> holding a value no option matches reports '', so opening one of
 * the 20 returned jobs and pressing Update - without touching the status at all -
 * rewrote the record as pending. Unlike the set() problem above, that one was
 * corrupting live records every time it happened.
 *
 * The option list is checked against the card's own STATUS_LABEL map rather than
 * against a copy of the list, so the two cannot drift apart again.
 * ------------------------------------------------------------------------ */

const html = readFileSync('index.html', 'utf8');
const card = readFileSync('cardLayout.js', 'utf8');

const between = (text, from, to, what) => {
  const a = text.indexOf(from);
  if (a < 0) throw new Error(`could not find ${what} (${from}) - renamed?`);
  const b = text.indexOf(to, a + from.length);
  if (b < 0) throw new Error(`could not find the end of ${what} (${to}) - renamed?`);
  return text.slice(a, b);
};

const formHtml = between(html, '<main class="form hidden">', '<main class="shop-work hidden">',
                         'the add/edit form');
const statusSelect = between(formHtml, '<select name="status"', '</select>', 'the status select');
const OPTIONS = [...statusSelect.matchAll(/value="([a-z]+)"/g)].map(m => m[1]);

const CARD_STATUSES = [...between(card, 'const STATUS_LABEL = {', '};', 'the card status map')
  .matchAll(/^\s+([a-z]+):/gm)].map(m => m[1]);

console.log('\nEvery status a card can set exists in the form');
{
  ck('the card statuses were read out of cardLayout.js', CARD_STATUSES.length === 6, CARD_STATUSES.join(','));
  ck('the options were read out of index.html', OPTIONS.length >= 6, OPTIONS.join(','));
  for (const s of CARD_STATUSES)
    ck(`${s} is offered`, OPTIONS.includes(s), OPTIONS.join(','));
  ck('and the form offers nothing the card cannot show',
     OPTIONS.every(o => CARD_STATUSES.includes(o)),
     OPTIONS.filter(o => !CARD_STATUSES.includes(o)).join(','));
}

console.log('\nAn unrecognised status is still not silently downgraded');
{
  // Belt and braces for the list above: even if a status is added elsewhere and
  // nobody adds the option, the edit form keeps the value instead of blanking it.
  const helper = between(main, 'const setStatusValue = (status) => {', '\n};', 'setStatusValue');
  ck('the edit form goes through setStatusValue',
     /setStatusValue\(data\.status\)/.test(main));
  ck('which puts the value back after adding an option for it',
     (helper.match(/select\.value = wanted/g) || []).length === 2, helper.slice(0, 80));
  ck('nothing assigns #status directly any more',
     !/\$\('#status'\)\.value\s*=/.test(main),
     (main.match(/.*\$\('#status'\)\.value\s*=.*/) || [''])[0].trim());
}

console.log('\nIt is a real form');
{
  ck('a <form id="jobForm"> wraps the fields', /<form id="jobForm"/.test(formHtml));
  ck('the handler is on its submit, not on a button click',
     /\$\('#jobForm'\)\.onsubmit = async \(e\) => \{\s*\n\s*e\.preventDefault\(\);/.test(main));
  ck('nothing is still bound to .add-data.onclick', !/\$\('\.add-data'\)\.onclick/.test(main));
  ck('the submit control is type="submit"', /<button type="submit" class="add-data">/.test(formHtml));

  // required does nothing outside a form, so all eleven fields carried it. Now
  // that it bites, it has to match what the JS validation actually demands -
  // otherwise a job with no alternative number or no lock stops being saveable.
  const required = [...formHtml.matchAll(/<input[^>]*\brequired\b[^>]*>/g)]
    .map(m => (m[0].match(/id="([a-z_]+)"/) || [])[1]).filter(Boolean).sort();
  ck('required is on exactly the fields the save path validates',
     required.join(',') === 'complaint,model,name,number', required.join(','));
  for (const optional of ['alt_number', 'lock', 'amount', 'advance'])
    ck(`${optional} is optional, as it has always been in practice`, !required.includes(optional));

  const validation = between(main, 'if (!name || !number', 'return;', 'the JS validation');
  for (const f of ['name', 'number', 'complaints', 'model'])
    ck(`the JS still checks ${f} too`, validation.includes(f));
}

console.log('\nThe ids the save and populate paths read are all present, once');
{
  const ids = [...formHtml.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  const dupes = ids.filter((v, i) => ids.indexOf(v) !== i);
  ck('no duplicate ids', dupes.length === 0, dupes.join(','));

  for (const id of ['name', 'number', 'alt_number', 'model', 'complaint', 'lock', 'amount',
                    'advance', 'notes', 'status', 'total_device_count',
                    'more_device_input_container', 'new_sn'])
    ck(`#${id} is still there`, ids.includes(id));

  for (const s of ['name', 'number', 'alt_number', 'model', 'complaint'])
    ck(`#${s}_suggest_container is still there`, ids.includes(`${s}_suggest_container`));

  ck('.add-data is still a single element with that class',
     (formHtml.match(/class="add-data"/g) || []).length === 1);
  ck('.page-title is still there', /class="page-title"/.test(formHtml));
  ck('#author_name_p is still there', ids.includes('author_name_p'));
}

console.log('\nThe dead SIM checkbox is gone');
{
  // Two <div class="checkBox-container"> blocks, both hidden, both with
  // id="sim" - and 0 of the 1248 real records carry a sim field.
  ck('no #sim in the markup', !/id="sim"/.test(html));
  ck('no .checkBox-container in the form', !/checkBox-container/.test(formHtml));
  ck('and nothing in main.js reads it', !/\$\('#sim'\)/.test(main));
}

console.log('\nDevice blocks are built in one place');
{
  ck('makeDeviceSet exists', /const makeDeviceSet = \(index, data = \{\}\) =>/.test(main));
  ck('and is the only thing that writes .device-set markup',
     (main.match(/className = 'device-set/g) || []).length === 1);
  ck('the edit populate goes through addDeviceSet',
     /addDeviceSet\(devices\[i\], \{ enforceCap: false \}\)/.test(main));
  ck('with the cap off, so a record with more than five devices is not truncated',
     /enforceCap = true/.test(main) && /enforceCap: false/.test(main));
  ck('the cap is five', /const MAX_DEVICES = 5;/.test(main));
  ck('the +/- stepper is gone from the markup',
     !/increase_device/.test(html) && !/decrease_device/.test(html));
  ck('and from main.js', !/increase_device_btn|updateInputs/.test(main));
  ck('#total_device_count survives as a form control the save path can read',
     /<input type="hidden" name="total_device_count" id="total_device_count"/.test(formHtml));
}

console.log('\nStarting a new job does not inherit the last one');
{
  const reset = between(main, "$('.add').onclick = () => {", '\n};', 'the New handler');
  ck('it no longer reads fields off the global job array',
     !/\.value = data\./.test(reset),
     (reset.match(/.*\.value = data\..*/) || [''])[0].trim());
  ck('it clears the extra device blocks', /clearExtraDevices\(\)/.test(reset));
  ck('and resets the status to pending', /setStatusValue\('pending'\)/.test(reset));
}

/* ---------------------------------------------------------------------------
 * The unlock pattern pad.
 *
 * The lock field takes a PIN, a password or a pattern. A pattern written in
 * words is not something the next person can act on, so it can be drawn on a
 * 3x3 pad - but the value it writes has to stay plain text, because that field
 * already holds free text on 1248 records and is read straight out onto the
 * card and the printed receipt.
 * ------------------------------------------------------------------------ */

console.log('\nThe pattern is stored as text the card can already show');
{
  ck('it is written as "Pattern 1-4-7-8-9"',
     formatPattern([1, 4, 7, 8, 9]) === 'Pattern 1-4-7-8-9', formatPattern([1, 4, 7, 8, 9]));
  ck('and read straight back', String(parsePattern(formatPattern([1, 4, 7, 8, 9]))) === '1,4,7,8,9');
  ck('nothing new is added to the record', !/patternDots\s*[,:]/.test(newDataBlock), newDataBlock.slice(0, 80));
  ck('the lock field is still a plain text input',
     /<input type="text" id="lock" name="lock"/.test(formHtml));
  ck('every lock field sits in a row with its Draw button',
     /<div class="jf-lock-row">/.test(formHtml) && /class="jf-lock-draw"/.test(formHtml));
  ck('and the extra device blocks build the same row',
     /deviceField\('lock-input', 'Lock \/ pattern', data\.lock, true, \{ draw: true \}\)/.test(main));
}

console.log('\nOnly a value the pad wrote is read back as a pattern');
{
  ck('a pattern parses', String(parsePattern('Pattern 1-4-7-8-9')) === '1,4,7,8,9',
     String(parsePattern('Pattern 1-4-7-8-9')));
  ck('however it was spaced', String(parsePattern('pattern: 1 2 3 6 9')) === '1,2,3,6,9',
     String(parsePattern('pattern: 1 2 3 6 9')));
  ck('a four-digit PIN does not', parsePattern('4821') === null, String(parsePattern('4821')));
  ck('nor a nine-digit one', parsePattern('123456789') === null);
  ck('nor a word', parsePattern('swipe up') === null);
  ck('nor an empty field', parsePattern('') === null);
  ck('nor a missing one', parsePattern(undefined) === null);
  ck('nor a pattern too short to exist', parsePattern('Pattern 1-2') === null);
  ck('nor one that repeats a dot', parsePattern('Pattern 1-2-1-2') === null);
  ck('nor one with more dots than there are', parsePattern('Pattern 1-2-3-4-5-6-7-8-9-1') === null);
  ck('the minimum matches what Android enforces', PATTERN_MIN === 4, String(PATTERN_MIN));
}

console.log('\nA drag picks up the dots it crosses');
{
  // Recording 1-3 when the finger went through 2 writes down a pattern that does
  // not unlock the phone, so these are the cases that matter most here.
  for (const [a, b, want] of [[1,3,2], [3,1,2], [1,7,4], [1,9,5], [9,1,5], [3,7,5],
                              [4,6,5], [2,8,5], [7,9,8], [3,9,6], [7,3,5]])
    ck(`${a} to ${b} crosses ${want}`, dotBetween(a, b) === want, String(dotBetween(a, b)));
  for (const [a, b] of [[1,5], [5,1], [1,2], [2,7], [1,4], [5,9], [4,8], [1,6], [2,4], [6,8], [1,1]])
    ck(`${a} to ${b} crosses nothing`, dotBetween(a, b) === 0, String(dotBetween(a, b)));
}

console.log('\nThe pad cannot act on the job form it sits over');
{
  const sheet = between(html, '<div class="pattern_overlay"', '<!-- ########## BOTTOM SHEET', 'the pattern pad');
  ck('the pad is outside the job form', html.indexOf('pattern_overlay') > html.indexOf('</form>'));
  ck('and outside the add page entirely', !formHtml.includes('pattern_overlay'));
  for (const m of sheet.matchAll(/<button\b[^>]*>/g))
    ck('a button in the pad is type="button"', /type="button"/.test(m[0]), m[0]);
  ck('the nine dots are built as type="button" too', /b\.type = 'button';\n  b\.className = 'pattern-dot';/.test(main));
}

console.log('\nThe printed receipt escapes what the customer dictated');
{
  // Model, complaint and lock were interpolated raw into the receipt markup -
  // the same hole the job list had, on the page handed to the customer.
  const receipt = between(main, "const devContainer = document.getElementById('pr-devices-container');",
                          "document.getElementById('pr-status')", 'the receipt device rows');
  ck('the model is escaped', /prEsc\(d\.model\)/.test(receipt) && !/\$\{d\.model \|\| ''\}/.test(receipt));
  ck('the complaint is escaped', /prEsc\(d\.complaints\)/.test(receipt));
  ck('the lock is escaped', /prEsc\(d\.lock\)/.test(receipt));
  ck('and so are all three on the legacy single-device shape',
     /prEsc\(service\.model\)/.test(receipt) && /prEsc\(service\.complaints\)/.test(receipt)
       && /prEsc\(service\.lock\)/.test(receipt));
  const RAW = /\$\{(d|service)\.(model|complaints|lock)(\s*\|\|\s*'')?\}/;
  ck('no bare interpolation of any of them is left',
     !RAW.test(receipt), (receipt.match(RAW) || [''])[0]);
  ck('the escaper covers the five characters that matter',
     ["/&/g, '&amp;'", "/</g, '&lt;'", "/>/g, '&gt;'", "/\"/g, '&quot;'", "/'/g, '&#39;'"]
       .every(part => main.includes(part)));
}

/* ---------------------------------------------------------------------------
 * Showing a pattern, rather than printing the digits it is stored as.
 * ------------------------------------------------------------------------ */

// Comments stripped: these checks are about what the worker DOES, and sw.js
// explains the old absolute-path bug in prose - "/index.html", "script.js",
// "addAll" and "skipWaiting" all appear in comments describing what it no
// longer does. Matching those would have passed for the wrong reason.
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^[ \t]*\/\/.*$/gm, '')
  .replace(/([^:"'`\\])\/\/.*$/gm, '$1');
const sw = stripComments(readFileSync('sw.js', 'utf8'));

console.log('\nThe picture says where to start and which way round');
{
  // 1-4-7 and 7-4-1 draw the identical line, so a still picture has to carry
  // direction some other way or it is not usable on a bench.
  const plain = patternSvg([1, 2, 3, 6, 9]);
  // Nine dots is the worst case: every dot is lit, so they have to be small
  // enough not to merge into the lines at thumbnail size.
  const nine = patternSvg([2, 5, 7, 3, 6, 8, 4, 1, 9]);
  const full  = patternSvg([1, 2, 3, 6, 9], { detailed: true });

  ck('a pattern draws as one polyline', (plain.match(/<polyline/g) || []).length === 1);
  ck('through the dots in order', plain.includes('50,50 150,50 250,50 250,150 250,250'), plain.slice(0, 90));
  ck('all nine dots are drawn, so the shape is readable',
     (plain.match(/<circle/g) || []).length === 9, String((plain.match(/<circle/g) || []).length));
  ck('the five on the pattern are marked',
     (plain.match(/class="on"/g) || []).length === 5, String((plain.match(/class="on"/g) || []).length));

  ck('the small one stays plain', !plain.includes('start-ring') && !plain.includes('arrow'));
  ck('a nine-dot pattern lights all nine',
     (nine.match(/class="on"/g) || []).length === 9, String((nine.match(/class="on"/g) || []).length));
  ck('and its dots stay small enough to read as a shape',
     !/r="(1[7-9]|2\d)" class="on"/.test(nine), (nine.match(/r="\d+" class="on"/) || [''])[0]);
  ck('the full-size one rings the first dot', full.includes('class="start-ring"'));
  ck('and the ring is on dot 1, where the finger starts',
     /<circle cx="50" cy="50" r="\d+" class="start-ring"/.test(full),
     (full.match(/class="start-ring"[^>]*/) || [])[0]);
  ck('one arrow per segment', (full.match(/class="arrow"/g) || []).length === 4,
     String((full.match(/class="arrow"/g) || []).length));

  // An arrow pointing the wrong way is worse than no arrow: it tells the bench
  // to draw the pattern backwards. 1-2-3-6-9 goes right, right, down, down.
  const angles = (svg) => [...svg.matchAll(/rotate\((-?[\d.]+)\)/g)].map(m => Number(m[1]));
  ck('they point the way the finger goes', angles(full).join(',') === '0,0,90,90', angles(full).join(','));
  ck('and they sit on the line, not beside it',
     [...full.matchAll(/translate\(([\d.]+) ([\d.]+)\)/g)].map(m => `${m[1]},${m[2]}`).join(' ')
       === '100.0,50.0 200.0,50.0 250.0,100.0 250.0,200.0',
     [...full.matchAll(/translate\(([\d.]+) ([\d.]+)\)/g)].map(m => `${m[1]},${m[2]}`).join(' '));

  // Reversing the pattern must move the ring and turn every arrow around.
  const back = patternSvg([9, 6, 3, 2, 1], { detailed: true });
  ck('reversing it moves the ring to the other end',
     /<circle cx="250" cy="250" r="\d+" class="start-ring"/.test(back),
     (back.match(/class="start-ring"[^>]*/) || [])[0]);
  ck('and every arrow turns around with it',
     angles(back).join(',') === '-90,-90,180,180', angles(back).join(','));
  ck('so the two are not the same picture', back !== full);

  ck('the dots are never numbered - the caption already numbers them',
     !full.includes('<text'), 'a <text> label came back');
  ck('nothing but integers reaches the markup', !/undefined|NaN|\[object/.test(full));
  ck('the caption reads as an order', patternText([1, 4, 7]) === '1 – 4 – 7', patternText([1, 4, 7]));
}

console.log('\nThe card draws a pattern and leaves everything else alone');
{
  ck('cardLayout uses the shared module',
     /from '\.\/pattern\.js'/.test(card) && /parsePattern/.test(card));
  ck('there is one lock renderer', /const lockValue = \(lock\) => \{/.test(card));
  ck('and both lock rows go through it',
     (card.match(/\$\{lockValue\(/g) || []).length === 2,
     String((card.match(/\$\{lockValue\(/g) || []).length));
  ck('a lock that is not a pattern is still escaped',
     /return esc\(lock\) \|\| '<i>none<\/i>';/.test(card));
  ck('the chip carries the dots for the viewer to read',
     /data-pattern="\$\{dots\.join\('-'\)\}"/.test(card));
  // "2 – 5 – 7 – 3 – 6 – 8 – 4 – 1 – 9" is 33 characters and wrapped the chip
  // onto two lines, leaving the picture stranded beside a wall of digits. The
  // spaced form is still what the full-size view uses, where there is room.
  ck('and the digits on it are the compact form',
     /<span>\$\{dots\.join\('-'\)\}<\/span>/.test(card),
     (card.match(/<span>[^<]*<\/span>/) || [''])[0]);
  ck('the spaced form is kept for the full-size view',
     /patternText\(dots\)/.test(main) && !/patternText\(dots\)/.test(card));
  ck('and it is a button, so it is reachable from a keyboard',
     /<button type="button" class="pattern-chip"/.test(card));
  ck('neither lock row interpolates the raw value any more',
     !/\$\{esc\(d\.lock\) \|\| 'none'\}/.test(card) && !/\$\{esc\(lock\) \|\| '<i>none<\/i>'\}/.test(card));
}

console.log('\nThe viewer is read-only and cannot reach the job form');
{
  const viewer = between(html, '<div class="pattern_view_overlay"', '<!-- ########## PATTERN PAD',
                         'the pattern viewer');
  ck('it exists', viewer.includes('id="patternViewGrid"'));
  ck('outside the job form', html.indexOf('pattern_view_overlay') > html.indexOf('</form>'));
  ck('it has no inputs of any kind', !/<input|<select|<textarea/.test(viewer), viewer.slice(0, 80));
  for (const m of viewer.matchAll(/<button\b[^>]*>/g))
    ck('its button is type="button"', /type="button"/.test(m[0]), m[0]);
  ck('the full-size renderer is what it draws with',
     /patternSvg\(dots, \{ detailed: true \}\)/.test(main));
  ck('Escape closes it as well as the pad',
     /if \(patternViewOverlay\.classList\.contains\('active'\)\) closePatternView\(\);/.test(main));
  ck('opening it does not collapse the card underneath',
     /e\.stopPropagation\(\);\s*\/\/ don't also collapse/.test(main));
}

/* ---------------------------------------------------------------------------
 * Speed. Each of these is here because removing it measurably cost something.
 * ------------------------------------------------------------------------ */

console.log('\nThe card body is built when the card is opened, not before');
{
  // Measured on 500 jobs at 4x CPU throttle: 2633 DOM nodes -> 1566, HTML
  // parsing 79 ms -> 48 ms, and switching status tabs 157 ms -> 23 ms.
  const render = between(main, 'const nextSlice = activeFiltered.slice', "// Fill in a card's body",
                         'the render loop');
  ck('the render loop writes only the summary row', /nav\.innerHTML = cardSummary\(item\)/.test(render));
  ck('and no longer builds the body', !/cardLayout\(item\)/.test(render),
     (render.match(/.*cardLayout\(item\).*/) || [''])[0].trim());
  ck('expandCard builds it on first open', /const expandCard = \(li\) => \{/.test(main));
  ck('exactly once per card', /if \(!li \|\| li\.dataset\.bodyBuilt\) return;/.test(main));
  ck('the toggle calls it before uncollapsing',
     /expandCard\(parent\); parent\.classList\.toggle\('collapse'\);/.test(main));
  ck('it appends rather than reparsing the row it is added to',
     /li\.insertAdjacentHTML\('beforeend', cardLayout\(item\)\)/.test(main));

  // The two things that used to sweep the whole list after every render.
  ck('the note boxes are sized per card', /const setAutoHeightTextArea = \(root = document\) =>/.test(main));
  ck('the remind buttons are painted per card', /function paintReminderButtons\(root = document\)/.test(main));
  const refresh = between(main, 'const scheduleListRefresh = () => {', '\n};', 'scheduleListRefresh');
  ck('and neither runs over the whole list on every render',
     !/setAutoHeightTextArea\(\)/.test(refresh), refresh);
}

console.log('\nThe boot path is not carrying things it does not need');
{
  ck('the font is a <link>, not an @import behind the stylesheet',
     /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com/.test(html));
  ck('with the handshake started in parallel',
     /<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>/.test(html));
  ck('and style.css no longer @imports it',
     !/@import/.test(readFileSync('style.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')));

  ck('jsPDF is not loaded on every visit', !/<script[^>]*jspdf/.test(html));
  ck('nor XLSX', !/<script[^>]*sheetjs/.test(html));
  ck('both are fetched when an export is actually asked for',
     /await ensureExportLib\('xlsx'\)/.test(main) && /await ensureExportLib\('jspdf'\)/.test(main));
  ck('and a CDN that will not answer says so instead of throwing',
     /title: 'Export unavailable'/.test(main));
  ck('a script is only ever fetched once', /if \(SCRIPT_CACHE\.has\(src\)\) return SCRIPT_CACHE\.get\(src\);/.test(main));

  ck('lottie is pinned to a version', /lottie-player@\d+\.\d+\.\d+\//.test(html),
     (html.match(/lottie-player@[^/]*/) || [])[0]);
}

console.log('\nDate labels are worked out once per date, not once per card');
{
  ck('the answers are cached', /const dateLabelCache = new Map\(\);/.test(main));
  ck('and thrown away when the day turns over - "Today" must not go stale',
     /if \(dayKey !== dateLabelDay\) \{ dateLabelCache\.clear\(\); dateLabelDay = dayKey; \}/.test(main));
}

console.log('\nOne service worker, and it can never pin a shop to a broken build');
{
  ck('the second worker is gone', !existsSync('service-worker.js'));
  ck('and nothing registers it', !/service-worker\.js'\)/.test(main));
  ck('sw.js is registered exactly once',
     (main.match(/serviceWorker\.register\(/g) || []).length === 1,
     String((main.match(/serviceWorker\.register\(/g) || []).length));

  ck('every precached path is relative, so it resolves under /mobifixer/',
     !/["']\/(index\.html|style\.css|main\.js|script\.js)["']/.test(sw),
     (sw.match(/["']\/[a-z.]+["']/) || [''])[0]);
  ck('and /script.js, which never existed, is not among them', !/script\.js/.test(sw));
  ck('one missing file cannot cost the whole cache',
     !/addAll/.test(sw) && /SHELL\.map/.test(sw));

  ck('it is stale-while-revalidate, not cache-first',
     /const fromNetwork = fetch\(req\)/.test(sw) && /event\.waitUntil\(fromNetwork\); return cached;/.test(sw));
  ck('only GET is touched', /if \(req\.method !== "GET"\) return;/.test(sw));
  ck('only this origin', /if \(url\.origin !== self\.location\.origin\) return;/.test(sw));
  ck('only inside our own scope', /url\.pathname\.startsWith\(new URL\("\.\/", self\.registration\.scope\)\.pathname\)/.test(sw));
  ck('it does not skipWaiting into a half-updated page', !/skipWaiting/.test(sw));
  ck('old caches are dropped on activate', /if \(name !== CACHE\) await caches\.delete\(name\)/.test(sw));
  ck('and there is a way to empty it without a deploy', /event\.data !== "CLEAR_CACHES"/.test(sw));
}

console.log('\nThe bulk bar can set every status a job can have');
{
  const bulk = between(html, '<select id="bulkStatus">', '</select>', 'the bulk status select');
  const bulkOptions = [...bulk.matchAll(/value="([a-z]+)"/g)].map(m => m[1]);
  for (const s of CARD_STATUSES)
    ck(`${s} can be set in bulk`, bulkOptions.includes(s), bulkOptions.join(','));
  ck('and it offers nothing the card cannot show',
     bulkOptions.every(o => CARD_STATUSES.includes(o)),
     bulkOptions.filter(o => !CARD_STATUSES.includes(o)).join(','));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
