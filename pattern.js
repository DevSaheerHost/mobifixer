// Unlock patterns: reading them, writing them, and drawing them.
//
// The lock field on a job takes a PIN, a password or a pattern. A pattern typed
// as words ("L shape", "starts top left") is not something the next person can
// act on, so the form lets you draw one and stores it as plain text -
// "Pattern 1-4-7-8-9" - because that field already holds free text on 1248
// existing records and is read straight out onto the card and the receipt.
//
// This module is the single place that knows that format. main.js uses it for
// the drawing pad and the fullscreen viewer; cardLayout.js uses it to show a
// pattern on the job card as a picture instead of a row of digits. It has no
// DOM dependencies and no imports, so scripts/test-job-save.mjs imports it
// directly rather than lifting the functions out of main.js by string match.
//
// Dots are numbered the way every Android device numbers them:
//     1 2 3
//     4 5 6
//     7 8 9

export const PATTERN_MIN = 4;          // what Android itself enforces

// Centres in the SVG's own 300x300 space, so a line never has to be measured
// against the DOM - it stretches with whatever box the <svg> is given.
export const dotXY = (n) => ({ x: 50 + ((n - 1) % 3) * 100, y: 50 + Math.floor((n - 1) / 3) * 100 });

// "Pattern 1-4-7-8-9" -> [1,4,7,8,9]. Anything else -> null, including a PIN
// that happens to be digits, so an existing lock is never mistaken for one.
export const parsePattern = (value) => {
  const text = String(value == null ? '' : value);
  if (!/^\s*pattern\b/i.test(text)) return null;
  const dots = (text.replace(/^\s*pattern\b/i, '').match(/[1-9]/g) || []).map(Number);
  if (dots.length < PATTERN_MIN || dots.length > 9) return null;
  if (new Set(dots).size !== dots.length) return null;
  return dots;
};

export const formatPattern = (dots) => 'Pattern ' + dots.join('-');

// The dot a straight drag from `a` to `b` passes over, or 0 if it passes over
// none. 1 to 3 goes through 2 and 1 to 9 goes through 5, the same as on a phone;
// 1 to 5 and 2 to 7 are single steps and go through nothing.
export const dotBetween = (a, b) => {
  const ra = Math.floor((a - 1) / 3), ca = (a - 1) % 3;
  const rb = Math.floor((b - 1) / 3), cb = (b - 1) % 3;
  if ((ra + rb) % 2 || (ca + cb) % 2) return 0;
  const mid = ((ra + rb) / 2) * 3 + (ca + cb) / 2 + 1;
  return mid === a || mid === b ? 0 : mid;
};

export const pointsFor = (dots) =>
  dots.map(n => { const p = dotXY(n); return `${p.x},${p.y}`; }).join(' ');

// One renderer behind the thumbnail under the form field, the small picture on
// a job card, and the full-size view.
//
// `detailed` adds what a still picture of a pattern otherwise loses: where to
// start, and which way round. 1-4-7 and 7-4-1 draw the identical line.
//
// It does that with a ring on the first dot and an arrow along each segment,
// NOT by numbering the dots 1..n - that was the first attempt and it read
// badly, because the caption underneath lists grid positions (1-2-3-6-9) and
// the dots would have been carrying step numbers (1-2-3-4-5). The same dot
// wearing two different numbers is worse than no numbers at all.
//
// Every value interpolated here is an integer 1-9 that parsePattern has already
// validated, so nothing a customer typed can reach this markup.
export const patternSvg = (dots, { detailed = false } = {}) => {
  const on = (n) => dots.includes(n);
  const r = detailed ? 22 : 20;

  const circle = (n) => {
    const p = dotXY(n);
    return `<circle cx="${p.x}" cy="${p.y}" r="${on(n) ? r : 11}" class="${on(n) ? 'on' : ''}" />`;
  };

  // A ring around the dot the finger starts on.
  const startRing = () => {
    if (!detailed || !dots.length) return '';
    const p = dotXY(dots[0]);
    return `<circle cx="${p.x}" cy="${p.y}" r="${r + 12}" class="start-ring" />`;
  };

  // A triangle at the midpoint of each segment, turned to face along it.
  const arrows = () => {
    if (!detailed) return '';
    let out = '';
    for (let i = 1; i < dots.length; i++) {
      const a = dotXY(dots[i - 1]), b = dotXY(dots[i]);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const deg = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
      out += `<path d="M -9 -9 L 11 0 L -9 9 Z" class="arrow"`
           + ` transform="translate(${mx.toFixed(1)} ${my.toFixed(1)}) rotate(${deg.toFixed(1)})" />`;
    }
    return out;
  };

  return `<svg viewBox="0 0 300 300" aria-hidden="true" focusable="false">`
       + `<polyline points="${pointsFor(dots)}" />`
       + arrows()
       + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(circle).join('')
       + startRing()
       + `</svg>`;
};

// How a pattern reads in prose: "1 – 4 – 7 – 8 – 9".
export const patternText = (dots) => dots.join(' – ');
