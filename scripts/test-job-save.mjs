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
import { readFileSync } from 'node:fs';

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

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
