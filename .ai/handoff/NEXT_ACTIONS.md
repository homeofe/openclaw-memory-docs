# openclaw-memory-docs: Next Actions for Incoming Agent

> Priority order. Work top-down.
> Each item should be self-contained, the agent must be able to start without asking questions.
> Blocked tasks go to the bottom. Completed tasks move to "Recently Completed".

---

## Status Summary

| Status | Count |
|--------|-------|
| Done | 8 |
| Ready | 4 |
| Blocked | 0 |

---

## Ready - Work These Next

### T-009: /list-docs should display item IDs for use with /forget-doc

**Goal:** Make `/forget-doc` usable by ensuring item IDs are prominently displayed in `/list-docs` output.

**GitHub issue:** [#4](https://github.com/elvatis/openclaw-memory-docs/issues/4)
**Priority:** HIGH

**Context:**
- `/forget-doc <id>` requires a UUID but users need a clear way to discover IDs
- `/list-docs` already shows short IDs `[id:abc12345]` in output (added previously)
- The full IDs are appended at the end of the list output
- Issue may already be resolved - verify current behavior matches expected behavior from issue description

**What to do:**
1. Check issue #4 description for the exact expected output format
2. Compare with current `/list-docs` output format in `index.ts:308-314`
3. If already resolved, close the issue and mark done
4. If not, adjust the output format to match expectations
5. Ensure tests cover the ID display behavior

**Files:** `index.ts`, `tests/index.test.ts`

**Definition of done:**
- [ ] `/list-docs` output shows item IDs in a user-friendly format
- [ ] Tests verify ID display
- [ ] GitHub issue #4 closed

---

### T-010: Add unit tests for all commands and the search tool

**Goal:** Ensure comprehensive test coverage for all plugin commands and the search tool.

**GitHub issue:** [#3](https://github.com/elvatis/openclaw-memory-docs/issues/3)
**Priority:** MEDIUM

**Context:**
- 131 tests already exist in `tests/index.test.ts` covering all commands
- This issue was created when there were zero tests, but T-002 already added tests
- Verify current coverage meets the acceptance criteria in issue #3
- If already resolved, close the issue and mark done

**What to do:**
1. Check issue #3 acceptance criteria
2. Verify existing tests cover: `/remember-doc`, `/search-docs`, `/list-docs`, `/forget-doc`, `/export-docs`, `/import-docs`, `docs_memory_search` tool
3. If coverage is sufficient, close issue and mark done
4. If gaps exist, add missing tests

**Files:** `tests/index.test.ts`

**Definition of done:**
- [ ] All commands have unit tests
- [ ] Search tool has unit tests
- [ ] Edge cases covered (empty input, invalid args, etc.)
- [ ] GitHub issue #3 closed

---

### T-011: export/sync mode (git-first)

**Goal:** Optional export mode that writes docs memory to a directory of markdown files for repo/wiki sync.

**GitHub issue:** [#2](https://github.com/elvatis/openclaw-memory-docs/issues/2)
**Priority:** MEDIUM

**Context:**
- `/export-docs` and `/import-docs` commands already exist (added in T-007)
- `exportPath` config option already exists
- This issue was created before export/import was implemented
- Likely already resolved - verify against issue #2 acceptance criteria

**What to do:**
1. Check issue #2 acceptance criteria
2. Verify `/export-docs` and `/import-docs` meet all requirements
3. If already resolved, close issue and mark done
4. If gaps exist, implement remaining features

**Files:** `index.ts`, `tests/index.test.ts`

**Definition of done:**
- [ ] Export produces deterministic filenames
- [ ] No secrets in exported files
- [ ] Config option for export directory
- [ ] GitHub issue #2 closed

---

### T-012: /remember-doc supports tags + project

**Goal:** Allow `/remember-doc` to accept `--tags` and `--project` flags for metadata.

**GitHub issue:** [#1](https://github.com/elvatis/openclaw-memory-docs/issues/1)
**Priority:** MEDIUM

**Context:**
- `/remember-doc --tags t1,t2 --project name <text>` already works (added in T-004)
- Tags are merged with `defaultTags` from config
- Project is stored in item metadata
- This issue was created before the feature was implemented
- Likely already resolved - verify against issue #1 acceptance criteria

**What to do:**
1. Check issue #1 acceptance criteria
2. Verify current `/remember-doc` flag support matches requirements
3. If already resolved, close issue and mark done
4. If gaps exist, implement remaining features

**Files:** `index.ts`, `tests/index.test.ts`

**Definition of done:**
- [ ] `/remember-doc` supports `--tags` flag
- [ ] `/remember-doc` supports `--project` flag
- [ ] Tags/project visible in search results
- [ ] GitHub issue #1 closed

---

## Blocked

_No blocked tasks._

---

## Recently Completed

| Task | Date | Notes |
|------|------|-------|
| T-008: Update README and SKILL.md | 2026-03-01 | Docs already comprehensive from T-005. Fixed test mock issue. |
| T-007: Add export/sync mode | 2026-02-27 | /export-docs and /import-docs commands with markdown files |
| T-006: Export/sync mode | 2026-02-27 | Superseded by T-007 |
| T-005: Update README/SKILL.md | 2026-02-27 | All commands, tool, and config documented |
| T-004: Tag/project metadata | 2026-02-27 | --tags and --project flags for /remember-doc |

---

## Reference: Key File Locations

| What | Where |
|------|-------|
| Plugin entry | `index.ts` |
| Test suite | `tests/index.test.ts` |
| Plugin config | `openclaw.plugin.json` |
| Core dependency | `../openclaw-memory-core/src/` |
| AAHP manifest | `.ai/handoff/MANIFEST.json` |
