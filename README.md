# opencode-pstack

[pstack](https://github.com/cursor/plugins/tree/main/pstack), [poteto](https://x.com/poteto)'s skills for rigorous agent work, as an [OpenCode](https://opencode.ai) V2 plugin. The skills, playbooks, principles, voice, and model split are upstream's. The harness underneath is OpenCode's.

> if you want to go fast, go deep first. — pstack

This is an unofficial port. It is not affiliated with Cursor.

## Install

Requires OpenCode V2 (2.0.16 or later).

```jsonc
// ~/.config/opencode/opencode.json or <project>/.opencode/opencode.json
{ "plugins": ["github:nexxeln/oc-pstack"] }
```

Pin a version with `github:nexxeln/oc-pstack#v0.1.0`, or point at a local clone with its absolute path.

Then the same two steps as upstream:

1. `/setup-pstack` picks a reasoning budget and a model per role. Defaults work without it.
2. `/poteto-mode <task>` whenever the work needs rigor. It is sticky: you stay in the `poteto` agent (Tab shows it) until you switch agents or say so.

Every other pstack skill is a slash command too: `/how`, `/why`, `/interrogate`, `/arena`, `/swarm`, `/reflect`, `/recall`, `/no-comments`, `/unslop`, `/tdd`, … Principles attach as `@pstack-principle-<name>`.

## How each pstack mechanism maps to OpenCode

| pstack on Cursor | here |
|---|---|
| `/poteto-mode`, a sticky mode skill with a per-turn `reminder` | the `poteto` primary agent; the `context` hook adds the reminder for that agent only |
| `poteto-agent`, `Comment Sicko` subagents | `poteto-agent`, `comment-sicko`. Edits by Comment Sicko are denied through the permission `evaluate` hook |
| `Task` with `subagent_type`, `run_in_background`, `readonly` | the `subagent` tool with `agent`, `background`; read-only roles use `explore` |
| `~/.cursor/rules/pstack-models.mdc` | `pstack_roles`, stored in plugin storage. Unset roles resolve to the newest claude opus, gpt sol, and grok on your provider, with the budget's variant |
| the todo list | `pstack_todo`, shown in the session sidebar (TUI entry) |
| `/loop` | `/loop [30m] <prompt>` for you, `pstack_loop` for the agent. Dynamic mode re-prompts when the session goes idle; it stops on failure or a user interrupt |
| `/goal` | `pstack_goal`, restated to the agent every turn until cleared |
| cloud agents, `cloud_base_branch` | background subagents, one worktree each (`rift.create` or `git worktree add`) |
| `agent-transcripts/*.jsonl` | `tools.pstack.sessions / search / transcript` in code mode, scoped to the current project |
| `control-ui`, `control-cli`, `deslop` (cursor-team-kit) | OpenCode's `browser` tools, a shell-driven terminal, and an inline deslop pass |
| `create-skill` | `skill-creator` when installed, else OpenCode's SKILL.md format |
| `make-bot-ui` | dropped. It only drives Cursor's Grok Bot webhooks |

## Development

- `vendor/pstack` is upstream's `skills/` and `agents/`, unedited. `vendor/UPSTREAM` records the commit.
- `skills/` and `agents/` are generated. Don't edit them by hand. `overlay/patches.ts` holds exact passage rewrites, and `overlay/skills/` holds files that replace upstream's outright. `scripts/port.ts` applies the patches, then table-driven renames, then the overlay. It fails when a patch no longer matches upstream or when a Cursor mechanism survives, so an upstream bump shows exactly what to re-port.
- `src/` is the plugin: `index.ts` (server) and `tui.tsx` (sidebar). `server.ts` and `tui.ts` are the entry points OpenCode resolves for a local directory.
- To work on the plugin, add your clone's absolute path to `plugins` in your global config. OpenCode hot-reloads it when the code changes, but not when only `skills/` or `agents/` change, so restart OpenCode after `bun run port`. Don't also load it from a project config: a second entry with the same plugin ID fails to load.

```sh
bun install
bun run port        # regenerate skills/ and agents/
bun run typecheck
bun run test
```

To update upstream, copy `skills/` and `agents/` from a newer `cursor/plugins` checkout into `vendor/pstack`, update `vendor/UPSTREAM`, run `bun run port`, and fix whatever patch it reports.

## Gaps in OpenCode this works around

1. **Plugins can't read sessions.** `src/transcripts.ts` reads `opencode.db` read-only and copies the CLI's database-path logic. Needs `list`, `export`, `message.list` on the plugin `SessionDomain`.
2. **No content search.** Same file, `LIKE` over extracted text. Needs server-side `session.search`.
3. **A second transcript renderer.** `render()` duplicates the TUI's `formatSessionTranscript` and adds a `calls` tools level. Needs the renderer in core behind a markdown `session.export`.
4. **No core todo tool.** `pstack_todo` plus an RPC-backed sidebar slot stand in.
5. **No per-agent prompt addendum.** `agent.system` replaces the whole base prompt, so the mode reminder, the agent bodies, and the goal ride the `context` hook. They miss compaction requests and never enter durable instructions. Instruction entries (`session.instructions.entry.*`) would fix it once the plugin `SessionDomain` exposes them.
6. **Global `permission` overrides plugin agent rules.** Config appends it after every agent's rules, so `"*": "allow"` also unlocks built-in `explore` and `plan`. pstack enforces Comment Sicko through the `evaluate` hook.
7. **The `subagent` tool says "NEVER set `model`".** pstack's role routing needs it. The skills say the roles count as the user's explicit request.
8. **Subagent depth defaults to 1.** `swarm`, `arena`, and `interrogate` can't run inside a `poteto-agent` delegate unless `experimental.subagent_depth` is raised.
9. **No `agent.add`.** `update` on a new id creates the agent. It works but is undocumented.
10. **Returning `output` without an `output` schema type-checks but fails at call time.**

## Status

Early. Tested against OpenCode 2.0.16: skills, agents, and commands register; `/loop`, `pstack_goal`, `pstack_roles`, the todo RPC, and Comment Sicko's edit deny work end to end. The session tools read OpenCode's database directly (gap 1), so a schema change in OpenCode can break them until the plugin API exposes sessions. Not yet exercised: the sidebar in a real TUI, `/setup-pstack` end to end, and a full playbook run.

## License

MIT. pstack's skills, playbooks, and agents are © Lauren Tan. See [LICENSE](LICENSE).
