import fs from 'fs-extra';
import path from 'path';

/**
 * Auto-detect tech stack and project characteristics from a directory.
 * Returns a partial config object with best-guess values.
 */
export async function detectStack(dir) {
  const result = {
    techStack: 'other',
    framework: null,
    testCommand: 'npm test',
    typeCheckCommand: null,
    devCommand: null,
    buildCommand: null,
    installCommand: null,
    suggestedTier: 'm',
    detectedFiles: [],
  };

  const exists = (f) => fs.pathExists(path.join(dir, f));

  // ── Language detection ────────────────────────────────────────────────

  if (await exists('package.json')) {
    const pkg = await fs.readJson(path.join(dir, 'package.json')).catch(() => ({}));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const scripts = pkg.scripts || {};

    result.detectedFiles.push('package.json');
    result.installCommand = 'npm install';

    // TypeScript
    if (await exists('tsconfig.json') || deps['typescript']) {
      result.techStack = 'node-ts';
      result.typeCheckCommand = 'npx tsc --noEmit';
      result.detectedFiles.push('tsconfig.json');
    } else {
      result.techStack = 'node-js';
    }

    // Framework
    if (deps['next']) {
      result.framework = 'Next.js';
      result.devCommand = scripts.dev || 'npm run dev';
      result.buildCommand = scripts.build || 'npm run build';
    } else if (deps['remix'] || deps['@remix-run/node']) {
      result.framework = 'Remix';
      result.devCommand = scripts.dev || 'npm run dev';
      result.buildCommand = scripts.build || 'npm run build';
    } else if (deps['@sveltejs/kit']) {
      result.framework = 'SvelteKit';
      result.devCommand = scripts.dev || 'npm run dev';
      result.buildCommand = scripts.build || 'npm run build';
    } else if (deps['vite']) {
      result.framework = 'Vite';
      result.devCommand = scripts.dev || 'npm run dev';
      result.buildCommand = scripts.build || 'npm run build';
    } else if (deps['express'] || deps['fastify'] || deps['hono']) {
      result.framework = deps['express'] ? 'Express' : deps['fastify'] ? 'Fastify' : 'Hono';
      result.devCommand = scripts.dev || 'node src/index.js';
    }

    // Test framework
    if (deps['vitest']) {
      result.testCommand = 'npx vitest run';
    } else if (deps['jest'] || deps['@jest/core']) {
      result.testCommand = 'npx jest';
    } else if (scripts.test && scripts.test !== 'echo "Error: no test specified"') {
      result.testCommand = 'npm test';
    }

    if (!result.devCommand && scripts.dev) result.devCommand = 'npm run dev';
    if (!result.buildCommand && scripts.build) result.buildCommand = 'npm run build';

    // Complexity hints for tier suggestion
    const fileCount = await countFiles(dir, ['node_modules', '.git', '.next', 'dist', 'build']);
    result.suggestedTier = fileCount > 100 ? 'l' : fileCount > 30 ? 'm' : 's';
  }

  else if (await exists('pyproject.toml') || await exists('requirements.txt') || await exists('setup.py')) {
    result.techStack = 'python';
    result.detectedFiles.push(
      (await exists('pyproject.toml')) ? 'pyproject.toml' :
      (await exists('requirements.txt')) ? 'requirements.txt' : 'setup.py'
    );
    result.installCommand = 'pip install -r requirements.txt';
    result.testCommand = 'pytest';

    if (await exists('manage.py')) {
      result.framework = 'Django';
      result.devCommand = 'python manage.py runserver';
    } else if (await exists('main.py') || await exists('app.py')) {
      result.framework = 'FastAPI / Flask';
      result.devCommand = 'uvicorn main:app --reload';
    }

    const fileCount = await countFiles(dir, ['__pycache__', '.git', 'venv', '.venv', 'node_modules']);
    result.suggestedTier = fileCount > 80 ? 'l' : fileCount > 20 ? 'm' : 's';
  }

  else if (await exists('go.mod')) {
    result.techStack = 'go';
    result.detectedFiles.push('go.mod');
    result.installCommand = 'go mod download';
    result.testCommand = 'go test ./...';
    result.buildCommand = 'go build ./...';
    result.devCommand = 'go run .';

    const fileCount = await countFiles(dir, ['.git', 'vendor']);
    result.suggestedTier = fileCount > 60 ? 'l' : fileCount > 15 ? 'm' : 's';
  }

  else if (await exists('Cargo.toml')) {
    result.techStack = 'other';
    result.framework = 'Rust';
    result.detectedFiles.push('Cargo.toml');
    result.installCommand = 'cargo build';
    result.testCommand = 'cargo test';
    result.buildCommand = 'cargo build --release';
    result.devCommand = 'cargo run';
  }

  return result;
}

async function countFiles(dir, excludeDirs = []) {
  let count = 0;
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (excludeDirs.includes(entry.name)) continue;
      if (entry.isDirectory()) {
        count += await countFiles(path.join(dir, entry.name), excludeDirs);
      } else {
        count++;
      }
    }
  } catch {}
  return count;
}
