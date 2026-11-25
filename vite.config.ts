import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/** The deployed version: semver from package.json plus the git commit it was built from. */
function buildInfo() {
  const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };
  let commit = process.env.COMMIT_REF ?? ''; // set by Netlify builds
  if (!commit) {
    try {
      commit = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {
      commit = 'unknown';
    }
  }
  return { version, commit: commit.slice(0, 7), builtAt: new Date().toISOString() };
}

const info = buildInfo();

/** Publishes /version.json so the live version can be checked without opening the app. */
function versionFile(): Plugin {
  return {
    name: 'megatracker-version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify(info, null, 2) + '\n' });
    },
  };
}

export default defineConfig({
  plugins: [react(), versionFile()],
  define: {
    __APP_VERSION__: JSON.stringify(info.version),
    __APP_COMMIT__: JSON.stringify(info.commit),
    __APP_BUILT_AT__: JSON.stringify(info.builtAt),
  },
  test: {
    environment: 'node',
  },
});
