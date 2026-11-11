#!/usr/bin/env node
/**
 * Generate the Android launcher and notification icons from this project's own
 * artwork, at every density Android asks for.
 *
 * This exists as a script rather than a one-off because the per-shop build
 * runs it too: a shop supplies its own square logo, CI points this at that
 * file, and their APK carries their icon. Same code path, so the branded build
 * cannot drift from the default one.
 *
 *   node scripts/android-icons.mjs
 *   node scripts/android-icons.mjs --icon path/to/shop-logo.png --name "Raheem Mobiles"
 *
 * Two different kinds of icon, and they are not interchangeable:
 *
 *   LAUNCHER  full colour, full bleed. Android masks it to whatever shape the
 *             launcher uses, so anything in the outer ~18% can be clipped.
 *
 *   SMALL / STATUS BAR  Android throws the colour away and paints every
 *             non-transparent pixel white. An image with no alpha therefore
 *             renders as a solid white square. It has to be a single-colour
 *             silhouette on transparency, which assets/images/badge-96.png is.
 *             If a shop supplies no such mark, this keeps the Mobifixer one
 *             rather than making a white block out of their logo.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const argOf = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const root = process.cwd();
const res = join(root, 'android/app/src/main/res');
const source = argOf('--icon', 'assets/images/icon-512.png');
const badge = argOf('--badge', 'assets/images/badge-96.png');

if (!existsSync(source)) {
  console.error(`No such icon: ${source}`);
  process.exit(1);
}
if (!existsSync(res)) {
  console.error(`No android/ project yet. Run: npx cap add android`);
  process.exit(1);
}

const im = (...a) => execFileSync('convert', a, { stdio: ['ignore', 'pipe', 'pipe'] });

// mdpi is the 1x baseline; the rest are the standard multipliers.
const LAUNCHER = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const STATUS   = { mdpi: 24, hdpi: 36, xhdpi: 48, xxhdpi: 72, xxxhdpi: 96 };

// The square the launcher's mask can safely show. Android's adaptive icon is
// 108dp with the middle 72dp guaranteed visible: 2/3. Anything outside it is
// at the mercy of the device's icon shape.
const SAFE = 72 / 108;

let made = 0;
for (const [density, px] of Object.entries(LAUNCHER)) {
  const dir = join(res, `mipmap-${density}`);
  mkdirSync(dir, { recursive: true });

  // Legacy square and round icons: the source, resized. Pre-Android-8 devices
  // and some launchers still use these.
  im(source, '-resize', `${px}x${px}!`, join(dir, 'ic_launcher.png'));
  im(source, '-resize', `${px}x${px}!`, join(dir, 'ic_launcher_round.png'));

  // Adaptive foreground: the same artwork, scaled into the safe square and
  // padded with transparency so the launcher's mask crops padding rather than
  // the logo. Nothing is drawn that was not in the source.
  const inner = Math.round(px * SAFE);
  im(source, '-resize', `${inner}x${inner}!`,
     '-background', 'none', '-gravity', 'center', '-extent', `${px}x${px}`,
     join(dir, 'ic_launcher_foreground.png'));
  made += 3;

  // Status bar icon: alpha only. -alpha extract throws the colour away and
  // keeps the shape, then it is painted white - which is exactly what Android
  // itself does, so what ships is what will be seen.
  if (existsSync(badge)) {
    const s = STATUS[density];
    const dd = join(res, `drawable-${density}`);
    mkdirSync(dd, { recursive: true });
    im(badge, '-resize', `${s}x${s}`, '-background', 'none',
       '-gravity', 'center', '-extent', `${s}x${s}`,
       // RGB forced to white, alpha left exactly as it was. Android ignores
       // the colour and paints the alpha, so this ships what will be seen.
       // An earlier version extracted the alpha and negated it, which punched
       // the mark OUT of a white block - the solid-white-square failure, with
       // a hole in it.
       '-fill', 'white', '-colorize', '100',
       join(dd, 'ic_stat_notify.png'));
    made += 1;
  }
}

// The adaptive icon's background layer. A flat colour sampled from the source's
// own corner, so the plate behind the logo is the colour the logo was drawn on
// rather than something chosen here.
const corner = im(source, '-format', '%[hex:p{2,2}]', 'info:').toString().trim();
const hex = '#' + (corner.length >= 6 ? corner.slice(0, 6) : '000000');

const valuesDir = join(res, 'values');
mkdirSync(valuesDir, { recursive: true });
execFileSync('bash', ['-c', `cat > ${JSON.stringify(join(valuesDir, 'ic_launcher_background.xml'))} <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Sampled from the icon's own corner by scripts/android-icons.mjs. -->
    <color name="ic_launcher_background">${hex}</color>
</resources>
XML`]);

for (const name of ['ic_launcher', 'ic_launcher_round']) {
  const dir = join(res, 'mipmap-anydpi-v26');
  mkdirSync(dir, { recursive: true });
  execFileSync('bash', ['-c', `cat > ${JSON.stringify(join(dir, name + '.xml'))} <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
XML`]);
}

// Capacitor's template ships a background PNG per density that the XML above
// replaces with a flat colour. Left behind it is dead weight in every APK.
for (const density of Object.keys(LAUNCHER)) {
  const stale = join(res, `mipmap-${density}`, 'ic_launcher_background.png');
  if (existsSync(stale)) { rmSync(stale); }
}

console.log(`Icons written from ${source}`);
console.log(`  ${made} images across ${Object.keys(LAUNCHER).length} densities`);
console.log(`  adaptive background ${hex}, sampled from the source`);
console.log(`  status bar icon from ${existsSync(badge) ? badge : '(none - kept what was there)'}`);

// ---------------------------------------------------------------------------
// The splash screen
//
// Capacitor's template ships its own blue logo on white. Left alone it is the
// first thing a shop sees every time they open the app - someone else's brand,
// on their phone, under their shop's name. Replaced here with the same icon
// this script was given, centred on the colour sampled from it, at exactly the
// sizes the template declared so no density is left behind.
const SPLASH = {
  'drawable':             [480, 320],
  'drawable-port-mdpi':   [320, 480],
  'drawable-port-hdpi':   [480, 800],
  'drawable-port-xhdpi':  [720, 1280],
  'drawable-port-xxhdpi': [960, 1600],
  'drawable-port-xxxhdpi': [1280, 1920],
  'drawable-land-mdpi':   [480, 320],
  'drawable-land-hdpi':   [800, 480],
  'drawable-land-xhdpi':  [1280, 720],
  'drawable-land-xxhdpi': [1600, 960],
  'drawable-land-xxxhdpi': [1920, 1280],
};

let splashes = 0;
for (const [dir, [w, h]] of Object.entries(SPLASH)) {
  const target = join(res, dir, 'splash.png');
  if (!existsSync(join(res, dir))) mkdirSync(join(res, dir), { recursive: true });
  // A third of the short edge: big enough to read, small enough that the
  // launcher's own window animation does not crop it on a tall screen.
  const logo = Math.round(Math.min(w, h) / 3);
  im('-size', `${w}x${h}`, `xc:${hex}`,
     '(', source, '-resize', `${logo}x${logo}`, ')',
     '-gravity', 'center', '-composite', target);
  splashes++;
}
console.log(`  ${splashes} splash screens on ${hex}, replacing Capacitor's own logo`);

const name = argOf('--name', null);
if (name) {
  const strings = join(res, 'values', 'strings.xml');
  execFileSync('bash', ['-c',
    `sed -i 's|<string name="app_name">[^<]*</string>|<string name="app_name">${name}</string>|; `
    + `s|<string name="title_activity_main">[^<]*</string>|<string name="title_activity_main">${name}</string>|' `
    + JSON.stringify(strings)]);
  console.log(`  launcher name set to "${name}"`);
}
