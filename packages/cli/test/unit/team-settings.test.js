import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import {
  TEAM_SETTINGS_FILE,
  readTeamSettings,
  validateTeamSettings,
  violatesMinTier,
  isSkillBlocked,
  isSkillAllowed,
  getRequiredSkills,
  getPrReviewSeverity,
} from '../../src/utils/team-settings.js';

let TMP;

before(async () => {
  TMP = await fs.mkdtemp(path.join(os.tmpdir(), 'team-settings-test-'));
});

after(async () => {
  await fs.remove(TMP);
});

async function writeSettings(name, contents) {
  const dir = path.join(TMP, name);
  await fs.ensureDir(path.join(dir, '.claude'));
  await fs.writeFile(path.join(dir, TEAM_SETTINGS_FILE), contents);
  return dir;
}

describe('readTeamSettings', () => {
  it('returns null when team-settings.json is absent (unrestricted)', async () => {
    const dir = await fs.mkdtemp(path.join(TMP, 'absent-'));
    assert.equal(readTeamSettings(dir), null);
  });

  it('parses a valid file with all four fields', async () => {
    const dir = await writeSettings(
      'valid-all',
      JSON.stringify({
        minTier: 'm',
        allowedSkills: ['arch-audit', 'security-audit'],
        blockedSkills: ['custom-experimental'],
        requiredSkills: ['arch-audit'],
      }),
    );
    const parsed = readTeamSettings(dir);
    assert.equal(parsed.minTier, 'm');
    assert.deepEqual(parsed.allowedSkills, ['arch-audit', 'security-audit']);
    assert.deepEqual(parsed.blockedSkills, ['custom-experimental']);
    assert.deepEqual(parsed.requiredSkills, ['arch-audit']);
  });

  it('throws on malformed JSON with descriptive message', async () => {
    const dir = await writeSettings('bad-json', '{not json}');
    assert.throws(() => readTeamSettings(dir), /not valid JSON/);
  });
});

describe('validateTeamSettings', () => {
  it('rejects non-object values', () => {
    assert.throws(() => validateTeamSettings('a string'), /must be a JSON object/);
    assert.throws(() => validateTeamSettings([]), /must be a JSON object/);
    assert.throws(() => validateTeamSettings(null), /must be a JSON object/);
  });

  it('rejects an unknown minTier value', () => {
    assert.throws(() => validateTeamSettings({ minTier: 'xl' }), /minTier must be one of/);
  });

  it('rejects skill list fields that are not arrays', () => {
    assert.throws(
      () => validateTeamSettings({ allowedSkills: 'arch-audit' }),
      /allowedSkills must be an array/,
    );
  });

  it('rejects skill list entries that are not non-empty strings', () => {
    assert.throws(
      () => validateTeamSettings({ requiredSkills: ['ok', ''] }),
      /must contain only non-empty strings/,
    );
    assert.throws(
      () => validateTeamSettings({ blockedSkills: ['ok', 42] }),
      /must contain only non-empty strings/,
    );
  });

  it('rejects allowedSkills and blockedSkills overlap', () => {
    assert.throws(
      () =>
        validateTeamSettings({
          allowedSkills: ['arch-audit', 'security-audit'],
          blockedSkills: ['security-audit'],
        }),
      /must not overlap.*security-audit/,
    );
  });

  it('accepts an empty object as valid (all fields optional)', () => {
    assert.doesNotThrow(() => validateTeamSettings({}));
  });
});

describe('violatesMinTier', () => {
  it('returns null when no minTier is set', () => {
    assert.equal(violatesMinTier({}, 's'), null);
    assert.equal(violatesMinTier(null, 's'), null);
  });

  it('returns the violated minTier when tier is below', () => {
    assert.equal(violatesMinTier({ minTier: 'm' }, 's'), 'm');
    assert.equal(violatesMinTier({ minTier: 'l' }, 'm'), 'l');
    assert.equal(violatesMinTier({ minTier: 'l' }, 's'), 'l');
  });

  it('returns null when tier meets or exceeds minTier', () => {
    assert.equal(violatesMinTier({ minTier: 'm' }, 'm'), null);
    assert.equal(violatesMinTier({ minTier: 'm' }, 'l'), null);
    assert.equal(violatesMinTier({ minTier: 's' }, 's'), null);
  });

  it('returns null for an unknown tier value (graceful skip)', () => {
    assert.equal(violatesMinTier({ minTier: 'm' }, 'unknown'), null);
  });
});

describe('isSkillBlocked', () => {
  it('returns false when no settings or no blockedSkills', () => {
    assert.equal(isSkillBlocked(null, 'arch-audit'), false);
    assert.equal(isSkillBlocked({}, 'arch-audit'), false);
  });

  it('returns true when skill is in blockedSkills (custom-* not exempt)', () => {
    const s = { blockedSkills: ['arch-audit', 'custom-x'] };
    assert.equal(isSkillBlocked(s, 'arch-audit'), true);
    assert.equal(isSkillBlocked(s, 'custom-x'), true);
  });

  it('returns false for skills not in the list', () => {
    assert.equal(isSkillBlocked({ blockedSkills: ['a'] }, 'b'), false);
  });
});

describe('isSkillAllowed', () => {
  it('returns true when no settings or no allowedSkills (unrestricted)', () => {
    assert.equal(isSkillAllowed(null, 'arch-audit'), true);
    assert.equal(isSkillAllowed({}, 'arch-audit'), true);
  });

  it('returns true for skills in allowedSkills', () => {
    assert.equal(isSkillAllowed({ allowedSkills: ['arch-audit'] }, 'arch-audit'), true);
  });

  it('returns false for skills not in allowedSkills', () => {
    assert.equal(isSkillAllowed({ allowedSkills: ['arch-audit'] }, 'security-audit'), false);
  });

  it('returns true for custom-* skills regardless of allowedSkills (whitelist bypass)', () => {
    const s = { allowedSkills: ['arch-audit'] };
    assert.equal(isSkillAllowed(s, 'custom-experimental'), true);
    assert.equal(isSkillAllowed(s, 'custom-internal-audit'), true);
  });
});

describe('getRequiredSkills', () => {
  it('returns an empty array when no settings or no requiredSkills', () => {
    assert.deepEqual(getRequiredSkills(null), []);
    assert.deepEqual(getRequiredSkills({}), []);
  });

  it('returns a copy of the requiredSkills array', () => {
    const s = { requiredSkills: ['arch-audit', 'security-audit'] };
    const required = getRequiredSkills(s);
    assert.deepEqual(required, ['arch-audit', 'security-audit']);
    required.push('mutation');
    assert.deepEqual(s.requiredSkills, ['arch-audit', 'security-audit']);
  });
});

describe('prReviewSeverity validation', () => {
  it('rejects non-object prReviewSeverity', () => {
    assert.throws(
      () => validateTeamSettings({ prReviewSeverity: 'critical' }),
      /must be an object with critical\/major\/minor arrays/,
    );
    assert.throws(
      () => validateTeamSettings({ prReviewSeverity: [] }),
      /must be an object with critical\/major\/minor arrays/,
    );
  });

  it('rejects non-array severity-level fields', () => {
    assert.throws(
      () => validateTeamSettings({ prReviewSeverity: { critical: 'src/auth/**' } }),
      /prReviewSeverity\.critical must be an array of glob patterns/,
    );
  });

  it('rejects non-string entries in a severity array', () => {
    assert.throws(
      () => validateTeamSettings({ prReviewSeverity: { major: ['src/api/**', 42] } }),
      /prReviewSeverity\.major must contain only non-empty strings/,
    );
    assert.throws(
      () => validateTeamSettings({ prReviewSeverity: { minor: ['ok', ''] } }),
      /prReviewSeverity\.minor must contain only non-empty strings/,
    );
  });

  it('accepts a valid prReviewSeverity object', () => {
    assert.doesNotThrow(() =>
      validateTeamSettings({
        prReviewSeverity: {
          critical: ['src/auth/**', 'migrations/**'],
          major: ['src/api/**'],
          minor: [],
        },
      }),
    );
  });

  it('accepts partial prReviewSeverity (only one level)', () => {
    assert.doesNotThrow(() =>
      validateTeamSettings({ prReviewSeverity: { critical: ['src/payments/**'] } }),
    );
  });
});

describe('getPrReviewSeverity', () => {
  it('returns null when no settings or no prReviewSeverity', () => {
    assert.equal(getPrReviewSeverity(null), null);
    assert.equal(getPrReviewSeverity({}), null);
  });

  it('returns three arrays (critical/major/minor) defaulting empty when level absent', () => {
    const s = {
      prReviewSeverity: {
        critical: ['src/auth/**'],
        major: ['src/api/**'],
      },
    };
    const got = getPrReviewSeverity(s);
    assert.deepEqual(got.critical, ['src/auth/**']);
    assert.deepEqual(got.major, ['src/api/**']);
    assert.deepEqual(got.minor, []);
  });

  it('returns copies, not references (mutation safety)', () => {
    const s = {
      prReviewSeverity: {
        critical: ['src/auth/**'],
        major: [],
        minor: [],
      },
    };
    const got = getPrReviewSeverity(s);
    got.critical.push('src/mutation/**');
    assert.deepEqual(s.prReviewSeverity.critical, ['src/auth/**']);
  });
});
