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
