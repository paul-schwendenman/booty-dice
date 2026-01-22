# CI Checks

Run all CI checks to ensure the build will pass before pushing.

## Steps

Run these commands in sequence, stopping if any fail:

1. **Format check**: `pnpm lint`
2. **Type check**: `pnpm check`
3. **Build**: `pnpm build`
4. **Unit tests**: `pnpm test:run`

## On Failure

If any check fails:

- For lint failures: Run `pnpm format` to auto-fix formatting, then re-run lint
- For type errors: Fix the reported TypeScript/Svelte errors
- For build errors: Address compilation issues
- For test failures: Fix the failing tests

Report which step failed and provide guidance on how to fix it.
