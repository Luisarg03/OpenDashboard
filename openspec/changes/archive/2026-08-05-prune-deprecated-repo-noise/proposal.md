## Why

Repository contains generated caches, build artifacts, and legacy leftovers that are tracked in Git. These files increase noise, inflate repository size, and cause accidental commits and CI slowdowns. Cleanup now to reduce maintenance burden and prevent future accidental check-ins.

## What Changes

- Remove tracked generated caches and build artifacts from the repository (examples: __pycache__/, *.pyc, .pytest_cache/, .mypy_cache/, .cache/, dist/, build/, frontend build outputs, compiled/static assets tracked in src/ or frontend/).
- Remove legacy or deprecated files and folders that have no runtime use and are not referenced by current code or CI.
- Add or update .gitignore to prevent re-adding generated files and common build outputs.
- Preserve intentional archival or historical documentation in a documented archive location (see Design/Migration).

**BREAKING**: None expected for runtime behavior. Potential CI/test adjustments if tests rely on in-repo generated artifacts.

## Capabilities

### New Capabilities
- none

### Modified Capabilities
- none

## Impact

- Affected code: no runtime application code will be modified. Only tracked artifacts and legacy files will be removed.
- CI: some CI workflows may need minor adjustments if they previously relied on tracked build artifacts.
- Repositories/clones: developers will need to pull the PR and regenerate any local build artifacts after merge.
- History rewrite: this change does not rewrite Git history. Removing files from historical commits is out-of-scope for this change and, if required, will be handled as a follow-up with explicit approval.
