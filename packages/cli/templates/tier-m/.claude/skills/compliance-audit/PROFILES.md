# Compliance Audit - Profiles Reference

Reference file for `/compliance-audit`. Defines the GDPR profile (active in v1.14) and scaffolds the SOC 2 and HIPAA profiles for future releases (v1.15+).

**Why scaffold SOC 2 and HIPAA now without activating them?** Mechanical compliance patterns for SOC 2 and HIPAA need validation against real enterprise projects. Shipping them untested would produce false-confidence findings ("your code is SOC 2 compliant") that could mislead readers. The scaffold preserves the check taxonomy and backlog prefixes so v1.15 can wire them in without breaking the skill's report shape.

---

## Profile 1: GDPR (active in v1.14)

**Scope**: EU General Data Protection Regulation (Regulation (EU) 2016/679).

**Active checks** (all defined in `SKILL.md` Step 2):

| ID | Check | Pillar | Severity range |
|---|---|---|---|
| G1 | Right to delete (Art. 17) | Data subject rights | High / Critical |
| G2 | Right to export (Art. 20) | Data subject rights | High |
| G3 | Right to rectification (Art. 16) | Data subject rights | Medium |
| G4 | Consent capture (Art. 6, 7) | Lawful basis + consent | Medium / High |
| G5 | Lawful basis declaration | Lawful basis + consent | Medium |
| G6 | PII field identification (Art. 9) | Security measures | informational |
| G7 | Encryption-at-rest for special-category | Security measures | High |
| G8 | PII logging hygiene | Security measures | High |
| G9 | Retention policy declaration (Art. 5) | Accountability | Medium |
| G10 | Sub-processor transparency (Art. 28, 30) | Accountability | Low |

**Backlog prefix**: `GDPR-`

**Readiness tiers**:
- **Foundational**: any Critical finding. Core rights missing.
- **Operational**: no Critical, High present. Core flows exist, refinement needed.
- **Mature**: no Critical, no High. Medium / Low remain.

---

## Profile 2: SOC 2 (scaffolded for v1.15+, **NOT ACTIVE in v1.14**)

**Scope**: System and Organization Controls 2 - Trust Services Criteria (Security, Availability, Processing Integrity, Confidentiality, Privacy).

**Planned checks** (placeholder IDs, to be validated against real enterprise audit engagement before enablement):

| ID | Check | Criterion | Severity (planned) |
|---|---|---|---|
| SOC2-1 | Audit log presence for security events | CC7.2 | High |
| SOC2-2 | Change management via code review | CC8.1 | High |
| SOC2-3 | Access review process documented | CC6.3 | Medium |
| SOC2-4 | MFA requirement declared | CC6.6 | High |
| SOC2-5 | Encryption in transit (TLS) | CC6.1 | High |
| SOC2-6 | Incident response plan present | CC7.3 | Medium |
| SOC2-7 | Backup + disaster recovery declared | A1.2 | Medium |
| SOC2-8 | Vendor management (sub-processor list) | CC9.2 | Medium |
| SOC2-9 | Logical access removal on termination | CC6.2 | High |
| SOC2-10 | Production change documentation | CC8.1 | Medium |

**Backlog prefix** (reserved): `SOC2-`

**Activation blocker**: pattern validation requires at least one enterprise customer going through a real SOC 2 audit to confirm that the mechanical checks match what an auditor actually probes. Without this feedback loop, checks risk being either overly strict (false positives) or toothless (missing real gaps).

---

## Profile 3: HIPAA (scaffolded for v1.15+, **NOT ACTIVE in v1.14**)

**Scope**: US Health Insurance Portability and Accountability Act - Privacy + Security Rules, specifically the Technical Safeguards (45 CFR § 164.312) and Administrative Safeguards (§ 164.308).

**Planned checks** (placeholder IDs):

| ID | Check | Rule | Severity (planned) |
|---|---|---|---|
| HIPAA-1 | PHI field identification | Privacy Rule | High |
| HIPAA-2 | BAA mention for cloud / third-party vendors | § 164.308(b) | Critical |
| HIPAA-3 | MFA on administrative access | § 164.312(a)(1) | High |
| HIPAA-4 | Audit log with 6-year retention declared | § 164.312(b) | High |
| HIPAA-5 | Encryption at rest for PHI columns | § 164.312(a)(2)(iv) | Critical |
| HIPAA-6 | Encryption in transit for PHI endpoints | § 164.312(e) | Critical |
| HIPAA-7 | Automatic logoff / session timeout | § 164.312(a)(2)(iii) | Medium |
| HIPAA-8 | Integrity controls (data tampering protection) | § 164.312(c) | Medium |
| HIPAA-9 | Breach notification plan (60-day window) | § 164.404 | High |
| HIPAA-10 | Workforce sanction policy | § 164.308(a)(1)(ii)(C) | Medium |

**Backlog prefix** (reserved): `HIPAA-`

**Activation blocker**: HIPAA field detection requires a PHI vocabulary extension beyond the GDPR PII registry (medical record numbers, diagnosis codes, treatment identifiers, prescription data). The vocabulary is domain-specific and should be validated with a healthcare-domain project before general release. Additionally, HIPAA requires a Business Associate Agreement (BAA) posture that is contractual, not technical - mechanical detection of "BAA exists with vendor X" is inherently limited to docs text search.

---

## Extension rule

When adding a new profile (CCPA for California, LGPD for Brazil, PIPEDA for Canada, etc.):

1. Add a new profile section here with check IDs, criteria references, severity, and backlog prefix.
2. Add a corresponding `Step 2.X - <profile> checks` section in `SKILL.md`.
3. Update the `profile:<name>` token in the `argument-hint` and Step 0 table.
4. Update the report template's "Other profiles" table row from "scaffolded" to "active" once patterns are validated.

Profiles share the same execution scaffolding: static scan → findings → readiness tier → backlog gate. Adding a profile is a data-only change in this file + a Step addition in `SKILL.md`.
