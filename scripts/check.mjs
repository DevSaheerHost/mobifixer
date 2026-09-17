#!/usr/bin/env node
/**
 * Repo guard rails. Runs in CI on every push, and locally with `node scripts/check.mjs`.
 *
 *  1. Every .js file parses (ES modules and Cloudflare Workers included).
 *  2. No AI provider secret is committed (Gemini AIza… / Groq gsk_…).
 *     Firebase web apiKeys are public by design and are allow-listed.
 *  3. Each HTML file has balanced <main>/<nav>/<form>/<ul> tags.
 */
import { readFileSync, writeFileSync, unlinkSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, extname } from 'node:path';

const SKIP_DIRS = new Set(['.git', 'node_modules', '.github']);
const root = process.cwd();
let failures = 0;
const fail = (msg) => { console.error('FAIL  ' + msg); failures++; };
const pass = (msg) => console.log('ok    ' + msg);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(root);
const jsFiles = files.filter(f => extname(f) === '.js');
const htmlFiles = files.filter(f => extname(f) === '.html');

// ---- 1. JS syntax -----------------------------------------------------------
for (const f of jsFiles) {
  const rel = f.slice(root.length + 1);
  const src = readFileSync(f, 'utf8');
  // `node --check` treats .js as CommonJS; anything using import/export must be
  // checked as a module, so copy it to a temp .mjs first.
  const isModule = /^\s*(import|export)\s/m.test(src);
  const target = isModule ? f + '.__check.mjs' : f;
  try {
    if (isModule) writeFileSync(target, src);
    execFileSync(process.execPath, ['--check', target], { stdio: 'pipe' });
    pass(rel);
  } catch (e) {
    fail(rel + '\n' + (e.stderr ? e.stderr.toString().trim() : e.message));
  } finally {
    if (isModule) { try { unlinkSync(target); } catch {} }
  }
}

// ---- 2. no leaked AI keys ---------------------------------------------------
const SECRET = /(AIzaSy[0-9A-Za-z_-]{33}|gsk_[0-9A-Za-z]{20,})/g;
for (const f of files) {
  if (!/\.(js|mjs|html|css|json|toml|md)$/.test(f)) continue;
  const rel = f.slice(root.length + 1);
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const hit = line.match(SECRET);
    if (!hit) return;
    // Firebase web config keys are public by design.
    if (/apiKey\s*:/.test(line)) return;
    fail(`possible secret in ${rel}:${i + 1} -> ${hit[0].slice(0, 12)}...`);
  });
}
if (!failures) pass('no AI provider secrets committed');

// ---- 3. HTML tag balance ----------------------------------------------------
for (const f of htmlFiles) {
  const rel = f.slice(root.length + 1);
  const html = readFileSync(f, 'utf8');
  for (const tag of ['main', 'nav', 'form', 'ul']) {
    const open = (html.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;
    const close = (html.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    if (open !== close) fail(`${rel}: <${tag}> ${open} vs </${tag}> ${close}`);
  }
}
if (!failures) pass('HTML tags balanced');

console.log(failures ? `\n${failures} problem(s)` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
