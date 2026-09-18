#!/usr/bin/env node
/**
 * Regression tests for the AI's cashbook context.
 *
 * Guards the bug where "Total cash in hand today?" answered with the ALL-TIME
 * net (a computed figure) instead of the amount the owner actually counted.
 *
 * Extracts the real aiBuildContext out of cashbook/main.js and runs it, so
 * these assertions track the shipped source rather than a copy.
 *
 *   node scripts/test-ai-context.mjs
 */
import { readFileSync } from 'node:fs';

const SRC = 'cashbook/main.js';
const lines = readFileSync(SRC, 'utf8').split('\n');

const start = lines.findIndex(l => l.startsWith('function aiBuildContext('));
if (start < 0) throw new Error(`${SRC}: aiBuildContext not found`);
let end = -1;
for (let i = start; i < lines.length; i++) if (lines[i] === '}') { end = i; break; }
if (end < 0) throw new Error(`${SRC}: end of aiBuildContext not found`);
const BLOCK = lines.slice(start, end + 1).join('\n');
for (const needed of ['CashInHand(counted)', 'ExpectedCash', 'NOT COUNTED', 'TODAY']) {
  if (!BLOCK.includes(needed)) throw new Error(`extracted aiBuildContext is missing ${needed}`);
}

const isoDate = d => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const aiBuildContext = new Function('isoDate', `${BLOCK}\nreturn aiBuildContext;`)(isoDate);

const TODAY = isoDate(new Date());
const OLD = '2026-01-15';
const e = (date, type, name, cash, gpay = 0) => ({ date, type, name, cash, gpay, staff: '', ts: 1 });

// Mirrors the reported screenshots: today is small, all-time is large.
const entries = [
  e(OLD, 'in', 'Battery', 147789, 49457),   // a big history
  e(OLD, 'out', 'Rent', 29963),
  e(OLD, 'in', 'Opening Balance', 500),
  e(TODAY, 'in', 'Opening Balance', 100),
  e(TODAY, 'in', 'Combo', 2150, 0),
  e(TODAY, 'in', 'Charger', 0, 850),
  e(TODAY, 'out', 'Tea', 50),
];

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok    ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '  -> ' + detail : ''}`); }
};
const todayBlock = ctx => ctx.split('=== DAILY TOTALS')[0];

console.log('\nCash in Hand NOT counted (the reported case)');
{
  const ctx = aiBuildContext({ entries, liquidByDate: {} });
  const today = todayBlock(ctx);
  check('today block says NOT COUNTED YET', /NOT COUNTED YET/.test(today));
  check('today block forbids reporting it as zero', /Do NOT report this as ₹0/.test(today));
  // IN incl OB = 100 + 2150 + 850 = 3100; OUT 50; GPay 850 -> expected cash 2200
  check('expected cash for today is ₹2200', /ExpectedCash ₹2200/.test(today), today.slice(0, 400));
  check('today Income excludes the opening balance (₹3000)', /Income\(excl OB\) ₹3000/.test(today));
  check('today Expenses ₹50', /Expenses ₹50/.test(today));
  check('the all-time net is NOT in the today block', !today.includes('70569') && !today.includes('₹150889'), today.slice(0, 400));
  check('all-time figures are clearly labelled and separate', /=== ALL TIME/.test(ctx));
  check('all-time block tells the model when to use it', /only use this when the user asks for all-time/.test(ctx));
}

console.log('\nCash in Hand counted');
{
  const ctx = aiBuildContext({ entries, liquidByDate: { [TODAY]: { amount: 2000, time: '18:30' } } });
  const today = todayBlock(ctx);
  check('reports the counted figure', /Cash in Hand = ₹2000 \(COUNTED/.test(today), today.slice(0, 500));
  check('flags the ₹200 shortfall', /₹200 SHORT/.test(today), today.slice(0, 500));

  const exact = aiBuildContext({ entries, liquidByDate: { [TODAY]: { amount: 2200, time: '18:30' } } });
  check('says it is exactly right when it matches', /exactly right/.test(todayBlock(exact)));

  const over = aiBuildContext({ entries, liquidByDate: { [TODAY]: { amount: 2500 } } });
  check('flags a surplus too', /₹300 MORE than expected/.test(todayBlock(over)));
}

console.log('\nRange totals must not double-count opening balances');
{
  const ctx = aiBuildContext({ entries, liquidByDate: {} });
  const all = ctx.split('=== ALL TIME')[1];
  // IN incl OB = 147789+49457+500+100+2150+850 = 200846; OUT 30013; GPay 50307; OB 600
  // range expected = 200846 - 30013 - 50307 - 600 = 119926
  check('all-time expected cash subtracts OB', /ExpectedCash ₹119926/.test(all), all.slice(0, 300));
  check('all-time OB is the sum of every day', /OB ₹600/.test(all));
}

console.log('\nPer-day history');
{
  const ctx = aiBuildContext({ entries, liquidByDate: { [OLD]: { amount: 111 } } });
  const daily = ctx.split('=== DAILY TOTALS')[1].split('=== MONTHLY')[0];
  check('daily totals list both days', daily.includes(TODAY) && daily.includes(OLD));
  check('daily lines carry the counted cash', /CashInHand\(counted\): ₹111/.test(daily));
  check('a day with no counted cash says NOT COUNTED', /CashInHand\(counted\): NOT COUNTED/.test(daily));
}

console.log('\nEmpty shop');
{
  const ctx = aiBuildContext({ entries: [], liquidByDate: {} });
  check('does not crash and reports zero expected', /ExpectedCash ₹0/.test(todayBlock(ctx)));
  check('still says cash was not counted', /NOT COUNTED YET/.test(ctx));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
