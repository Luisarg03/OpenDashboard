## Context

Repository contains several generated artifacts and legacy files tracked in Git. Current state: project includes Python source, a small frontend, tests, and CI. Some generated files (compiled assets, caches) are present in the working tree and accidentally tracked. No runtime code requires these artifacts. Goal: remove tracked noise, update ignore rules, document migration.

## Goals / Non-Goals

**Goals:**
- Remove tracked generated caches and build artifacts from repository.
- Remove legacy/deprecated files and folders that have no runtime use and are not referenced.
- Update .gitignore to prevent re-adding generated files.
- Provide migration/verification steps for developers and CI.

**Non-Goals:**
- Rewriting Git history to purge files from repository size. That is out-of-scope for this change.

## Decisions

- Removal only of files that are not imported/used by code or referenced by CI. If a file is ambiguous, preserve it and document as archival.
- Do not add new tooling or dependencies. Use Git operations and .gitignore edits only.
- Keep archival copies under openspec/changes/prune-deprecated-repo-noise/archive/ if maintainers request preservation.

## Risks / Trade-offs

[CI break] → Mitigation: run CI locally where possible, update CI steps to regenerate any required build artifacts. Document changes in tasks.
[Developer confusion] → Mitigation: add clear tasks and README note with commands to regenerate local artifacts.

## Migration Plan

1. Update .gitignore with entries for common caches and build outputs.
2. Remove tracked files with `git rm --cached <path>` followed by commit. Do not run history rewrite.
3. Run tests and CI to verify no regressions.
4. If maintainers request, place preserved legacy files in openspec/changes/prune-deprecated-repo-noise/archive/ with short rationale.

## Open Questions

- Any specific legacy folders that must be preserved as historical artifacts? If yes, move to archive folder with note.
