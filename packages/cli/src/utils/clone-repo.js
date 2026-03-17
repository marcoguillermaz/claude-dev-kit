import { execSync, spawnSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

/**
 * Clone or copy a source repository into the target directory.
 * Supports:
 *   - GitHub URLs: https://github.com/org/repo or github.com/org/repo or org/repo
 *   - Local paths: /absolute/path or ./relative/path or ~/home/path
 */
export async function cloneRepo(source, targetDir) {
  const resolved = resolveSource(source);

  if (resolved.type === 'github') {
    return cloneGitHub(resolved.url, targetDir);
  } else {
    return copyLocal(resolved.path, targetDir);
  }
}

function resolveSource(source) {
  const s = source.trim();

  // Full GitHub URL
  if (s.startsWith('https://github.com/') || s.startsWith('http://github.com/')) {
    return { type: 'github', url: s };
  }

  // Short GitHub URL without protocol
  if (s.startsWith('github.com/')) {
    return { type: 'github', url: `https://${s}` };
  }

  // Short org/repo format (no slashes other than the one separator, no dots in first segment)
  const shortGitHub = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(s);
  if (shortGitHub && !s.startsWith('./') && !s.startsWith('/') && !s.startsWith('~')) {
    return { type: 'github', url: `https://github.com/${s}` };
  }

  // Local path
  const resolved = s.startsWith('~')
    ? path.join(process.env.HOME || '~', s.slice(1))
    : path.resolve(s);

  return { type: 'local', path: resolved };
}

async function cloneGitHub(url, targetDir) {
  // Extract repo name from URL for the folder name
  const repoName = url.split('/').pop().replace(/\.git$/, '');

  await fs.ensureDir(targetDir);

  // Try gh CLI first (respects auth for private repos)
  const ghAvailable = isCommandAvailable('gh');
  if (ghAvailable) {
    const result = spawnSync('gh', ['repo', 'clone', url, targetDir, '--', '--depth=1'], {
      stdio: 'pipe',
      encoding: 'utf8',
    });
    if (result.status === 0) {
      return { name: repoName, path: targetDir, source: url };
    }
  }

  // Fallback to git clone
  const result = spawnSync('git', ['clone', '--depth=1', url, targetDir], {
    stdio: 'pipe',
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(
      `Failed to clone ${url}:\n${result.stderr || result.stdout || 'Unknown error'}\n` +
      `Tip: for private repos, run 'gh auth login' first.`
    );
  }

  return { name: repoName, path: targetDir, source: url };
}

async function copyLocal(srcPath, targetDir) {
  if (!(await fs.pathExists(srcPath))) {
    throw new Error(`Local path not found: ${srcPath}`);
  }

  const repoName = path.basename(srcPath);
  await fs.ensureDir(targetDir);

  // Copy excluding .git, node_modules, and build artifacts
  await fs.copy(srcPath, targetDir, {
    filter: (src) => {
      const rel = path.relative(srcPath, src);
      const skip = ['node_modules', '.git', '.next', 'dist', 'build', '__pycache__', '.venv', 'venv'];
      return !skip.some(s => rel.startsWith(s));
    },
  });

  return { name: repoName, path: targetDir, source: srcPath };
}

function isCommandAvailable(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}
