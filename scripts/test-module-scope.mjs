#!/usr/bin/env node
/**
 * Does anything call a function it cannot see?
 *
 * The bug this exists for: showUpdateSheet, closeUpdateSheet and
 * showExitConfirm are all declared INSIDE watchReminders(), not at module
 * scope. Every other caller lives in there too, so they worked for months.
 * watchAdminControls, added at module scope, called one of them and threw
 * ReferenceError - but only on the path where an admin had actually sent a
 * message, so every suite passed and `node --check` passed and it reached
 * the live website.
 *
 * Nothing in the suite could catch that, because it is not a syntax error
 * and not a logic error: it is a scope error, and scope needs a parser.
 *
 * The rule: a function declared inside another function may only be named
 * from inside that same function.
 */
import { readFileSync, existsSync } from 'node:fs';
import { parse } from 'acorn';

const FILES = [
  'main.js', 'native.js', 'presence.js', 'shopControls.js', 'nativeLogic.js',
  'cardLayout.js', 'jobMeta.js', 'pattern.js', 'searchCard.js', 'inventoryCard.js',
  'searchPouchCard.js', 'generateWhatsappLink.js', 'data.js',
  'auth/main.js', 'auth/get-app.js',
  'admin/main.js', 'admin/dashboard.js',
];

let pass = 0, fail = 0;
const ck = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  ok    ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '\n          ' + extra : '')); }
};

/** Walk every child node, carrying the chain of enclosing functions. */
const walk = (node, fns, visit) => {
  if (!node || typeof node.type !== 'string') return;
  visit(node, fns);
  const isFn = /^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(node.type);
  const next = isFn ? [...fns, node] : fns;

  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') continue;
    // Not references: a.b, {b: 1}, function f(param), import { x }.
    if (node.type === 'MemberExpression' && key === 'property' && !node.computed) continue;
    if (node.type === 'Property' && key === 'key' && !node.computed && !node.shorthand) continue;
    if (node.type === 'Property' && key === 'key' && node.shorthand) continue;
    if (isFn && key === 'params') continue;
    if (isFn && key === 'id') continue;
    if (node.type === 'VariableDeclarator' && key === 'id') continue;
    if (/^Import(Specifier|DefaultSpecifier|NamespaceSpecifier)$/.test(node.type)) continue;
    if (node.type === 'LabeledStatement' && key === 'label') continue;

    const v = node[key];
    if (Array.isArray(v)) v.forEach(c => walk(c, next, visit));
    else walk(v, next, visit);
  }
};

const analyse = (file) => {
  const ast = parse(readFileSync(file, 'utf8'),
    { ecmaVersion: 'latest', sourceType: 'module', locations: true });

  // Functions declared inside another function, by name.
  const nested = new Map();
  const counts = new Map();
  walk(ast, [], (node, fns) => {
    if (node.type !== 'FunctionDeclaration' || !node.id) return;
    counts.set(node.id.name, (counts.get(node.id.name) || 0) + 1);
    if (fns.length) nested.set(node.id.name, { owner: fns[fns.length - 1], line: node.loc.start.line });
  });

  // Anything naming one of them from outside its owner.
  const bad = [];
  walk(ast, [], (node, fns) => {
    if (node.type !== 'Identifier') return;
    const hit = nested.get(node.name);
    if (!hit) return;
    if (counts.get(node.name) !== 1) return;          // shadowed; too subtle to judge here
    if (node.loc.start.line === hit.line) return;     // the declaration itself
    if (fns.includes(hit.owner)) return;              // inside its owner: fine
    bad.push(`${file}:${node.loc.start.line} uses ${node.name}(), declared inside `
      + `${hit.owner.id ? hit.owner.id.name : 'an anonymous function'} at line ${hit.line}`);
  });
  return { nested, bad };
};

console.log('\nNothing names a function it cannot see');
let allBad = [];
for (const f of FILES) {
  if (!existsSync(f)) continue;
  const { bad } = analyse(f);
  allBad = allBad.concat(bad);
  ck(f, bad.length === 0, bad.join('\n          '));
}

console.log('\nThe checker itself works');
{
  // A file that makes the exact mistake, so a silent checker cannot pass.
  const { writeFileSync, rmSync, mkdtempSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const dir = mkdtempSync(join(tmpdir(), 'scope-'));
  const probe = join(dir, 'probe.js');

  writeFileSync(probe, `
    function outer() {
      function inner() { return 1; }
      return inner();
    }
    function elsewhere() { return inner(); }
  `);
  ck('it catches a call from outside', analyse(probe).bad.length === 1);

  writeFileSync(probe, `
    function outer() {
      function inner() { return 1; }
      return inner();
    }
  `);
  ck('  and passes when the call is inside', analyse(probe).bad.length === 0);

  writeFileSync(probe, `
    function top() { return 1; }
    function other() { return top(); }
  `);
  ck('  a module-level function is callable anywhere', analyse(probe).bad.length === 0);

  // obj.inner is a property, not the nested function.
  writeFileSync(probe, `
    function outer() { function inner() {} return inner(); }
    const o = { inner: 1 };
    const x = o.inner;
  `);
  ck('  a property of the same name is not a call', analyse(probe).bad.length === 0);

  rmSync(dir, { recursive: true, force: true });
}

console.log('\nWhat is still nested, recorded rather than ignored');
{
  // Not a failure: these work because everything that uses them is in there
  // too. Listed so the next person adding module-level code knows which
  // names are not available to them.
  const { nested } = analyse('main.js');
  const names = [...nested.keys()].sort();
  console.log('  main.js declares these inside other functions:');
  for (const n of names) console.log(`    ${n}  (inside ${nested.get(n).owner.id?.name || 'anonymous'})`);
  ck('the update sheet is known to be nested',
     names.includes('showUpdateSheet') && names.includes('showExitConfirm'));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
