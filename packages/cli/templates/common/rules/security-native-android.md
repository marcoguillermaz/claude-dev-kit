# Security Rules — Native Android (Kotlin / Java)

These rules apply when working on Android apps targeting the Android platform.

## Permissions & Manifest

- Every permission in `AndroidManifest.xml` must be justified. Never add permissions "just in case".
- Use runtime permission requests (not just manifest declarations) for dangerous permissions (camera, microphone, location, storage).
- Request permissions at the point of use, not at app launch. Explain why before the system dialog appears.
- Handle the "denied" and "don't ask again" states gracefully — never crash or silently fail.

## Credential Storage

- Store secrets (API keys, tokens, passwords) in Android Keystore or EncryptedSharedPreferences — never in plain SharedPreferences, SQLite without encryption, or plain files.
- Never log credentials or tokens, even at debug level.
- Never embed API keys directly in source code or `BuildConfig` fields committed to the repo. Use `local.properties` (gitignored) or CI/CD secrets.

## Data Persistence

- Sensitive data in SQLite should use SQLCipher or Room with encryption if the threat model requires it.
- Files with sensitive content must use internal storage (`context.filesDir`), not external storage.
- Temporary files with sensitive content must be deleted after use.
- Enable `android:allowBackup="false"` or use `android:fullBackupContent` to exclude sensitive data from backups.

## Network Security

- Use `network_security_config.xml` to enforce certificate pinning for critical API endpoints.
- Never allow cleartext traffic in production (`android:usesCleartextTraffic="false"`).
- Validate SSL certificates — never implement a trust-all `TrustManager`.

## Input Handling

- Validate all external input: deep links, Intent extras, ContentProvider queries, clipboard data.
- Deep links and Intent filters must validate the source and sanitize parameters before acting on them.
- Exported components (`Activity`, `Service`, `BroadcastReceiver`, `ContentProvider`) must validate caller permissions.

## Code Signing & Distribution

- Never commit signing keystores (`.jks`, `.keystore`) to the repository.
- For CI/CD: use environment variables or secret managers for signing credentials.
- ProGuard/R8 rules must not disable obfuscation for security-sensitive classes.

## Secrets and Credentials

- Never hardcode secrets, tokens, passwords, or connection strings in source code.
- Never log secrets, even at debug level.
- Use `.gitignore` to exclude any file that could contain secrets (`local.properties`, `*.jks`, `*.keystore`, `keystore.properties`).

## Security Checklist (before every commit touching security-sensitive code)

- [ ] Permissions are minimal and justified
- [ ] Secrets stored in Keystore or EncryptedSharedPreferences
- [ ] Runtime permissions requested at point of use with denial handling
- [ ] Sensitive data uses internal storage, not external
- [ ] No signing keystores in repository
- [ ] External input validated (deep links, Intents, ContentProviders)
- [ ] Network security config enforces HTTPS
- [ ] No secrets in code or logs
