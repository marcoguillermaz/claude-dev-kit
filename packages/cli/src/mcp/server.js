#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = resolve(__dirname, '..', 'index.js');

function readPackageVersion() {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', '..', 'package.json'), 'utf8'));
  return pkg.version;
}

function getCwd() {
  return process.env.CDK_PROJECT_ROOT || process.cwd();
}

function safeReadJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    return { _error: `parse failed: ${err.message}` };
  }
}

function buildToolReply(payload) {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
  };
}

function runDoctorReport(cwd) {
  try {
    const stdout = execFileSync('node', [CLI_PATH, 'doctor', '--report'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return JSON.parse(stdout);
  } catch (err) {
    const stdout = (err.stdout || '').toString();
    if (stdout.trim().startsWith('{')) {
      try {
        return JSON.parse(stdout);
      } catch {
        // fall through
      }
    }
    return {
      _error: 'doctor invocation failed',
      message: err.message,
      stdout: stdout.slice(0, 2000),
    };
  }
}

function readTeamSettings(cwd) {
  const file = join(cwd, '.claude', 'team-settings.json');
  if (!existsSync(file)) return { present: false, settings: null };
  const parsed = safeReadJson(file);
  return { present: true, settings: parsed };
}

function readArchAuditStatus(cwd) {
  const file = join(cwd, '.claude', 'session', 'last-arch-audit');
  if (!existsSync(file)) {
    return { everRan: false, lastRunUnix: null, lastRunIso: null };
  }
  try {
    const raw = readFileSync(file, 'utf8').trim();
    const epoch = Number.parseInt(raw, 10);
    if (!Number.isFinite(epoch)) {
      return {
        everRan: true,
        lastRunUnix: null,
        lastRunIso: null,
        _warning: `unparseable: ${raw.slice(0, 40)}`,
      };
    }
    return {
      everRan: true,
      lastRunUnix: epoch,
      lastRunIso: new Date(epoch * 1000).toISOString(),
      ageDays: (Date.now() / 1000 - epoch) / 86400,
    };
  } catch (err) {
    return { everRan: false, lastRunUnix: null, lastRunIso: null, _error: err.message };
  }
}

function readSkillInventory(cwd) {
  const skillsDir = join(cwd, '.claude', 'skills');
  if (!existsSync(skillsDir)) return { skills: [], skillsDir, present: false };
  const entries = readdirSync(skillsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  const skills = [];
  for (const name of entries) {
    const skillFile = join(skillsDir, name, 'SKILL.md');
    if (!existsSync(skillFile)) continue;
    const raw = readFileSync(skillFile, 'utf8');
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
    const frontmatter = {};
    if (fmMatch) {
      for (const line of fmMatch[1].split('\n')) {
        const m = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
        if (m) frontmatter[m[1]] = m[2].trim();
      }
    }
    skills.push({
      name,
      isCustom: name.startsWith('custom-'),
      bodyLines: raw.split('\n').length,
      description: frontmatter.description || null,
      model: frontmatter.model || null,
      userInvocable: frontmatter['user-invocable'] || null,
      allowedTools: frontmatter['allowed-tools'] || null,
    });
  }
  return { skills, skillsDir, present: true, count: skills.length };
}

function getPackageMeta() {
  return {
    name: 'mg-claude-dev-kit',
    version: readPackageVersion(),
    cliPath: CLI_PATH,
    cwd: getCwd(),
  };
}

export function buildServer() {
  const server = new McpServer({
    name: 'mg-claude-dev-kit',
    version: readPackageVersion(),
  });

  server.registerTool(
    'cdk_doctor_report',
    {
      title: 'CDK doctor report',
      description:
        'Runs `claude-dev-kit doctor --report` against the current project and returns the JSON compliance summary (28 checks: governance files, hooks, skill spec, security variant, drift markers).',
      inputSchema: {},
    },
    async () => buildToolReply(runDoctorReport(getCwd())),
  );

  server.registerTool(
    'cdk_team_settings',
    {
      title: 'CDK team-settings.json contents',
      description:
        'Returns the parsed `.claude/team-settings.json` for the current project. The `present` flag indicates whether the file exists; when absent, the project is unrestricted by CDK governance.',
      inputSchema: {},
    },
    async () => buildToolReply(readTeamSettings(getCwd())),
  );

  server.registerTool(
    'cdk_arch_audit_status',
    {
      title: 'Last arch-audit run status',
      description:
        'Returns the timestamp of the last `arch-audit` skill execution recorded in `.claude/session/last-arch-audit`, plus age in days. Useful to verify the weekly cadence is honoured.',
      inputSchema: {},
    },
    async () => buildToolReply(readArchAuditStatus(getCwd())),
  );

  server.registerTool(
    'cdk_skill_inventory',
    {
      title: 'Installed skills inventory',
      description:
        'Lists every skill installed in `.claude/skills/`, with frontmatter snapshot (description, model, allowed-tools, user-invocable). Custom skills are flagged separately.',
      inputSchema: {},
    },
    async () => buildToolReply(readSkillInventory(getCwd())),
  );

  server.registerTool(
    'cdk_package_meta',
    {
      title: 'CDK package metadata',
      description:
        'Returns the CDK package name, installed version, CLI path, and resolved project root. Useful for clients to verify which CDK CLI is wired up to this MCP server.',
      inputSchema: {},
    },
    async () => buildToolReply(getPackageMeta()),
  );

  return server;
}

export async function startStdio() {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  startStdio().catch((err) => {
    process.stderr.write(`mg-claude-dev-kit-mcp fatal: ${err.message}\n`);
    process.exit(1);
  });
}
