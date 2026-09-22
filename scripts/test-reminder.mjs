#!/usr/bin/env node
/**
 * Regression tests for the "work still open" reminder.
 *
 * The reminder this replaced was the source of notification spam: its
 * setTimeout delay exceeded the browser's ~24.9 day maximum for about five
 * days each month, so it fired immediately and then rescheduled itself to the
 * same date, in a loop. These tests pin the quiet behaviour: at most one
 * reminder per calendar day, nothing when there is no open work, no
 * permission prompt of its own, and an off switch that works.
 *
 * It extracts the real code out of main.js so the assertions track the
 * shipped source rather than a copy.
 *
 *   node scripts/test-reminder.mjs
 */
import { readFileSync } from 'node:fs';
const src = readFileSync('main.js','utf8');

const start = src.indexOf("const REMINDER_ENABLED_KEY");
const end   = src.indexOf("// Reflect the stored setting");
const BLOCK = src.slice(start, end);
for (const n of ['openJobs','remindOpenJobs','OPEN_STATUSES','REMINDER_LAST_KEY'])
  if (!BLOCK.includes(n)) throw new Error('missing '+n);

function makeEnv({ perm='default', enabled=true, lastDay=null } = {}) {
  const store = {};
  if (!enabled) store['MF_OPEN_JOBS_REMINDER']='off';
  if (lastDay) store['MF_OPEN_JOBS_REMINDER_DAY']=lastDay;
  const localStorage = { getItem:k=>store[k]??null, setItem:(k,v)=>{store[k]=String(v)}, removeItem:k=>{delete store[k]} };
  const shown = [];
  const notices = [];
  const swNotifs = [];
  const Notification = { permission: perm };
  const navigator = { serviceWorker: { ready: Promise.resolve({ showNotification: (t,o)=>{ swNotifs.push({t,o}); return Promise.resolve(); } }) } };
  const api = new Function('localStorage','normDateKey','getCurrentDate','showNotice','Notification','navigator','window',
    `${BLOCK}\nreturn { openJobs, remindOpenJobs, reminderEnabled };`)(
      localStorage,
      v => { const t=String(v==null?'':v).toUpperCase().trim(); const m=t.match(/^(\d{1,2})-([A-Z]+)-(\d{4})$/); return m?`${m[1].padStart(2,'0')}-${m[2].slice(0,3)}-${m[3]}`:t; },
      () => '22-SEPT-2026',
      o => notices.push(o),
      Notification,
      navigator,
      { Notification }
    );
  return { api, store, notices, swNotifs };
}

const J = (sn,status,name,extra={}) => ({ sn, status, name, ...extra });
const rows = [
  J(101,'pending','Arun'), J(102,'progress','Bina'), J(103,'spare','Cyril'),
  J(104,'done','Deepa'), J(105,'collected','Eldho'),
  J(106,'pending','Ghost',{isDeleted:true}),
  J(107,'PENDING','Farah'),            // case variation
];

let pass=0,fail=0;
const ck=(n,c,d='')=>{ if(c){pass++;console.log('  ok    '+n)} else {fail++;console.log('  FAIL  '+n+(d?'  -> '+d:''))} };

console.log('\nWhich jobs count as open');
{
  const { api } = makeEnv();
  const open = api.openJobs(rows).map(d=>d.sn).sort((a,b)=>a-b);
  ck('pending, progress, spare only', JSON.stringify(open)==='[101,102,103,107]', JSON.stringify(open));
  ck('done is excluded', !open.includes(104));
  ck('collected is excluded', !open.includes(105));
  ck('deleted is excluded', !open.includes(106));
  ck('status casing tolerated', open.includes(107));
  ck('empty input is safe', api.openJobs(undefined).length===0 && api.openJobs([]).length===0);
}

console.log('\nNot spam');
{
  let e = makeEnv({perm:'granted'});
  await e.api.remindOpenJobs(rows);
  ck('fires once when there is open work', e.swNotifs.length===1, JSON.stringify(e.swNotifs));
  await e.api.remindOpenJobs(rows);
  await e.api.remindOpenJobs(rows);
  ck('silent on repeat within the same load', e.swNotifs.length===1, 'count='+e.swNotifs.length);

  // simulate a fresh page load on the SAME day
  const day = e.store['MF_OPEN_JOBS_REMINDER_DAY'];
  let e2 = makeEnv({perm:'granted', lastDay:day});
  await e2.api.remindOpenJobs(rows);
  ck('silent on a reload the same day', e2.swNotifs.length===0 && e2.notices.length===0);

  let e3 = makeEnv({perm:'granted', lastDay:'21-SEP-2026'});
  await e3.api.remindOpenJobs(rows);
  ck('fires again the next day', e3.swNotifs.length===1);

  let e4 = makeEnv({perm:'granted'});
  await e4.api.remindOpenJobs([J(1,'collected','X'), J(2,'done','Y')]);
  ck('stays quiet when nothing is open', e4.swNotifs.length===0 && e4.notices.length===0);
  ck('  and does not burn the day', !e4.store['MF_OPEN_JOBS_REMINDER_DAY']);

  let e5 = makeEnv({perm:'granted', enabled:false});
  await e5.api.remindOpenJobs(rows);
  ck('respects the off switch', e5.swNotifs.length===0 && e5.notices.length===0);
}

console.log('\nPermission handling');
{
  let e = makeEnv({perm:'default'});
  await e.api.remindOpenJobs(rows);
  ck('never prompts; falls back to in-app notice', e.swNotifs.length===0 && e.notices.length===1, JSON.stringify(e.notices));
  let d = makeEnv({perm:'denied'});
  await d.api.remindOpenJobs(rows);
  ck('denied also falls back quietly', d.swNotifs.length===0 && d.notices.length===1);
}

console.log('\nMessage content');
{
  const e = makeEnv({perm:'granted'});
  await e.api.remindOpenJobs(rows);
  const { t, o } = e.swNotifs[0];
  console.log(`      title: "${t}"`);
  console.log(`      body : "${o.body}"`);
  ck('counts all 4 open jobs', t==='4 jobs still open', t);
  ck('names the latest by SN first', o.body.startsWith('Latest: #107 Farah, #103 Cyril, #102 Bina'), o.body);
  ck('mentions the remainder', o.body.includes('and 1 more'), o.body);
  ck('uses a replacing tag', o.tag==='mobifixer-open-jobs');
  ck('deep link is home, not a 404 route', o.data?.hash==='');

  const one = makeEnv({perm:'granted'});
  await one.api.remindOpenJobs([J(9,'pending','Solo')]);
  ck('singular wording for one job', one.swNotifs[0].t==='1 job still open', one.swNotifs[0].t);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail?1:0);
