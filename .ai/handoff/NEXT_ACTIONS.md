# openclaw-memory-docs: Next Actions for Incoming Agent

> Priority order. Work top-down.
> Each item should be self-contained, the agent must be able to start without asking questions.
> Blocked tasks go to the bottom. Completed tasks move to "Recently Completed".

---

## Status Summary

| Status | Count |
|--------|-------|
| Done | 12 |
| Ready | 0 |
| Blocked | 0 |

---

## Ready - Work These Next

_No open tasks. All v0.2 features are complete._

---

## Blocked

_No blocked tasks._

---

## Recently Completed

| Task | Date | Notes |
|------|------|-------|
| T-012: /remember-doc tags + project | 2026-03-01 | Feature was already implemented in T-004. Issue #1 closed. |
| T-011: export/sync mode (git-first) | 2026-03-01 | Feature was already implemented in T-007. Issue #2 closed. |
| T-010: Add unit tests | 2026-03-01 | 131 tests already existed from T-002. Issue #3 closed. |
| T-009: /list-docs displays item IDs | 2026-03-01 | Already implemented by T-003. Verified: [id:shortId] per line + full IDs in footer. |
| T-008: Update README and SKILL.md | 2026-03-01 | Docs already comprehensive from T-005. Fixed test mock issue. |
| T-007: Add export/sync mode | 2026-02-27 | /export-docs and /import-docs commands with markdown files |
| T-006: Export/sync mode | 2026-02-27 | Superseded by T-007 |
| T-005: Update README/SKILL.md | 2026-02-27 | All commands, tool, and config documented |

---

## Reference: Key File Locations

| What | Where |
|------|-------|
| Plugin entry | `index.ts` |
| Test suite | `tests/index.test.ts` |
| Plugin config | `openclaw.plugin.json` |
| Core dependency | `../openclaw-memory-core/src/` |
| AAHP manifest | `.ai/handoff/MANIFEST.json` |
