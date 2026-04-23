import fs from 'fs-extra';
import path from 'path';
import { TIER_THRESHOLDS, suggestTier } from './tier-suggestion.js';

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

  // Find a directory whose name ends with the given suffix; returns the name or null
  const findDirEndingWith = async (suffix) => {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const match = entries.find((e) => e.isDirectory() && e.name.endsWith(suffix));
      return match ? match.name : null;
    } catch {
      return null;
    }
  };

  // Check if any file in dir matches a predicate on its name
  const existsFileMatching = async (predicate) => {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      return entries.some((e) => e.isFile() && predicate(e.name));
    } catch {
      return false;
    }
  };

  // ── Language detection ────────────────────────────────────────────────

  if (await exists('package.json')) {
    const pkg = await fs.readJson(path.join(dir, 'package.json')).catch(() => ({}));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const scripts = pkg.scripts || {};

    result.detectedFiles.push('package.json');
    result.installCommand = 'npm install';

    // TypeScript
    if ((await exists('tsconfig.json')) || deps['typescript']) {
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
    result.suggestedTier = suggestTier(fileCount, TIER_THRESHOLDS.nodeWeb);
  } else if (
    (await exists('pyproject.toml')) ||
    (await exists('requirements.txt')) ||
    (await exists('setup.py'))
  ) {
    result.techStack = 'python';
    result.detectedFiles.push(
      (await exists('pyproject.toml'))
        ? 'pyproject.toml'
        : (await exists('requirements.txt'))
          ? 'requirements.txt'
          : 'setup.py',
    );
    result.installCommand = 'pip install -r requirements.txt';
    result.testCommand = 'pytest';

    if (await exists('manage.py')) {
      result.framework = 'Django';
      result.devCommand = 'python manage.py runserver';
    } else if ((await exists('main.py')) || (await exists('app.py'))) {
      result.framework = 'FastAPI / Flask';
      result.devCommand = 'uvicorn main:app --reload';
    }

    const fileCount = await countFiles(dir, [
      '__pycache__',
      '.git',
      'venv',
      '.venv',
      'node_modules',
    ]);
    result.suggestedTier = suggestTier(fileCount, TIER_THRESHOLDS.medium);
  } else if (await exists('go.mod')) {
    result.techStack = 'go';
    result.detectedFiles.push('go.mod');
    result.installCommand = 'go mod download';
    result.testCommand = 'go test ./...';
    result.buildCommand = 'go build ./...';
    result.devCommand = 'go run .';

    const fileCount = await countFiles(dir, ['.git', 'vendor']);
    result.suggestedTier = suggestTier(fileCount, TIER_THRESHOLDS.compact);
  } else if (await exists('Gemfile')) {
    result.techStack = 'ruby';
    result.detectedFiles.push('Gemfile');
    result.installCommand = 'bundle install';
    result.testCommand = 'bundle exec rspec';
    result.buildCommand = 'bundle exec rake assets:precompile';
    result.devCommand = 'bundle exec rails server';

    const fileCount = await countFiles(dir, ['.git', '.bundle', 'tmp', 'log']);
    result.suggestedTier = suggestTier(fileCount, TIER_THRESHOLDS.medium);
  } else if (await exists('pom.xml')) {
    result.techStack = 'java';
    result.detectedFiles.push('pom.xml');
    result.installCommand = 'mvn install';
    result.testCommand = 'mvn test';
    result.buildCommand = 'mvn package';
    result.devCommand = 'mvn exec:java';

    const fileCount = await countFiles(dir, ['.git', 'target']);
    result.suggestedTier = suggestTier(fileCount, TIER_THRESHOLDS.medium);
  } else if ((await exists('build.gradle.kts')) || (await exists('AndroidManifest.xml'))) {
    result.techStack = 'kotlin';
    result.detectedFiles.push(
      (await exists('build.gradle.kts')) ? 'build.gradle.kts' : 'AndroidManifest.xml',
    );
    result.installCommand = './gradlew dependencies';
    result.testCommand = './gradlew test';
    result.buildCommand = './gradlew build';
    result.devCommand = './gradlew run';

    const fileCount = await countFiles(dir, ['.git', 'build', '.gradle']);
    result.suggestedTier = suggestTier(fileCount, TIER_THRESHOLDS.medium);
  } else if (await exists('build.gradle')) {
    // Java via Gradle (non-Kotlin) - build.gradle.kts already caught above
    result.techStack = 'java';
    result.detectedFiles.push('build.gradle');
    result.installCommand = './gradlew dependencies';
    result.testCommand = './gradlew test';
    result.buildCommand = './gradlew build';
    result.devCommand = './gradlew run';

    const fileCount = await countFiles(dir, ['.git', 'build', '.gradle']);
    result.suggestedTier = suggestTier(fileCount, TIER_THRESHOLDS.compact);
  } else if (await exists('Package.swift')) {
    result.techStack = 'swift';
    result.detectedFiles.push('Package.swift');
    result.installCommand = 'swift package resolve';
    result.testCommand = 'swift test';
    result.buildCommand = 'swift build -c release';
    result.devCommand = 'swift run';

    const fileCount = await countFiles(dir, ['.git', '.build']);
    result.suggestedTier = suggestTier(fileCount, TIER_THRESHOLDS.medium);
  } else if ((await findDirEndingWith('.xcodeproj')) || (await findDirEndingWith('.xcworkspace'))) {
    result.techStack = 'swift';
    const detected =
      (await findDirEndingWith('.xcodeproj')) || (await findDirEndingWith('.xcworkspace'));
    result.detectedFiles.push(detected);
    result.testCommand = 'xcodebuild test';
    result.buildCommand = 'xcodebuild build';
    result.devCommand = '';
    result.installCommand = '';

    const fileCount = await countFiles(dir, ['.git', 'build', 'DerivedData']);
    result.suggestedTier = suggestTier(fileCount, TIER_THRESHOLDS.medium);
  } else if (
    (await existsFileMatching((n) => n.endsWith('.csproj'))) ||
    (await existsFileMatching((n) => n.endsWith('.sln')))
  ) {
    result.techStack = 'dotnet';
    result.detectedFiles.push('*.csproj / *.sln');
    result.installCommand = 'dotnet restore';
    result.testCommand = 'dotnet test';
    result.buildCommand = 'dotnet build';
    result.devCommand = 'dotnet run';

    const fileCount = await countFiles(dir, ['.git', 'bin', 'obj']);
    result.suggestedTier = suggestTier(fileCount, TIER_THRESHOLDS.medium);
  } else if (await exists('Cargo.toml')) {
    result.techStack = 'rust';
    result.detectedFiles.push('Cargo.toml');
    result.installCommand = 'cargo build';
    result.testCommand = 'cargo test';
    result.buildCommand = 'cargo build --release';
    result.devCommand = 'cargo run';

    const fileCount = await countFiles(dir, ['.git', 'target']);
    result.suggestedTier = suggestTier(fileCount, TIER_THRESHOLDS.compact);
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
