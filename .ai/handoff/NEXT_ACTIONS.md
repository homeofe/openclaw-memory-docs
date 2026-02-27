# openclaw-memory-docs: Next Actions for Incoming Agent

> Priority order. Work top-down.
> Each item should be self-contained, the agent must be able to start without asking questions.
> Blocked tasks go to the bottom. Completed tasks move to "Recently Completed".

---

## T-003: Show item IDs in /list-docs and /search-docs output

**Goal:** Make `/forget-doc` usable by displaying memory item IDs in list and search output.

**GitHub issue:** [#4](https://github.com/homeofe/openclaw-memory-docs/issues/4)
**Priority:** HIGH

**Context:**
- `/forget-doc <id>` requires a UUID but users have no way to discover IDs via CLI
- `/list-docs` already shows short IDs (added in commit 3b934ab) - verify this is working
- `/search-docs` currently shows only score and text, no IDs

**What to do:**
1. In `/search-docs` handler, include `h.item.id.slice(0, 8)` in the output line
2. Add tests for the new ID display in search output
3. Verify existing `/list-docs` ID display tests still pass

**Definition of done:**
- [ ] `/search-docs` shows short IDs
- [ ] Tests updated
- [ ] All 50+ tests pass

---

## T-004: Add tag/project metadata support to /remember-doc

**Goal:** Allow users to attach tags and project names to memory items.

**GitHub issue:** [#1](https://github.com/homeofe/openclaw-memory-docs/issues/1)
**Priority:** MEDIUM
**Blocked by:** None (T-002 is done)

---

## T-005: Update README.md and SKILL.md to document all commands

**Goal:** Bring documentation up to date with all 4 commands and config options.

**GitHub issue:** [#5](https://github.com/homeofe/openclaw-memory-docs/issues/5)
**Priority:** MEDIUM
**Blocked by:** T-003 (output format should be finalized first)

---

## T-006: Implement export/sync mode for git-first workflows

**Goal:** Add an optional export mode that writes memory items to individual markdown files.

**GitHub issue:** [#2](https://github.com/homeofe/openclaw-memory-docs/issues/2)
**Priority:** LOW
**Blocked by:** T-004 (tag metadata needed for meaningful export filenames)

---

## Recently Completed

| Item | Resolution |
|------|-----------|
| T-002: Add unit tests | 50 tests covering all commands, tool, config, edge cases (2026-02-27) |
| T-001: Define v0.2 roadmap | 5 GitHub issues created and prioritized (2026-02-27) |
| Initial scaffold | Created 2026-02-24 |

---

## Reference: Key File Locations

| What | Where |
|------|-------|
| Plugin entry | `index.ts` |
| Test suite | `tests/index.test.ts` |
| Plugin config | `openclaw.plugin.json` |
| Core dependency | `../openclaw-memory-core/src/` |
