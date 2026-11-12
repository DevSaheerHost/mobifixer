#!/usr/bin/env node
/**
 * Read a Firebase Realtime Database rules file.
 *
 * The files are JSON with // line comments, which is what Firebase's own
 * parser takes and what JSON.parse does not. Comments are not a nicety here:
 * Firebase accepts exactly one top-level property, "rules", and treats every
 * key inside it as a child node, so a "//": "..." entry is rejected outright
 * - "Expected '{'". A comment has to be a // line or not exist.
 *
 * Strings are respected, so a // inside a rule expression survives.
 */
import { readFileSync } from 'node:fs';

export const stripComments = (src) => {
  let out = '', inString = false, escaped = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inString) {
      out += c;
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') { inString = true; out += c; continue; }
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      out += '\n';
      continue;
    }
    out += c;
  }
  return out;
};

export const readRules = (file) => JSON.parse(stripComments(readFileSync(file, 'utf8')));

/**
 * What Firebase will refuse to load. Checked by the tests so a rules file
 * cannot be committed in a shape the console rejects.
 */
export const rulesFileProblems = (file) => {
  const doc = readRules(file);
  const problems = [];
  const top = Object.keys(doc);
  if (top.length !== 1 || top[0] !== 'rules') {
    problems.push(`top level must be exactly {"rules": ...}, found: ${top.join(', ')}`);
  }
  const walk = (node, path) => {
    if (node === null || typeof node !== 'object' || Array.isArray(node)) return;
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith('//')) {
        problems.push(`${path || 'rules'} > "${k}": Firebase reads this as a child node, not a comment`);
      } else if (!k.startsWith('.')) {
        if (typeof v !== 'object' || v === null) {
          problems.push(`${path || 'rules'} > "${k}": a child must be an object, found ${typeof v}`);
        } else walk(v, `${path}/${k}`);
      }
    }
  };
  if (doc.rules) walk(doc.rules, '');
  return problems;
};
