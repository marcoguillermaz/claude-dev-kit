import fs from 'fs';
import path from 'path';

export const TEAM_SETTINGS_FILE = '.claude/team-settings.json';

const VALID_TIERS = ['s', 'm', 'l'];
const TIER_RANK = { s: 1, m: 2, l: 3 };
const SKILL_LIST_FIELDS = ['allowedSkills', 'blockedSkills', 'requiredSkills'];

export function readTeamSettings(cwd) {
  const filePath = path.join(cwd, TEAM_SETTINGS_FILE);
  if (!fs.existsSync(filePath)) return null;
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    throw new Error(`Cannot read ${TEAM_SETTINGS_FILE}: ${err.message}`, { cause: err });
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`${TEAM_SETTINGS_FILE} is not valid JSON: ${err.message}`, { cause: err });
  }
  validateTeamSettings(parsed);
  return parsed;
}

export function validateTeamSettings(settings) {
  if (typeof settings !== 'object' || settings === null || Array.isArray(settings)) {
    throw new Error('team-settings.json must be a JSON object');
  }

  if (settings.minTier !== undefined && !VALID_TIERS.includes(settings.minTier)) {
    throw new Error(
      `team-settings.json: minTier must be one of ${VALID_TIERS.join(', ')}, got "${settings.minTier}"`,
    );
  }

  for (const field of SKILL_LIST_FIELDS) {
    if (settings[field] === undefined) continue;
    if (!Array.isArray(settings[field])) {
      throw new Error(`team-settings.json: ${field} must be an array of strings`);
    }
    for (const name of settings[field]) {
      if (typeof name !== 'string' || name.length === 0) {
        throw new Error(`team-settings.json: ${field} must contain only non-empty strings`);
      }
    }
  }

  if (Array.isArray(settings.allowedSkills) && Array.isArray(settings.blockedSkills)) {
    const overlap = settings.allowedSkills.filter((s) => settings.blockedSkills.includes(s));
    if (overlap.length > 0) {
      throw new Error(
        `team-settings.json: allowedSkills and blockedSkills must not overlap. Conflicts: ${overlap.join(', ')}`,
      );
    }
  }

  return settings;
}

export function violatesMinTier(settings, tier) {
  if (!settings || !settings.minTier) return null;
  const required = TIER_RANK[settings.minTier];
  const provided = TIER_RANK[tier];
  if (provided === undefined) return null;
  if (provided < required) return settings.minTier;
  return null;
}

export function isSkillBlocked(settings, skillName) {
  if (!settings || !Array.isArray(settings.blockedSkills)) return false;
  return settings.blockedSkills.includes(skillName);
}

export function isSkillAllowed(settings, skillName) {
  if (!settings || !Array.isArray(settings.allowedSkills)) return true;
  if (skillName.startsWith('custom-')) return true;
  return settings.allowedSkills.includes(skillName);
}

export function getRequiredSkills(settings) {
  if (!settings || !Array.isArray(settings.requiredSkills)) return [];
  return [...settings.requiredSkills];
}
