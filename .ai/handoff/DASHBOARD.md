# openclaw-memory-docs: Build Dashboard

> Single source of truth for build health, test coverage, and pipeline state.
> Updated by agents at the end of every completed task.

---

## Components

| Name | Version | Build | Tests | Status | Notes |
|------|---------|-------|-------|--------|-------|
| openclaw-memory-docs | 0.1.1 | OK (Verified) | 50/50 OK | Active | OpenClaw memory plugin (docs) |

**Legend:** OK passing - FAIL failing - stub/mock - pending - blocked

---

## Test Coverage

| Suite | Tests | Status | Last Run |
|-------|-------|--------|----------|
| unit | 50 | OK | 2026-02-27 |

---

## Pipeline State

| Field | Value |
|-------|-------|
| Current task | T-003: Show item IDs in /search-docs output (#4) |
| Phase | ready |
| Last completed | T-002: Add unit tests (2026-02-27) |
| Rate limit | None |

---

## v0.2 Roadmap (GitHub Issues)

| # | Title | Priority | Labels | Status |
|---|-------|----------|--------|--------|
| [#3](https://github.com/homeofe/openclaw-memory-docs/issues/3) | Add unit tests for all commands and the search tool | HIGH | enhancement, v0.2 | Done |
| [#4](https://github.com/homeofe/openclaw-memory-docs/issues/4) | /list-docs should display item IDs for use with /forget-doc | HIGH | bug, v0.2 | Open |
| [#1](https://github.com/homeofe/openclaw-memory-docs/issues/1) | /remember-doc supports tags + project | MEDIUM | enhancement, v0.2 | Open |
| [#5](https://github.com/homeofe/openclaw-memory-docs/issues/5) | Update README and SKILL.md to document all commands | MEDIUM | documentation, v0.2 | Open |
| [#2](https://github.com/homeofe/openclaw-memory-docs/issues/2) | export/sync mode (git-first) | LOW | enhancement, v0.2 | Open |

**Recommended order:** #4 (ID display fix) -> #1 (tag support) -> #5 (docs update) -> #2 (export mode)

---

## Open Tasks (strategic priority)

| ID | Task | Priority | Blocked by | Ready? |
|----|------|----------|-----------|--------|
| T-003 | Show item IDs in /list-docs and /search-docs output (#4) | HIGH | - | OK Ready |
| T-004 | Add tag/project metadata support to /remember-doc (#1) | MEDIUM | T-002 (done) | OK Ready |
| T-005 | Update README.md and SKILL.md with all commands (#5) | MEDIUM | T-003 | Blocked |
| T-006 | Implement export/sync mode for git-first workflows (#2) | LOW | T-004 | Blocked |

---

## Completed Tasks

| ID | Task | Completed |
|----|------|-----------|
| T-001 | Define v0.2 roadmap items as issues and prioritize | 2026-02-27 |
| T-002 | Add unit tests for all commands and search tool (#3) | 2026-02-27 |

---

## Update Instructions (for agents)

After completing any task:

1. Update the relevant row to OK with current date
2. Update test counts
3. Update "Pipeline State"
4. Move completed task out of "Open Tasks"
5. Add newly discovered tasks with correct priority
