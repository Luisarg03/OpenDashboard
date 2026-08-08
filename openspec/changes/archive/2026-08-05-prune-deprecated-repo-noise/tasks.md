## 1. Preparations

- [x] 1.1 Inspect repository for tracked generated files and legacy folders (list candidates).  
  Candidates added to .gitignore: .opencode/, .cache/, src/opendashboard/static/, src/opendashboard/templates/, frontend/.vite/, frontend/*.tsbuildinfo
- [x] 1.2 Confirm with maintainers any folder that should be preserved in archive. → None to preserve.

## 2. Ignore rules

- [x] 2.1 Update repository .gitignore with entries for: __pycache__/, *.pyc, .pytest_cache/, .mypy_cache/, .cache/, dist/, build/, node_modules/, frontend/build/, src/opendashboard/static/assets/* (where generated), .venv/  
  Entries added specifically: .opencode/, .cache/, src/opendashboard/static/, src/opendashboard/templates/, frontend/.vite/, frontend/*.tsbuildinfo
- [x] 2.2 Commit .gitignore change.

## 3. Remove tracked artifacts

- [x] 3.1 For each candidate file/folder: run `git rm --cached <path>` and commit removal with message `chore: remove tracked generated artifact <path>`.
- [x] 3.2 If any removed item was required by CI/tests, revert and document exception.

## 4. Archive and cleanup

- [x] 4.1 Move intentionally preserved legacy files to openspec/changes/prune-deprecated-repo-noise/archive/ with a short README explaining why preserved. → Skipped: nothing to preserve.

## 5. Verification

- [x] 5.1 Run test suite locally: `pytest`.
- [x] 5.2 Run CI or equivalent steps locally if possible (build frontend assets, run lint/test jobs) and confirm pass.
- [x] 5.3 Confirm repository size and tracked files reduced.

## 6. Documentation

- [x] 6.1 Add short note to README.md describing how to regenerate local build artifacts and caches.
