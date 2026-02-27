# openclaw-memory-docs: Trust Register

> Tracks verification status of critical system properties.
> In multi-agent pipelines, hallucinations and drift are real risks.
> Every claim here has a confidence level tied to how it was verified.

---

## Confidence Levels

| Level | Meaning |
|-------|---------|
| **verified** | An agent executed code, ran tests, or observed output to confirm this |
| **assumed** | Derived from docs, config files, or chat, not directly tested |
| **untested** | Status unknown; needs verification |

---

## Build System

| Property | Status | Last Verified | Agent | Notes |
|----------|--------|---------------|-------|-------|
| `build` passes | verified | 2026-02-27 | Claude Opus 4.6 | `tsc --noEmit` - clean |
| `test` passes | verified | 2026-02-27 | Claude Opus 4.6 | 50/50 tests passing via `vitest run` |
| `lint` passes | untested | - | - | No lint config exists |
| `type-check` passes | verified | 2026-02-27 | Claude Opus 4.6 | `tsc --noEmit` - zero errors |

---

## Plugin Behaviour

| Property | Status | Last Verified | Agent | Notes |
|----------|--------|---------------|-------|-------|
| Plugin registers correctly | verified | 2026-02-27 | Claude Opus 4.6 | Tested: 4 commands + 1 tool registered |
| memory-core dependency resolves | verified | 2026-02-27 | Claude Opus 4.6 | Imports resolve in tests |
| Commands work end-to-end | verified | 2026-02-27 | Claude Opus 4.6 | All 4 commands tested with mocked store |
| No PII leaks in output | verified | 2026-02-27 | Claude Opus 4.6 | Redaction tested with OpenAI key pattern |
| Disabled plugin registers nothing | verified | 2026-02-27 | Claude Opus 4.6 | enabled=false test passes |
| Invalid storePath handled | verified | 2026-02-27 | Claude Opus 4.6 | Logs error and skips registration |
| Limit clamping works | verified | 2026-02-27 | Claude Opus 4.6 | search max 20, list max 50, tool max 20 |

---

## Security

| Property | Status | Last Verified | Agent | Notes |
|----------|--------|---------------|-------|-------|
| No secrets in source | assumed | - | - | Pre-commit hooks configured |
| No PII written to disk unredacted | verified | 2026-02-27 | Claude Opus 4.6 | Redaction test confirms secrets replaced |
| Dependency audit clean | untested | - | - | |

---

## Update Rules (for agents)

- Change `untested` -> `verified` only after **running actual code/tests**
- Change `assumed` -> `verified` after direct confirmation
- Never downgrade `verified` without explaining why in `LOG.md`
- Add new rows when new system properties become critical

---

*Trust degrades over time. Re-verify periodically, especially after major refactors.*
