/**
 * Canonical per-stack command defaults.
 *
 * Consumed by:
 *   - generators/claude-md.js  — builds the commands block rendered in
 *                                 the generated CLAUDE.md.
 *   - scaffold/index.js        — substitutes the [TYPE_CHECK_COMMAND]
 *                                 placeholder while interpolating templates.
 *
 * The two consumers share install/dev/build/test verbatim but diverge on
 * type-check rendering, so that field has two shapes:
 *
 *   typeCheck            — value rendered in CLAUDE.md commands block.
 *                          Empty string = no type-check line emitted.
 *   typeCheckPlaceholder — value substituted into the [TYPE_CHECK_COMMAND]
 *                          placeholder during template interpolation.
 *                          Native stacks use a comment explaining that
 *                          type checking is handled by the compiler.
 */

export const STACK_COMMANDS = {
  swift: {
    install: '# no install step',
    dev: 'swift run',
    build: 'xcodebuild build',
    test: 'xcodebuild test',
    typeCheck: '',
    typeCheckPlaceholder: '# type checking handled by compiler',
  },
  kotlin: {
    install: '# no install step',
    dev: './gradlew run',
    build: './gradlew build',
    test: './gradlew test',
    typeCheck: '',
    typeCheckPlaceholder: '# type checking handled by compiler',
  },
  rust: {
    install: '# no install step',
    dev: 'cargo run',
    build: 'cargo build --release',
    test: 'cargo test',
    typeCheck: '',
    typeCheckPlaceholder: '# type checking handled by compiler',
  },
  dotnet: {
    install: 'dotnet restore',
    dev: 'dotnet run',
    build: 'dotnet build',
    test: 'dotnet test',
    typeCheck: '',
    typeCheckPlaceholder: '# type checking handled by compiler',
  },
  java: {
    install: 'mvn install',
    dev: 'mvn exec:java',
    build: 'mvn package',
    test: 'mvn test',
    typeCheck: '',
    typeCheckPlaceholder: '# type checking handled by compiler',
  },
  python: {
    install: 'pip install -r requirements.txt',
    dev: '',
    build: '',
    test: 'pytest',
    typeCheck: '',
    typeCheckPlaceholder: 'mypy .',
  },
  go: {
    install: 'go mod download',
    dev: 'go run .',
    build: 'go build ./...',
    test: 'go test ./...',
    typeCheck: '',
    typeCheckPlaceholder: 'go vet ./...',
  },
  ruby: {
    install: 'bundle install',
    dev: 'rails server',
    build: '',
    test: 'bundle exec rspec',
    typeCheck: '',
    typeCheckPlaceholder: '',
  },
};
