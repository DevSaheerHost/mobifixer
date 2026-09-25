// Things the app can work out about a job without storing anything new.
//
// How old it is, whether this customer has been in before, and whether the
// device in front of you is one you already repaired. All of it is derived from
// records as they already are, so there is no migration and nothing to lose.
//
// No DOM and no imports, so scripts/test-job-save.mjs imports and runs these
// directly instead of matching source text.

// ---------------------------------------------------------------------------
// Dates
//
// Records store DD-MON-YYYY. The month is written by the browser through
// toLocaleDateString('en-GB', { month: 'short' }), and newer ICU says "Sept"
// where older said "Sep", so the same shop has both spellings on file. Two
// places already worked around this in their own way: normDateKey() in main.js
// slices the month to three letters, and renderPayments kept a private months
// array. This is the one parser.
//
// `new Date('22-SEPT-2026')` happens to work in V8 and is not something to rely
// on across the phones this runs on, so the shape is matched explicitly.

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// "22-SEPT-2026" -> Date at local midnight. Anything else -> null.
export const parseJobDate = (value) => {
  const m = String(value == null ? '' : value).toUpperCase().trim()
    .match(/^(\d{1,2})-([A-Z]{3,})-(\d{4})$/);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2].slice(0, 3));
  if (month < 0) return null;
  const day = Number(m[1]);
  if (day < 1 || day > 31) return null;
  const d = new Date(Number(m[3]), month, day);
  // Rejects 31-FEB and friends, which roll over rather than failing.
  return d.getMonth() === month && d.getDate() === day ? d : null;
};

// The same DD-MON-YYYY shape the records use, for comparing without parsing.
export const jobDateKey = (value) => {
  const d = parseJobDate(value);
  if (!d) return String(value == null ? '' : value).toUpperCase().trim();
  return `${String(d.getDate()).padStart(2, '0')}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
};

export const todayKey = (now = new Date()) =>
  `${String(now.getDate()).padStart(2, '0')}-${MONTHS[now.getMonth()]}-${now.getFullYear()}`;

// Whole days between two dates, counted by calendar day so a job taken in at
// 11pm is one day old tomorrow morning, not zero.
const dayNumber = (d) => Math.floor(
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);

export const daysBetween = (from, to) => dayNumber(to) - dayNumber(from);

// ---------------------------------------------------------------------------
// How long a job has been sitting
//
// Nothing in the app said this. A three-week-old repair looked exactly like
// this morning's, and the phone at the back of the shelf is the one that costs
// a customer.

export const AGE_WARN = 7;    // amber from here
export const AGE_LATE = 30;   // red from here

// A job keeps ageing until the customer has it or it went back.
//
// NOT the same list as OPEN_STATUSES in main.js, which drives the shop's
// unfinished-work reminder and deliberately leaves out "done" because the
// repair is finished and it is the customer's turn. Here "done" is exactly the
// case that matters: repaired and never collected is the most common way a
// phone gets forgotten on a shelf, and it is what the WhatsApp button is for.
export const AGEING_STATUSES = ['pending', 'progress', 'spare', 'done'];

export const jobAge = (job, now = new Date()) => {
  if (!job || !AGEING_STATUSES.includes(job.status)) return null;
  const taken = parseJobDate(job.date);
  if (!taken) return null;
  const days = daysBetween(taken, now);
  if (days < AGE_WARN) return null;           // nothing to say yet
  return { days, level: days >= AGE_LATE ? 'late' : 'warn' };
};

// ---------------------------------------------------------------------------
// The date the shop promised
//
// Every customer asks "when will it be ready?", the shop answers, and until
// now nothing wrote it down. An age badge says "this is old"; a promised date
// says "you said today", which is the one a shop acts on.
//
// Optional and additive. A record without readyBy behaves exactly as before.

// <input type="date"> speaks YYYY-MM-DD. Records speak DD-MON-YYYY, and keeping
// one shape in the record means parseJobDate, jobDateKey and every existing
// comparison work on it unchanged.
export const fromInputDate = (value) => {
  const m = String(value == null ? '' : value).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  const year = Number(m[1]), month = Number(m[2]) - 1, day = Number(m[3]);
  if (month < 0 || month > 11 || day < 1 || day > 31) return '';
  const d = new Date(year, month, day);
  if (d.getMonth() !== month || d.getDate() !== day) return '';   // 2026-02-31
  return `${String(day).padStart(2, '0')}-${MONTHS[month]}-${year}`;
};

export const toInputDate = (value) => {
  const d = parseJobDate(value);
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// A promise only stands while the work is unfinished.
//
// This is the THIRD status list in the app and it is not either of the others:
//   OPEN_STATUSES  (main.js)  - work not finished; drives the daily reminder
//   AGEING_STATUSES (above)   - anything not handed back; includes "done",
//                               because repaired-and-uncollected is how a phone
//                               gets forgotten on a shelf
//   PROMISE_STATUSES (here)   - work not finished, so it excludes "done": the
//                               phone IS ready, the promise was kept, and
//                               telling the shop it is overdue would be a lie.
// It happens to equal OPEN_STATUSES today. scripts/test-job-save.mjs asserts
// that, so if one moves the other has to be considered rather than drift.
export const PROMISE_STATUSES = ['pending', 'progress', 'spare'];

// null when there is nothing to say: no promise, or the work is done.
// Otherwise { days, level }, where days is always positive and level is one of
// overdue / today / tomorrow / later.
export const promiseState = (job, now = new Date()) => {
  if (!job || !PROMISE_STATUSES.includes(job.status)) return null;
  const due = parseJobDate(job.readyBy);
  if (!due) return null;
  const days = daysBetween(now, due);      // positive = still to come
  if (days < 0) return { days: -days, level: 'overdue' };
  if (days === 0) return { days: 0, level: 'today' };
  if (days === 1) return { days: 1, level: 'tomorrow' };
  return { days, level: 'later' };
};

export const promiseText = (state) => {
  if (!state) return '';
  if (state.level === 'overdue') return state.days === 1 ? 'Due yesterday' : `${state.days} days late`;
  if (state.level === 'today') return 'Due today';
  if (state.level === 'tomorrow') return 'Due tomorrow';
  // Shortest wording for the case that least deserves the room: the badge
  // shares its line with the customer's name, and "Due in 12 days" pushed a
  // name into an ellipsis to say something nobody needs to act on today.
  return `In ${state.days} days`;
};

// ---------------------------------------------------------------------------
// The same customer, and the same device, coming back

// Phone numbers are stored however they were typed. Compare on digits alone.
export const digitsOf = (n) => String(n == null ? '' : n).replace(/\D/g, '');

const modelOf = (job) =>
  String((Array.isArray(job?.devices) && job.devices[0]?.model) || job?.model || '')
    .trim().toLowerCase();

// One pass over every job, so a card can ask about its customer in constant
// time. Doing this per card is 500x500 comparisons on each list refresh, which
// would undo the render work that got tab switching from 157ms to 26ms.
export const buildCustomerIndex = (jobs = []) => {
  const index = new Map();
  for (const job of jobs) {
    if (!job || job.isDeleted === true) continue;
    const key = digitsOf(job.number);
    if (!key) continue;
    const list = index.get(key);
    if (list) list.push(job); else index.set(key, [job]);
  }
  return index;
};

// How many OTHER jobs this customer has had.
export const earlierJobCount = (job, index) => {
  if (!job || !index) return 0;
  const list = index.get(digitsOf(job.number));
  if (!list) return 0;
  return list.filter(other => String(other.sn) !== String(job.sn)).length;
};

// The same customer walking in twice for the same phone.
//
// Not a repeat repair - that is a device coming BACK after being collected.
// This is a job being typed in while an identical one is still open, which is
// usually two staff booking the same phone, or the same person saving twice on
// a slow connection. It is the most common way the list stops being trusted.
//
// Returns the open job it clashes with, or null. It never blocks: a customer
// can genuinely bring in two phones. The form warns once and lets the second
// tap through.
export const openDuplicate = (job, index) => {
  if (!job || !index) return null;
  const digits = digitsOf(job.number);
  if (!digits) return null;
  const model = modelOf(job);
  const list = index.get(digits) || [];
  for (const other of list) {
    if (String(other.sn) === String(job.sn)) continue;
    if (!PROMISE_STATUSES.includes(other.status)) continue;   // finished: not a clash
    if (model && modelOf(other) !== model) continue;          // a different phone
    return { sn: other.sn, status: other.status, model: modelOf(other) };
  }
  return null;
};

export const REPEAT_WINDOW = 30;   // days

// The same device, from the same number, already collected within the last
// REPEAT_WINDOW days. That is rework rather than new business, and worth being
// able to see on the card.
export const repeatRepair = (job, index) => {
  if (!job || !index) return null;
  const takenIn = parseJobDate(job.date);
  const model = modelOf(job);
  if (!takenIn || !model) return null;

  const list = index.get(digitsOf(job.number)) || [];
  let closest = null;

  for (const other of list) {
    if (String(other.sn) === String(job.sn)) continue;
    if (other.status !== 'collected') continue;
    if (modelOf(other) !== model) continue;

    // When it went back to the customer, which is the payment date if there is
    // one and the job's own date otherwise.
    const handedOver = parseJobDate(other.paidInfo?.date || other.date);
    if (!handedOver) continue;

    const gap = daysBetween(handedOver, takenIn);
    if (gap < 0 || gap > REPEAT_WINDOW) continue;      // before it, or too long ago
    if (!closest || gap < closest.days) closest = { sn: other.sn, days: gap };
  }
  return closest;
};

// ---------------------------------------------------------------------------
// What the shop took, over more than one day
//
// The Payments page has only ever shown Collected TODAY. At closing time that
// is the number the shop wants; on the first of the month it is useless.
// Everything here is derived from paidInfo.date, which collecting a payment
// already writes, so no record changes and nothing new is stored.
//
// It counts `amount`, the job total, exactly as the existing Collected Today
// card does - so the four figures agree with each other and with the number
// the shop is used to. Where an advance was taken on an earlier day, that
// earlier cash is counted on the day the job was finally collected rather than
// the day it actually came in. Fixing that means recording each payment as it
// happens, which is a bigger change than this and would move a number the shop
// already reads every evening.

// Handed over on this date: the payment date when there is one, else the date
// the job was taken in, which is what the existing card falls back to.
const collectedOn = (job) => parseJobDate(job?.paidInfo?.date || job?.date);

const takingsWhere = (jobs, test) => (jobs || []).reduce((sum, job) => {
  if (!job || job.isDeleted === true || job.status !== 'collected') return sum;
  const when = collectedOn(job);
  if (!when || !test(when)) return sum;
  return sum + (Number(job.amount) || 0);
}, 0);

// today       - this calendar day
// week        - the last 7 calendar days, today included, rolling rather than
//               Monday-to-Sunday: a shop wants "the last week", not "since
//               Monday", and on a Monday the second is nearly empty.
// month       - this calendar month so far
// lastMonth   - the whole of the previous calendar month, for comparison
export const periodTakings = (jobs, now = new Date()) => {
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return {
    today: takingsWhere(jobs, d => daysBetween(d, now) === 0),
    week: takingsWhere(jobs, d => {
      const ago = daysBetween(d, now);
      return ago >= 0 && ago < 7;
    }),
    month: takingsWhere(jobs, d => d >= startOfThisMonth && d <= now),
    lastMonth: takingsWhere(jobs, d => d >= startOfLastMonth && d < startOfThisMonth),
  };
};

// ---------------------------------------------------------------------------
// WhatsApp

// wa.me wants digits with a country code and no plus. The form now holds new
// numbers to ten digits, but a record from any point in the last two years can
// hold whatever was typed, so this refuses rather than guesses.
export const DEFAULT_COUNTRY_CODE = '91';

export const waNumber = (n, cc = DEFAULT_COUNTRY_CODE) => {
  const d = digitsOf(n);
  if (d.length === 10) return cc + d;              // a local number
  if (d.length >= 11 && d.length <= 15) return d;  // already carries a country code
  return null;                                     // too short or too long to dial
};
