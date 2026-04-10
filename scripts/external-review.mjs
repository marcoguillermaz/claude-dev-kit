#!/usr/bin/env node

/**
 * scripts/external-review.mjs
 *
 * Sends CDK review prompts to 4 LLMs in parallel, collects responses.
 * Prompts are read from .claude/initiatives/external-review-prompt.md (source of truth).
 * API keys are read from .env (gitignored).
 *
 * Usage: node scripts/external-review.mjs
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUTPUT_DIR = join(ROOT, 'docs', 'reviews');
const TIMEOUT_MS = 300_000; // 5 minutes per model

const ATTACHMENT_PATHS = [
  'README.md',
  'packages/cli/templates/tier-m/CLAUDE.md',
  'packages/cli/templates/tier-m/.claude/rules/pipeline.md',
  'packages/cli/templates/common/rules/security.md',
  'packages/cli/templates/tier-m/.claude/skills/security-audit/SKILL.md',
  'packages/cli/templates/tier-m/.claude/skills/perf-audit/SKILL.md',
  'docs/workspace-quality-rubric.md',
  'packages/cli/src/scaffold/index.js',
  'packages/cli/src/generators/claude-md.js',
  'packages/cli/test/integration/run.js',
];

// Per-model config
// OpenAI Tier 1 (30K TPM): compact payload required. Mistral free: compact + retry.
// Gemini free tier has 1M context. Perplexity: no attachments.
const MODEL_CONFIG = {
  openai:     { model: 'gpt-4.1',              maxCharsPerFile: 6000, maxOutputTokens: 4096 },
  gemini:     { model: 'gemini-2.5-pro',        maxCharsPerFile: null, maxOutputTokens: 16384 },
  mistral:    { model: 'mistral-large-latest',  maxCharsPerFile: 6000, maxOutputTokens: 4096 },
  perplexity: { model: 'sonar-pro',             maxCharsPerFile: null, maxOutputTokens: 8192 },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loadEnv() {
  const content = await readFile(join(ROOT, '.env'), 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

async function loadPrompts() {
  const md = await readFile(
    join(ROOT, '.claude', 'initiatives', 'external-review-prompt.md'),
    'utf-8',
  );
  const blocks = [];
  const re = /```\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(md)) !== null) blocks.push(m[1].trim());
  if (blocks.length < 2) throw new Error('Could not extract both prompts from external-review-prompt.md');
  return { codeReview: blocks[0], perplexity: blocks[1] };
}

async function loadAttachments(maxCharsPerFile) {
  const parts = [];
  for (const rel of ATTACHMENT_PATHS) {
    try {
      let content = await readFile(join(ROOT, rel), 'utf-8');
      if (maxCharsPerFile && content.length > maxCharsPerFile) {
        const original = content.length;
        content = content.slice(0, maxCharsPerFile) +
          `\n\n[... truncated at ${maxCharsPerFile} of ${original} chars ...]`;
      }
      parts.push(`\n--- FILE: ${rel} ---\n${content}\n--- END FILE ---`);
    } catch {
      parts.push(`\n--- FILE: ${rel} --- (NOT FOUND)`);
    }
  }
  return parts.join('\n');
}

function timedFetch(url, opts) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry(fn, { name, retries = 1, delayMs = 65_000 }) {
  try {
    return await fn();
  } catch (err) {
    const is429 = err.message?.includes('429') || err.message?.includes('rate_limit');
    if (is429 && retries > 0) {
      console.log(`  ⏳ ${name}: rate limited, retrying in ${delayMs / 1000}s...`);
      await sleep(delayMs);
      return withRetry(fn, { name, retries: retries - 1, delayMs });
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// API callers
// ---------------------------------------------------------------------------

async function callOpenAI(apiKey, prompt, maxTokens, model) {
  const t0 = Date.now();
  const res = await timedFetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  return { text: data.choices[0].message.content, elapsed, model: data.model };
}

async function callGemini(apiKey, prompt, maxTokens, model) {
  const t0 = Date.now();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await timedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`Gemini: unexpected response — ${JSON.stringify(data).slice(0, 500)}`);
  return { text, elapsed, model };
}

async function callMistral(apiKey, prompt, maxTokens, model) {
  const t0 = Date.now();
  const res = await timedFetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`Mistral ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  return { text: data.choices[0].message.content, elapsed, model: data.model };
}

async function callPerplexity(apiKey, prompt, maxTokens, model) {
  const t0 = Date.now();
  const res = await timedFetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`Perplexity ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  let text = data.choices[0].message.content;
  if (data.citations?.length) {
    text += '\n\n---\n## Sources\n';
    data.citations.forEach((url, i) => { text += `${i + 1}. ${url}\n`; });
  }
  return { text, elapsed, model: 'sonar-pro' };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Loading environment and prompts...');
  const [env, prompts] = await Promise.all([loadEnv(), loadPrompts()]);

  const required = ['OPENAI_API_KEY', 'GEMINI_API_KEY', 'MISTRAL_API_KEY', 'PERPLEXITY_API_KEY'];
  const missing = required.filter(k => !env[k]);
  if (missing.length) {
    console.error(`Missing keys in .env: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Build per-model prompts with appropriate truncation
  console.log('Loading attachments...');
  const attachByModel = {};
  const seen = new Set();
  for (const [key, cfg] of Object.entries(MODEL_CONFIG)) {
    const limit = cfg.maxCharsPerFile;
    const cacheKey = limit ?? 'full';
    if (!seen.has(cacheKey)) {
      seen.add(cacheKey);
      attachByModel[cacheKey] = await loadAttachments(limit);
    }
    attachByModel[key] = attachByModel[cacheKey];
  }

  function buildPrompt(key) {
    const truncated = MODEL_CONFIG[key].maxCharsPerFile !== null;
    return `${prompts.codeReview}\n\n## Attached files for review\n\n${attachmentNote(truncated)}${attachByModel[key]}`;
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);

  console.log(`\nSending to 4 models in parallel...\n`);
  for (const [key, cfg] of Object.entries(MODEL_CONFIG)) {
    const mode = cfg.maxCharsPerFile ? `compact (${cfg.maxCharsPerFile} chars/file)` : 'full payload';
    console.log(`  ${key}: ${mode} → ${cfg.model}`);
  }
  console.log();

  const jobs = [
    {
      name: MODEL_CONFIG.openai.model,
      fn: () => withRetry(
        () => callOpenAI(env.OPENAI_API_KEY, buildPrompt('openai'), MODEL_CONFIG.openai.maxOutputTokens, MODEL_CONFIG.openai.model),
        { name: 'openai' },
      ),
    },
    {
      name: MODEL_CONFIG.gemini.model,
      fn: () => withRetry(
        () => callGemini(env.GEMINI_API_KEY, buildPrompt('gemini'), MODEL_CONFIG.gemini.maxOutputTokens, MODEL_CONFIG.gemini.model),
        { name: 'gemini' },
      ),
    },
    {
      name: MODEL_CONFIG.mistral.model,
      fn: () => withRetry(
        () => callMistral(env.MISTRAL_API_KEY, buildPrompt('mistral'), MODEL_CONFIG.mistral.maxOutputTokens, MODEL_CONFIG.mistral.model),
        { name: 'mistral' },
      ),
    },
    {
      name: MODEL_CONFIG.perplexity.model,
      fn: () => callPerplexity(
        env.PERPLEXITY_API_KEY,
        prompts.perplexity,
        MODEL_CONFIG.perplexity.maxOutputTokens,
        MODEL_CONFIG.perplexity.model,
      ),
    },
  ];

  const results = await Promise.allSettled(jobs.map(j => j.fn()));

  const summary = [];
  for (let i = 0; i < jobs.length; i++) {
    const { name } = jobs[i];
    const result = results[i];
    const filename = `${name}-${date}.md`;
    const filepath = join(OUTPUT_DIR, filename);

    if (result.status === 'fulfilled') {
      const { text, elapsed, model } = result.value;
      const header = `# ${name} Review — ${date}\n\n**Model**: ${model} | **Time**: ${elapsed}s\n\n---\n\n`;
      await writeFile(filepath, header + text);
      console.log(`  ✓ ${name} — ${elapsed}s → ${filename}`);
      summary.push({ name, status: 'ok', elapsed });
    } else {
      const errMsg = result.reason?.message || String(result.reason);
      await writeFile(filepath, `# ${name} Review — ${date}\n\nERROR: ${errMsg}\n`);
      console.log(`  ✗ ${name} — ${errMsg.slice(0, 200)}`);
      summary.push({ name, status: 'error', error: errMsg.slice(0, 200) });
    }
  }

  console.log(`\nResults → docs/reviews/`);
  const ok = summary.filter(s => s.status === 'ok').length;
  console.log(`${ok}/${jobs.length} models responded successfully.`);
  if (ok < jobs.length) {
    console.log('Re-run to retry failed models. Successful results are preserved.');
  }
}

function attachmentNote(truncated) {
  if (!truncated) return '';
  return 'Note: some files are truncated to fit token limits. Key structures and patterns are preserved.\n\n';
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
