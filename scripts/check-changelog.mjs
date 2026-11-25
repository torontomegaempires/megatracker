#!/usr/bin/env node
// Fails if a pull request adds CHANGELOG.md lines outside the [Unreleased] section.
//
// A release renames [Unreleased] to the new version, so an entry written on a branch
// cut before that release merges cleanly into the released section. CI runs this on
// the PR's merge commit, which is what main would look like after merging.
//
// Usage: node scripts/check-changelog.mjs <base-ref>   (CI passes HEAD^1)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const FILE = 'CHANGELOG.md';
const base = process.argv[2];
if (!base) {
  console.error('Usage: node scripts/check-changelog.mjs <base-ref>');
  process.exit(1);
}

const diff = execFileSync('git', ['diff', '--unified=0', base, 'HEAD', '--', FILE], { encoding: 'utf8' });
const lines = readFileSync(FILE, 'utf8').split('\n');

// Line numbers (1-based) the PR adds to the file.
const added = [];
for (const hunk of diff.matchAll(/^@@ -\S+ \+(\d+)(?:,(\d+))? @@/gm)) {
  const start = Number(hunk[1]);
  const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
  for (let n = start; n < start + count; n++) added.push(n);
}

// The [Unreleased] section runs from its heading to the next version heading.
const head = lines.findIndex((l) => l.startsWith('## [Unreleased]')) + 1;
if (head === 0) {
  console.error(`${FILE} has no "## [Unreleased]" heading.`);
  process.exit(1);
}
const next = lines.findIndex((l, i) => i >= head && l.startsWith('## ['));
const end = next === -1 ? lines.length : next; // last line number in the section

const misplaced = added.filter((n) => (n <= head || n > end) && lines[n - 1].trim() !== '');
if (misplaced.length) {
  console.error(`${FILE}: these added lines are outside the [Unreleased] section:\n`);
  for (const n of misplaced) console.error(`  ${n}: ${lines[n - 1]}`);
  console.error(
    '\nA release has probably renamed [Unreleased] since this branch was cut.' +
      '\nRebase onto main and move the entries back under [Unreleased].',
  );
  process.exit(1);
}
console.log(`${FILE}: ${added.length ? 'all added lines are under [Unreleased].' : 'unchanged.'}`);
