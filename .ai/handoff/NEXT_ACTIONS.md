# openclaw-memory-docs: Next Actions for Incoming Agent

> Priority order. Work top-down.
> Each item should be self-contained, the agent must be able to start without asking questions.
> Blocked tasks go to the bottom. Completed tasks move to "Recently Completed".

---

## T-002: Add unit tests for all commands and the search tool

**Goal:** Achieve basic test coverage for the entire plugin so that future changes can be validated automatically.

**GitHub issue:** [#3](https://github.com/homeofe/openclaw-memory-docs/issues/3)
**Priority:** HIGH

**Context:**
- v0.1.1 has 4 commands (`/remember-doc`, `/search-docs`, `/list-docs`, `/forget-doc`) and 1 tool (`docs_memory_search`)
- No tests exist yet - zero coverage
- Plugin depends on `@elvatis_com/openclaw-memory-core` for store, embedder, redactor

**What to do:**
1. Add `vitest` as a dev dependency
2. Create `index.test.ts` (or `__tests__/index.test.ts`)
3. Mock or use in-memory `JsonlMemoryStore` and `DefaultRedactor`
4. Write tests for each command: valid input, empty input, edge cases
5. Write tests for `docs_memory_search` tool
6. Add `"test": "vitest run"` to `package.json` scripts
7. Verify all tests pass

**Definition of done:**
- [ ] vitest configured and working
- [ ] At least 10 test cases covering all 4 commands + 1 tool
- [ ] `pnpm test` passes with exit code 0
- [ ] DASHBOARD.md updated with test counts

---

## T-003: Show item IDs in /list-docs and /search-docs output

**Goal:** Make `/forget-doc` usable by displaying memory item IDs in list and search output.

**GitHub issue:** [#4](https://github.com/homeofe/openclaw-memory-docs/issues/4)
**Priority:** HIGH

**Context:**
- `/forget-doc <id>` requires a UUID but users have no way to discover IDs via CLI
- `/list-docs` and `/search-docs` currently show only date/score and text

**What to do:**
1. In `/list-docs` handler, include `i.id.slice(0, 8)` in the output line
2. In `/search-docs` handler, include `h.item.id.slice(0, 8)` in the output line
3. Update tests if they exist (T-002 should be done first)

**Definition of done:**
- [ ] `/list-docs` shows short IDs
- [ ] `/search-docs` shows short IDs
- [ ] Tests updated

---

## T-004: Add tag/project metadata support to /remember-doc

**Goal:** Allow users to attach tags and project names to memory items.

**GitHub issue:** [#1](https://github.com/homeofe/openclaw-memory-docs/issues/1)
**Priority:** MEDIUM
**Blocked by:** T-002 (tests should exist first)

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
| T-001: Define v0.2 roadmap | 5 GitHub issues created and prioritized (2026-02-27) |
| Initial scaffold | Created 2026-02-24 |

---

## Reference: Key File Locations

| What | Where |
|------|-------|
| Plugin entry | `index.ts` |
| Plugin config | `openclaw.plugin.json` |
| Core dependency | `../openclaw-memory-core/src/` |
