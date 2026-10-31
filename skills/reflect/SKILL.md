---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
disable-model-invocation: true
---

# Reflect

Mine the current conversation for durable learnings, then route them into skill edits.

Invoke when the user says "reflect" or "/reflect". Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## 1. Locate the active transcript

Before fanning out, render this conversation with `pstack.transcript({ file: true })` and no `sessionID`. It writes this session as markdown with `[#seq]` anchors and returns the path. The `pstack.*` session tools only see the current project. Never ask for another project's sessions. The transcript header lists subagent sessions. Render one with `pstack.transcript({ sessionID, file: true })` when a reviewer needs it. If the render fails, pass a tight digest of the session instead.

## 2. Spawn three reviewers in parallel

One message, three `subagent` calls, `agent: "general"`. Reviewers need MCP access to look up the tickets, chat threads, and observability traces the transcript references, and `explore` has none.

Each reviewer and the synthesizer name a role. Read the roles once with `pstack_roles` and set the subagent `model` to that role's value. The user chose these models for pstack, so passing them is an explicit model request. Leave `model` unset when the value is `inherit-parent`. If the `subagent` tool rejects a model, look up the closest model of the same family with `opencode.models`, use it, and say so. Pick each subagent's reasoning variant for the job, per the Subagents section of the **poteto-mode** skill (`pstack-poteto-mode`).

| Lens | Role | Prompt template |
|---|---|---|
| Judgment | `reflect judgment, divergent, synthesizer` | `references/judgment-reviewer.md` |
| Tooling | `reflect tooling` | `references/tooling-reviewer.md` |
| Divergent | `reflect judgment, divergent, synthesizer` | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the transcript path or digest where marked. Reviewers return findings in the `subagent` response body.

## 3. Synthesize

One `subagent` call, `agent: "general"`, `model` from the `reflect judgment, divergent, synthesizer` role. It spot-verifies citations through MCP, and `explore` has none. Pass `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. It returns an Accepted / Rejected / Backlog list.

## 4. Structural enforcement check

Move any Accepted item that a lint rule, script, metadata flag, or runtime check would enforce more reliably to Backlog. See the **encode-lessons-in-structure** principle skill.

## 5. Apply

Present the synthesizer's full Accepted / Rejected / Backlog output and wait for explicit approval before applying any Accepted edit. The user picks the subset and may redirect routings. Skill changes affect every future agent in the org. Do not auto-apply.

File each Backlog item to your team's devex or backlog tracker without waiting. Only the Accepted list waits for approval.

Never edit a pstack skill in the plugin's own `skills/` directory. It is generated, and the next update overwrites it. Before approval, show its destination, `.opencode/skills/<skill>/` or `~/.config/opencode/skills/<skill>/`. After approval, copy the skill folder there and edit the copy. Never open a PR or push.

Follow each approved row's Routing exactly:

- Trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): the parent does it directly.
- Substantive existing-skill edit (a new section, a new pattern table, more than ~10 lines): hand to the `skill-creator` skill and run its draft / test / iterate loop.
- `tune description: <skill path>` (the skill exists but didn't trigger when it should have): hand to `skill-creator` and run its description-optimization loop.
- `new skill via skill-creator: <kebab-name>`: hand creation to `skill-creator`. Do not invent the shape ad hoc.

If your environment ships a SKILL.md validator, run it on every touched skill before declaring done.

## 6. Summarize for the user

Short list, no preamble:

- Edits applied: `<skill path>`. What changed, one line each.
- New skills created: `<skill path>`. One line each (rare).
- Backlog filed to the devex tracker: `<issue title>` (`<tags>`). One line each.
- Dropped: one line per rejected finding + reason from the synthesizer.
