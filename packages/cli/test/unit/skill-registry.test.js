import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  NATIVE_STACKS,
  SKILL_REGISTRY,
  getSkillsToRemove,
  getActiveSkills,
  getCheatsheetSkillsToRemove,
} from '../../src/scaffold/skill-registry.js';

// ---------------------------------------------------------------------------
// NATIVE_STACKS
// ---------------------------------------------------------------------------

describe('NATIVE_STACKS', () => {
  it('contains the 5 expected native stacks', () => {
    assert.deepEqual(NATIVE_STACKS, ['swift', 'kotlin', 'rust', 'dotnet', 'java']);
  });
});

// ---------------------------------------------------------------------------
// SKILL_REGISTRY structure
// ---------------------------------------------------------------------------

describe('SKILL_REGISTRY', () => {
  it('has 12 entries', () => {
    assert.equal(SKILL_REGISTRY.length, 12);
  });

  it('every entry has required fields', () => {
    for (const s of SKILL_REGISTRY) {
      assert.ok(typeof s.name === 'string', `${s.name} missing name`);
      assert.ok(['s', 'm', 'l'].includes(s.minTier), `${s.name} invalid minTier`);
      assert.ok(typeof s.requires === 'object', `${s.name} missing requires`);
      assert.ok(typeof s.cheatsheet === 'boolean', `${s.name} missing cheatsheet`);
    }
  });

  it('names are unique', () => {
    const names = SKILL_REGISTRY.map((s) => s.name);
    assert.equal(new Set(names).size, names.length);
  });
});

// ---------------------------------------------------------------------------
// getSkillsToRemove()
// ---------------------------------------------------------------------------

describe('getSkillsToRemove', () => {
  it('all flags true + web stack: removes nothing', () => {
    const result = getSkillsToRemove({
      techStack: 'node-ts',
      hasApi: true,
      hasDatabase: true,
      hasFrontend: true,
      hasDesignSystem: true,
    });
    assert.equal(result.length, 0);
  });

  it('hasApi=false removes api-design and security-audit', () => {
    const result = getSkillsToRemove({ techStack: 'node-ts', hasApi: false });
    assert.ok(result.includes('api-design'));
    assert.ok(result.includes('security-audit'));
    assert.ok(!result.includes('perf-audit'));
  });

  it('hasDatabase=false removes skill-db', () => {
    const result = getSkillsToRemove({ techStack: 'node-ts', hasDatabase: false });
    assert.ok(result.includes('skill-db'));
    assert.equal(result.length, 1);
  });

  it('hasFrontend=false removes all 4 frontend skills', () => {
    const result = getSkillsToRemove({ techStack: 'node-ts', hasFrontend: false });
    assert.ok(result.includes('responsive-audit'));
    assert.ok(result.includes('visual-audit'));
    assert.ok(result.includes('ux-audit'));
    assert.ok(result.includes('ui-audit'));
  });

  it('native stack removes responsive-audit but keeps visual and ux', () => {
    const result = getSkillsToRemove({ techStack: 'swift' });
    assert.ok(result.includes('responsive-audit'));
    assert.ok(!result.includes('visual-audit'));
    assert.ok(!result.includes('ux-audit'));
  });

  it('hasDesignSystem=false removes ui-audit', () => {
    const result = getSkillsToRemove({ techStack: 'node-ts', hasDesignSystem: false });
    assert.ok(result.includes('ui-audit'));
    assert.ok(!result.includes('visual-audit'));
  });

  it('combined: hasApi=false + hasFrontend=false removes both groups', () => {
    const result = getSkillsToRemove({ techStack: 'node-ts', hasApi: false, hasFrontend: false });
    assert.ok(result.includes('api-design'));
    assert.ok(result.includes('security-audit'));
    assert.ok(result.includes('responsive-audit'));
    assert.ok(result.includes('visual-audit'));
    assert.ok(result.includes('ux-audit'));
    assert.ok(result.includes('ui-audit'));
    assert.ok(!result.includes('perf-audit'));
    assert.ok(!result.includes('skill-dev'));
  });

  it('undefined flags are treated as true (not removed)', () => {
    const result = getSkillsToRemove({ techStack: 'node-ts' });
    assert.equal(result.length, 0);
  });
});

// ---------------------------------------------------------------------------
// getActiveSkills()
// ---------------------------------------------------------------------------

describe('getActiveSkills', () => {
  it('tier S default: base skills + security-audit', () => {
    const result = getActiveSkills({ tier: 's' });
    assert.ok(result.includes('arch-audit'));
    assert.ok(result.includes('skill-dev'));
    assert.ok(result.includes('perf-audit'));
    assert.ok(result.includes('simplify'));
    assert.ok(result.includes('commit'));
    assert.ok(result.includes('security-audit'));
    assert.ok(!result.includes('api-design'));
    assert.ok(!result.includes('skill-db'));
  });

  it('tier S hasApi=false excludes security-audit', () => {
    const result = getActiveSkills({ tier: 's', hasApi: false });
    assert.ok(!result.includes('security-audit'));
    assert.ok(result.includes('arch-audit'));
  });

  it('tier M all-true includes full set', () => {
    const result = getActiveSkills({
      tier: 'm',
      hasApi: true,
      hasDatabase: true,
      hasFrontend: true,
      hasDesignSystem: true,
    });
    assert.ok(result.includes('api-design'));
    assert.ok(result.includes('security-audit'));
    assert.ok(result.includes('skill-db'));
    assert.ok(result.includes('responsive-audit'));
    assert.ok(result.includes('visual-audit'));
    assert.ok(result.includes('ux-audit'));
    assert.ok(result.includes('ui-audit'));
  });

  it('tier M hasApi=false excludes api-design and security-audit', () => {
    const result = getActiveSkills({ tier: 'm', hasApi: false });
    assert.ok(!result.includes('api-design'));
    assert.ok(!result.includes('security-audit'));
  });

  it('tier M hasFrontend=false excludes all frontend skills', () => {
    const result = getActiveSkills({ tier: 'm', hasFrontend: false });
    assert.ok(!result.includes('responsive-audit'));
    assert.ok(!result.includes('visual-audit'));
    assert.ok(!result.includes('ux-audit'));
    assert.ok(!result.includes('ui-audit'));
  });

  it('tier M hasDesignSystem=false excludes ui-audit but keeps other frontend', () => {
    const result = getActiveSkills({ tier: 'm', hasFrontend: true, hasDesignSystem: false });
    assert.ok(!result.includes('ui-audit'));
    assert.ok(result.includes('visual-audit'));
    assert.ok(result.includes('ux-audit'));
  });

  it('tier M native stack excludes responsive-audit (bugfix)', () => {
    const result = getActiveSkills({ tier: 'm', techStack: 'swift', hasFrontend: true });
    assert.ok(!result.includes('responsive-audit'));
    assert.ok(result.includes('visual-audit'));
    assert.ok(result.includes('ux-audit'));
  });

  it('tier defaults to S when missing', () => {
    const result = getActiveSkills({});
    assert.ok(!result.includes('api-design'));
    assert.ok(result.includes('security-audit'));
  });
});

// ---------------------------------------------------------------------------
// getCheatsheetSkillsToRemove()
// ---------------------------------------------------------------------------

describe('getCheatsheetSkillsToRemove', () => {
  it('all flags true: removes nothing', () => {
    const result = getCheatsheetSkillsToRemove({
      techStack: 'node-ts',
      hasApi: true,
      hasDatabase: true,
    });
    assert.equal(result.length, 0);
  });

  it('hasApi=false removes security-audit and api-design from cheatsheet', () => {
    const result = getCheatsheetSkillsToRemove({ techStack: 'node-ts', hasApi: false });
    assert.ok(result.includes('security-audit'));
    assert.ok(result.includes('api-design'));
  });

  it('hasDatabase=false removes skill-db from cheatsheet', () => {
    const result = getCheatsheetSkillsToRemove({ techStack: 'node-ts', hasDatabase: false });
    assert.ok(result.includes('skill-db'));
    assert.equal(result.length, 1);
  });

  it('only returns skills that have cheatsheet=true', () => {
    const result = getCheatsheetSkillsToRemove({ techStack: 'node-ts', hasFrontend: false });
    // frontend skills have cheatsheet: false, so none returned
    assert.equal(result.length, 0);
  });
});
