#!/usr/bin/env node
// Opens a release pull request: bumps package.json, dates the Unreleased section of
// CHANGELOG.md, and commits "Release vX.Y.Z" on a release/vX.Y.Z branch cut from origin/main.
// Merging the PR deploys it, and the Tag release workflow tags vX.Y.Z on main.
//
// Usage: node scripts/release.mjs patch|minor|major
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const bump = process.argv[2];
if (!['patch', 'minor', 'major'].includes(bump)) {
  console.error('Usage: node scripts/release.mjs patch|minor|major');
  process.exit(1);
}

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], ...opts }).trim();
const show = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' });

if (run('git', ['status', '--porcelain'])) {
  console.error('Commit or stash your changes first; the release branch is cut from origin/main.');
  process.exit(1);
}

run('git', ['fetch', 'origin', 'main']);
const changelogOnMain = run('git', ['show', 'origin/main:CHANGELOG.md']);
const unreleased = changelogOnMain.match(/## \[Unreleased\]\n([\s\S]*?)(?=\n## \[)/);
if (!unreleased || !unreleased[1].trim()) {
  console.error('CHANGELOG.md on main has nothing under [Unreleased]. Merge the changes, with changelog entries, first.');
  process.exit(1);
}

const [major, minor, patch] = JSON.parse(run('git', ['show', 'origin/main:package.json'])).version.split('.').map(Number);
const version =
  bump === 'major' ? `${major + 1}.0.0` : bump === 'minor' ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;
const branch = `release/v${version}`;

show('git', ['switch', '-c', branch, 'origin/main']);
show('npm', ['test']);
show('npm', ['run', 'typecheck']);
show('npm', ['version', version, '--no-git-tag-version']);

const today = new Date().toISOString().slice(0, 10);
const changelog = readFileSync('CHANGELOG.md', 'utf8').replace('## [Unreleased]\n', `## [Unreleased]\n\n## [${version}] - ${today}\n`);
writeFileSync('CHANGELOG.md', changelog);

show('git', ['add', 'package.json', 'package-lock.json', 'CHANGELOG.md']);
show('git', ['commit', '-m', `Release v${version}`]);
show('git', ['push', '-u', 'origin', branch]);
show('gh', ['pr', 'create', '--title', `Release v${version}`, '--body', `Release v${version}.\n\n${unreleased[1].trim()}\n`]);
