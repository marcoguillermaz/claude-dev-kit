# Security Rules - Native Apple (macOS / iOS)

These rules apply when working on Swift/Objective-C apps targeting Apple platforms.

## App Sandbox & Entitlements

- Every entitlement in the `.entitlements` file must be justified. Never add entitlements "just in case".
- If the app accesses network, files, or hardware: verify the matching entitlement is present and scoped correctly.
- Hardened Runtime must be enabled for macOS distribution. Never disable it to work around a signing issue.

## Keychain & Credentials

- Store secrets (API keys, tokens, passwords) in Keychain Services - never in UserDefaults, plists, or plain files.
- Use `kSecAttrAccessible` values appropriate to the data sensitivity. Prefer `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` for high-sensitivity items.
- Never log Keychain values, even at debug level.

## TCC Permissions (Camera, Microphone, Location, Files)

- Declare every required permission in `Info.plist` with a clear, user-facing usage description.
- Request permissions at the point of use, not at app launch. Explain why before the system prompt appears.
- Handle the "denied" state gracefully - never crash or silently fail when permission is denied.
- Never access protected resources without checking authorization status first.

## Data Persistence

- Sensitive data written to disk must use Data Protection (`FileProtectionType.complete` or `.completeUnlessOpen`).
- SQLite databases containing user data should enable encryption (SQLCipher or equivalent) if the threat model requires it.
- Temporary files with sensitive content must be deleted after use - never leave them in `tmp/` indefinitely.

## Code Signing & Distribution

- Never disable code signing to fix a build error. Diagnose the actual signing identity issue.
- Never embed provisioning profiles or signing certificates in the repository.
- For CI/CD: use environment variables or Keychain for signing credentials, never checked-in files.

## Input Handling

- Validate all external input: URL schemes, deep links, clipboard data, file imports, IPC messages.
- Custom URL schemes must validate the source and sanitize parameters before acting on them.
- Pasted data from clipboard should be validated before use in sensitive operations.

## Secrets and Credentials

- Never hardcode API keys, tokens, or connection strings in source code.
- Never log secrets, even at debug level.
- Use `.gitignore` to exclude any file that could contain secrets (`.env*`, `*.pem`, `*.key`, `Secrets.swift`).

## Security Checklist (before every commit touching security-sensitive code)

- [ ] Entitlements are minimal and justified
- [ ] Secrets stored in Keychain, not UserDefaults or plists
- [ ] TCC permissions declared with usage descriptions
- [ ] Sensitive disk writes use Data Protection
- [ ] No signing credentials in repository
- [ ] External input validated (URL schemes, clipboard, file imports)
- [ ] No secrets in code or logs
