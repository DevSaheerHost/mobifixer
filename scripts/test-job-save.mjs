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

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
