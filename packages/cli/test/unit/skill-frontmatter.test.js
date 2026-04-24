import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSkillFile,
  extractFields,
  countBodyLines,
  allowedToolsHasCommas,
} from '../../src/utils/skill-frontmatter.js';

describe('parseSkillFile', () => {
  it('returns null frontmatter when no delimiters present', () => {
    const { frontmatter, body, fields } = parseSkillFile('Just body content.\n');
    assert.equal(frontmatter, null);
    assert.equal(body, 'Just body content.\n');
    assert.deepEqual(fields, {});
  });

  it('extracts frontmatter and body from well-formed SKILL.md', () => {
    const src = `---
name: test-skill
description: A short description.
context: fork
---

Body content starts here.
Line two.`;
    const { frontmatter, body, fields } = parseSkillFile(src);
    assert.ok(frontmatter.includes('name: test-skill'));
    assert.equal(body, 'Body content starts here.\nLine two.');
    assert.equal(fields.name, 'test-skill');
    assert.equal(fields.description, 'A short description.');
    assert.equal(fields.context, 'fork');
  });

  it('captures allowed-tools value when present', () => {
    const src = `---
name: x
allowed-tools: Read Glob Grep
---

body`;
    const { fields } = parseSkillFile(src);
    assert.equal(fields.allowedTools, 'Read Glob Grep');
  });
});

describe('extractFields', () => {
  it('returns null for unspecified fields', () => {
    const fields = extractFields('name: x');
    assert.equal(fields.name, 'x');
    assert.equal(fields.description, null);
    assert.equal(fields.model, null);
  });
});

describe('countBodyLines', () => {
  it('returns 0 for empty body', () => {
    assert.equal(countBodyLines(''), 0);
    assert.equal(countBodyLines('\n\n\n'), 0);
  });

  it('counts lines ignoring trailing newlines', () => {
    assert.equal(countBodyLines('line 1\nline 2\nline 3\n\n\n'), 3);
    assert.equal(countBodyLines('only one line'), 1);
  });
});

describe('allowedToolsHasCommas', () => {
  it('returns false for null / undefined / empty', () => {
    assert.equal(allowedToolsHasCommas(null), false);
    assert.equal(allowedToolsHasCommas(''), false);
  });

  it('detects comma-separated scalar form (the deviation we guard against)', () => {
    assert.equal(allowedToolsHasCommas('Read, Glob, Grep'), true);
    assert.equal(allowedToolsHasCommas('Read,Glob'), true);
  });

  it('accepts space-separated scalar form', () => {
    assert.equal(allowedToolsHasCommas('Read Glob Grep'), false);
    assert.equal(allowedToolsHasCommas('Bash(git add *) Bash(git commit *)'), false);
  });

  it('accepts YAML flow list form (commas inside brackets are list separators, not scalar commas)', () => {
    assert.equal(allowedToolsHasCommas('[Read, Glob, Grep]'), false);
  });
});
