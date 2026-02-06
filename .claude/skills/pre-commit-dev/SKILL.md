# Pre-Commit Dev Workflow Skill

## Purpose
Complete pre-commit development workflow: write tests for new features/behaviors, run tests, decide whether to fix code or update tests, fix linting issues, check build, create commit, and check in with user.

## When to Use
- After implementing new features or functionality
- After modifying existing behavior
- Before committing code changes
- When user says "ready to commit" or similar

## Workflow

### Phase 1: Test Coverage Assessment (Auto)

1. **Analyze Recent Changes**
   - Use git diff to see what files changed
   - Identify new functions, components, or behaviors
   - Check if changes affect existing test coverage

2. **Determine Test Requirements**
   For each change type:
   - **New Component**: Needs rendering tests, interaction tests, prop validation
   - **New Function/Method**: Needs unit tests for happy path + edge cases
   - **Modified Behavior**: Update existing tests or add regression tests
   - **Bug Fix**: Add test that would have caught the bug
   - **Refactor Only**: Verify existing tests still pass

3. **Identify Test Gaps**
   - List what needs new tests
   - List what needs test updates
   - Skip trivial changes (typos, comments, minor formatting)

### Phase 2: Write Tests (If Needed)

1. **Follow Project Test Patterns**
   - Match existing test file structure (`__tests__/components/`, etc.)
   - Use same testing library (Jest, React Testing Library based on package.json)
   - Follow established mocking patterns
   - Match naming conventions

2. **Write Comprehensive Tests**
   ```typescript
   describe('NewFeature', () => {
     it('handles the main use case', () => { ... });
     it('handles edge case: empty input', () => { ... });
     it('handles error states', () => { ... });
   });
   ```

3. **Explain Each Test**
   Tutorial-style comments explaining:
   - What behavior is being tested
   - Why this test matters
   - What we're asserting and why

### Phase 3: Run Tests

1. **Execute Test Suite**
   ```bash
   npm test  # or yarn test, pnpm test
   ```

2. **Analyze Results**
   - All pass → Continue to Phase 4
   - Some fail → Go to Phase 3b (Triage)

### Phase 3b: Triage Test Failures

For each failing test:

1. **Read the Failure**
   - What was expected vs actual?
   - Which component/function failed?
   - Is this a new test or existing test?

2. **Determine Root Cause**
   - **Code is wrong**: Implementation has a bug
   - **Test is wrong**: Test expectations don't match intended behavior
   - **Test is outdated**: Behavior intentionally changed, test needs update
   - **Integration issue**: Mocking or setup problem

3. **Decide Action**
   - If code is wrong: Fix the implementation
   - If test is wrong/outdated: Update the test
   - Explain decision to user with reasoning

4. **Fix and Re-run**
   - Make the fix
   - Run tests again
   - Repeat until all pass

### Phase 4: Linting

1. **Run Linter**
   ```bash
   npm run lint  # Check package.json for exact command
   ```

2. **Auto-fix What You Can**
   ```bash
   npm run lint -- --fix
   ```

3. **Manual Fixes**
   - Address remaining lint errors
   - Explain why each fix is needed
   - Maintain code style consistency

### Phase 5: Type Checking (If TypeScript)

1. **Run Type Checker**
   ```bash
   npm run type-check  # or tsc --noEmit
   ```

2. **Fix Type Errors**
   - Add missing types
   - Fix incorrect type annotations
   - Resolve type incompatibilities

### Phase 6: Build Check

1. **Run Build**
   ```bash
   npm run build
   ```

2. **Handle Build Failures**
   - Read error messages carefully
   - Fix import issues, missing dependencies
   - Resolve build-time type errors
   - Verify assets compile correctly

### Phase 7: Create Commit

1. **Review Changes**
   ```bash
   git status
   git diff
   git log --oneline -5  # See recent commit style
   ```

2. **Draft Commit Message**
   - Follow repository's commit message conventions
   - Focus on "why" not just "what"
   - Be specific and concise (1-2 sentences)
   - Match the tone of recent commits

3. **Stage Files**
   ```bash
   git add path/to/file1 path/to/file2
   # Prefer specific files over git add -A
   ```

4. **Create Commit**
   ```bash
   git commit -m "$(cat <<'EOF'
   Add feature: [clear description]

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
   EOF
   )"
   ```

5. **Verify Commit**
   ```bash
   git status  # Should show clean working tree
   git log -1  # Review the commit
   ```

### Phase 8: User Check-in

Present summary to user:
```
✅ Tests: [X new tests written, all Y tests passing]
✅ Linting: Clean
✅ Type Check: Clean
✅ Build: Successful
✅ Commit: [commit hash] "[commit message]"

Changes ready! Would you like me to:
- Push to remote
- Create a pull request
- Make any adjustments
- Continue with next task
```

## Important Notes

### Test Philosophy
- **Don't over-test**: Skip tests for trivial getters/setters
- **Don't under-test**: Cover all user-facing behaviors
- **Test behavior, not implementation**: Focus on what users experience

### When to Skip Tests
- Documentation changes only
- Comment updates
- Whitespace/formatting fixes
- Configuration file updates (unless they affect behavior)

### Pre-commit Hook Handling
- If pre-commit hooks fail, fix issues and make NEW commit (not --amend)
- Never use --no-verify unless explicitly requested by user

### Error Recovery
- If any phase fails critically, stop and ask user for guidance
- Don't proceed to commit if tests/build are broken
- Be transparent about what's not working

## Example Invocation
```
User: "I just added a new filter feature, let's commit this"
User: "Tests are done, ready to commit"
User: "/pre-commit-dev"
```

## Configuration Detection

Auto-detect from package.json:
- Test command: `test`, `test:unit`, etc.
- Lint command: `lint`, `eslint`, etc.
- Build command: `build`
- Type check command: `type-check`, `tsc`

If commands don't exist, skip that phase gracefully.
