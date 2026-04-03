# Security Rules — Systems & Backend (Rust / Go / .NET / Java / C++)

These rules apply when working on systems-level applications, CLI tools, daemons, or backend services without a web API layer.

## Memory & Resource Safety

- Never use `unsafe` blocks (Rust) or raw pointers (Go, C++) without a comment justifying why safe alternatives are insufficient.
- Validate buffer sizes before read/write operations. Never trust external input to determine buffer length without bounds checking.
- Close file handles, network connections, and other resources deterministically — use RAII (Rust/C++), `defer` (Go), `using` (C#), or try-with-resources (Java).

## Input Handling

- Validate all external input at system boundaries: CLI arguments, environment variables, file contents, network data, IPC messages.
- File paths from user input must be canonicalized and validated against an allowlist before use. Prevent path traversal (`../`).
- Deserializing untrusted data (JSON, YAML, binary formats) must use strict schema validation. Never deserialize into arbitrary types.

## File System & Permissions

- Create files with restrictive permissions by default (e.g., 0600 for sensitive files). Never create world-readable files containing secrets.
- Temporary files must be created in secure directories and deleted after use.
- When writing to user-specified paths: validate the path, check permissions, handle symlink attacks (use `O_NOFOLLOW` where available).

## Process Execution

- Never construct shell commands from user input. Use direct process execution with argument arrays (no shell interpretation).
- If shelling out is unavoidable: sanitize every argument and never pass raw user input to a shell.
- Child processes should inherit minimal environment — strip sensitive environment variables before spawning.

## Secrets and Credentials

- Never hardcode secrets, tokens, passwords, or connection strings in source code.
- Never log secrets, even at debug level.
- Read secrets from environment variables, secret managers, or encrypted config files — never from command-line arguments (visible in `ps`).
- Use `.gitignore` to exclude any file that could contain secrets (`.env*`, `*.pem`, `*.key`, `secrets/`, `credentials/`).

## Dependency Management

- Pin dependency versions. Avoid floating version ranges in production builds.
- Audit dependencies for known vulnerabilities before release (`cargo audit`, `go vuln check`, `dotnet list package --vulnerable`, `mvn dependency-check:check`).
- Minimize transitive dependencies — each dependency is an attack surface.

## Error Handling

- Never expose internal error details (stack traces, file paths, memory addresses) to external consumers.
- Log detailed errors internally. Return generic error codes externally.
- Panic/crash handlers must not leak sensitive data in crash reports.

## Security Checklist (before every commit touching security-sensitive code)

- [ ] External input validated at system boundaries
- [ ] File operations use restrictive permissions
- [ ] No shell command construction from user input
- [ ] Secrets from environment/config, not hardcoded
- [ ] Dependencies audited for vulnerabilities
- [ ] No sensitive data in error messages or logs
- [ ] Resource cleanup is deterministic (no leaks)
