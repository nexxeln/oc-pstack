// Exact upstream passages that name Cursor mechanisms, rewritten for OpenCode.
// Every `find` must match its file; scripts/port.ts fails when upstream drifts.

const ROLE_RULE =
  "Each spawn below names a role line in the `pstack-models.mdc` rule and a default. Set `model` to that line's value, or to the default if the rule or the line is missing. Leave `model` unset when the value is `auto` or `inherit-parent`. If the Task tool rejects a slug, use the default and say so. If it rejects the default, use the closest valid slug of the same family from its error message."
const ROLE_NATIVE =
  "Each spawn below names a role. Read the roles once with `pstack_roles` and set the subagent `model` to that role's value. The user chose these models for pstack, so passing them is an explicit model request. Leave `model` unset when the value is `inherit-parent`. If the `subagent` tool rejects a model, look up the closest model of the same family with `opencode.models`, use it, and say so."

const WORKTREE = "its own worktree (`rift.create` when available, otherwise `git worktree add`)"
const CONTROL_UI = "OpenCode's `browser` tools"
const CONTROL_CLI = "a real terminal driven through the shell"
const DESLOP =
  "a deslop pass (reread the diff and delete dead code, needless layers, defensive noise, and narrating comments per **principle-laziness-protocol**)"
const SKILL_FORMAT = "the `skill-creator` skill when installed, otherwise OpenCode's skill format (a `SKILL.md` with `name` and `description` frontmatter)"

export const drop = ["skills/make-bot-ui"]

export const patches: Record<string, Array<[string, string]>> = {
  "skills/how/SKILL.md": [[ROLE_RULE, ROLE_NATIVE]],
  "skills/why/SKILL.md": [
    [ROLE_RULE, ROLE_NATIVE],
    [
      "list the available MCPs from the Cursor environment. Use the available-tools map when present. Otherwise inspect the `mcps/` directory Cursor exposes for enabled MCP servers.",
      "list the available MCP servers. They are the namespaces in your code-mode tool catalog and the `mcp_instructions` in your context. Search the catalog with `search` inside `execute` when a namespace is collapsed.",
    ],
    [
      "- `readonly`: `false` (agent mode). **Do not use readonly/Ask mode.** It strips MCP access, which disables MCP-backed investigators entirely. Investigators still shouldn't write anything.",
      "- Never `explore`: MCP-backed investigators need the full tool set. Investigators still shouldn't write anything.",
    ],
    [
      "- `readonly`: `false` (agent mode). The synthesizer's quality check spot-verifies citations, which can require MCP access. Readonly/Ask mode strips MCPs and defeats that.",
      "- Never `explore`: the synthesizer's quality check spot-verifies citations, which can require MCP access.",
    ],
  ],
  "skills/reflect/SKILL.md": [
    [ROLE_RULE.replace("Each spawn below names", "Each reviewer and the synthesizer name"), ROLE_NATIVE.replace("Each spawn below names a role", "Each reviewer and the synthesizer name a role")],
    [", with `model` set as below, agent mode (`readonly: false`).", ", with `model` set as below."],
    [
      "One `Task` call, `subagent_type: generalPurpose`, with `model` from the `reflect judgment, divergent, synthesizer` line (default `claude-opus-5-5-max`), agent mode (`readonly: false`).",
      'One `subagent` call, `agent: "general"`, with `model` from the `reflect judgment, divergent, synthesizer` role.',
    ],
    [" Reviewers need MCP access for context lookups (tickets, chat threads, observability traces referenced in the transcript). Readonly strips MCPs.", " Reviewers need MCP access for context lookups (tickets, chat threads, observability traces referenced in the transcript), which `general` has."],
    [" The synthesizer's quality check includes spot-verifying citations, which can require MCP access. Readonly strips MCPs.", " The synthesizer's quality check includes spot-verifying citations, which can require MCP access."],
    ["| Lens | Role line | Default `model` | Prompt template |\n|---|---|---|---|", "| Lens | Role | Prompt template |\n|---|---|---|"],
    ["| `reflect judgment, divergent, synthesizer` | `claude-opus-5-5-max` | `references/judgment-reviewer.md` |", "| `reflect judgment, divergent, synthesizer` | `references/judgment-reviewer.md` |"],
    ["| `reflect tooling` | `gpt-5.6-sol-max` | `references/tooling-reviewer.md` |", "| `reflect tooling` | `references/tooling-reviewer.md` |"],
    ["| `reflect judgment, divergent, synthesizer` | `claude-opus-5-5-max` | `references/divergent-reviewer.md` |", "| `reflect judgment, divergent, synthesizer` | `references/divergent-reviewer.md` |"],
    [
      "The parent finds its own transcript file before fanning out. The system prompt names the active workspace's `agent-transcripts/` directory. Use that path. Do not glob across `~/.cursor/projects/*/`. That crosses workspace boundaries and reads private chats from unrelated projects.",
      'The parent renders its own session before fanning out. Call `pstack.transcript({ file: true })` with no `sessionID`. It writes this session as markdown with `[#seq]` anchors and returns the path. The `pstack.*` session tools only see the current project. Never ask for another project\'s sessions.',
    ],
    ["```bash\nls -t <agent-transcripts>/*.jsonl <agent-transcripts>/*/*.jsonl <agent-transcripts>/*/subagents/*.jsonl 2>/dev/null | head -10\n```\n\n", ""],
    [
      "Three transcript layouts: legacy flat (`<id>.jsonl`), current nested (`<id>/<id>.jsonl`), and subagent (`<parent>/subagents/<child>.jsonl`).\n\nFor each candidate, read the first JSONL line and check that `message.content[0].text` contains the conversation's opening user prompt. Take the matching path. If no path resolves, write a tight digest of the session and pass that instead.",
      "Subagent sessions are listed in the transcript header. Render one with `pstack.transcript({ sessionID, file: true })` when a reviewer needs it. If the render fails, write a tight digest of the session and pass that instead.",
    ],
  ],
  "skills/interrogate/SKILL.md": [
    [
      "Use the `interrogate reviewers` line in `~/.cursor/rules/pstack-models.mdc`, one reviewer per entry, extending or shrinking the Reviewer A/B/C labels below to the configured entry count. If the rule or that line is missing, use the table defaults.\n\n| Subagent | Default model |\n|----------|---------------|\n| Reviewer A | `claude-opus-5-5-max` |\n| Reviewer B | `gpt-5.6-sol-max` |\n| Reviewer C | `grok-4.7-xhigh-fast` |",
      "Use the `interrogate reviewers` role from `pstack_roles`, one reviewer per entry, labelled Reviewer A, B, C, and onward to the entry count. The default panel is one model each from the claude, gpt, and grok families.",
    ],
    [
      "- `model`: the configured `interrogate reviewers` entry, or the table default with no configured line. For an `auto` or `inherit-parent` entry, omit `model` so that reviewer runs on the parent model.\n- `readonly`: `true`",
      "- `model`: its `interrogate reviewers` entry. The user chose these models for pstack, so passing them is an explicit model request. For an `inherit-parent` entry, omit `model` so that reviewer runs on the parent model.\n- `agent`: `explore` keeps the reviewer read-only. Use `general` when the review needs MCP lookups.",
    ],
    [
      "If the Task tool rejects a configured entry, run that reviewer on the table default of its family and say so. Families go by prefix: `claude-*`, `gpt-*`, and `grok-*`. With no family match, use Reviewer A's default. If it rejects a table default, check the valid slugs in the Task tool's error message, pick the closest equivalent (prefer the highest-reasoning tier of the same family), spawn with it, and open a separate PR to update the default table. Do not block the review on the slug issue. Never treat an alias entry as a rejected slug or apply either fallback to it.",
      "If the `subagent` tool rejects an entry, look up the closest model of the same family with `opencode.models` (prefer the highest-reasoning variant), spawn with it, and say so. Families go by model id: `claude-*`, `gpt-*`, and `grok-*`. Do not block the review on a model issue. Never treat `inherit-parent` as a rejected model.",
    ],
    ["- `subagent_type`: `generalPurpose`\n", ""],
  ],
  "skills/arena/SKILL.md": [
    [
      "Use the `arena runners` line in `~/.cursor/rules/pstack-models.mdc`. If the rule or that line is missing, default to one each on `claude-opus-5-5-max`, `gpt-5.6-sol-max`, `grok-4.7-xhigh-fast`. An `auto` or `inherit-parent` entry in this line or the cross-judge line means the parent model, so omit `model` for it. If the Task tool rejects a configured entry, run that seat on its family's default and say so. Families go by prefix: `claude-*`, `gpt-*`, and `grok-*`. With no family match, use `claude-opus-5-5-max`. If it rejects a default, use the closest valid slug of the same family from its error message.",
      "Use the `arena runners` role from `pstack_roles`. The default is one each from the claude, gpt, and grok families. The user chose these models for pstack, so passing them is an explicit model request. An `inherit-parent` entry in this role or the cross-judge role means the parent model, so omit `model` for it. If the `subagent` tool rejects an entry, run that seat on the closest model of its family from `opencode.models` and say so. Families go by model id: `claude-*`, `gpt-*`, and `grok-*`.",
    ],
    [
      "choose one model from the `arena cross-judge pool` line in `~/.cursor/rules/pstack-models.mdc`. If the rule or that line is missing, choose from `claude-opus-5-5-max`, `gpt-5.6-sol-max`, `grok-4.7-xhigh-fast`. Prefer a different model family from the parent's. Spawn one readonly judge subagent on that model.",
      "choose one model from the `arena cross-judge pool` role in `pstack_roles`. Prefer a different model family from the parent's. Spawn one read-only judge subagent (`agent: explore`) on that model.",
    ],
    ["(a git worktree where possible, otherwise `/tmp/arena-<slug>/candidate-<n>/`)", "(its own worktree where possible, via `rift.create` or `git worktree add`, otherwise `/tmp/arena-<slug>/candidate-<n>/`)"],
  ],
  "skills/architect/SKILL.md": [
    [
      "Take the runners from the `architect runners` line in the `pstack-models.mdc` rule, in place of the `arena runners` line. If the rule or that line is missing, use `claude-opus-5-5-max`, `gpt-5.6-sol-max`, `grok-4.7-xhigh-fast`. Alias and rejected entries follow the runner rules in the **arena** skill's Phase A.",
      "Take the runners from the `architect runners` role in `pstack_roles`, in place of the `arena runners` role. `inherit-parent` and rejected entries follow the runner rules in the **arena** skill's Phase A.",
    ],
  ],
  "skills/swarm/SKILL.md": [
    ["Fan out N parallel cloud workers.", "Fan out N parallel background workers."],
    ["N is total workers, not the cloud concurrency limit.", "N is total workers, not a concurrency limit."],
    [
      "Pick the worker model from the `swarm workers` line in `~/.cursor/rules/pstack-models.mdc`. If the rule or that line is missing, use `grok-4.7-xhigh-fast`. For `auto` or `inherit-parent`, omit `model` so the workers run on the parent model. If the Task tool rejects a slug, use the default and say so. If it rejects the default, use the closest valid slug of the same family from its error message.",
      "Pick the worker model from the `swarm workers` role in `pstack_roles`. The user chose it for pstack, so passing it is an explicit model request. For `inherit-parent`, omit `model` so the workers run on the parent model. If the `subagent` tool rejects it, use the closest model of the same family from `opencode.models` and say so.",
    ],
    [
      "Spawn all N workers in one message with `subagent_type: generalPurpose`, `environment: \"cloud\"`, `run_in_background: true`, and the step 4 model, left unset for `auto` or `inherit-parent`. Use `environment: \"local\"` only when the worker needs access to something on the user's computer.",
      `Spawn all N workers in one message with the \`subagent\` tool, \`agent: "general"\`, \`background: true\`, and the step 4 model, left unset for \`inherit-parent\`. A worker that writes gets ${WORKTREE}, named in its brief.`,
    ],
    ["When a worker must start from a non-default pushed branch, pass `cloud_base_branch`.", "When a worker must start from a non-default pushed branch, create its worktree at that branch."],
  ],
  "skills/poteto-mode/SKILL.md": [
    ["Agent-facing prose also follows the **create-skill** skill (Cursor's built-in for authoring SKILL.md files).", `Agent-facing prose also follows ${SKILL_FORMAT}.`],
    ["- Before commit → the `deslop` skill from the `cursor-team-kit` plugin (`/deslop`).", `- Before commit → ${DESLOP}.`],
    [
      "- Shipping UI / IDE / CLI → the matching control skill. `cursor-team-kit` publishes `control-cli` (CLIs and TUIs) and `control-ui` (browser / Electron / web UIs).",
      `- Shipping UI / IDE / CLI → drive the real surface. Browser, Electron, and web UIs use ${CONTROL_UI}. CLIs and TUIs use ${CONTROL_CLI}. A repo's own \`verify-*\` skill wins over both.`,
    ],
    [", and not Cursor's built-in babysit skill, whose description matches the same words.", "."],
    ["Read the leaf skill in full for any principle you apply.", "Read the leaf skill in full for any principle you apply. Principle skills load as `pstack-principle-<name>`."],
    ["**Use `subagent_type: \"poteto-agent\"` for any subagent you spawn inside a playbook step**", "**Use `agent: \"poteto-agent\"` for any subagent you spawn inside a playbook step**"],
    ["set their own `subagent_type` for diverse-model review.", "set their own `agent` for diverse-model review."],
    [
      "**Defaults for every `Task` call.** `run_in_background: true`, agent mode (readonly strips MCP), file pointers not inlined context, explicit model per role (configurable via `/setup-pstack`. Defaults `grok-4.7-xhigh-fast` for code, `claude-opus-5-5-max` for prose and judgment). Code delegates tier by difficulty. The hardest changes (cross-cutting design, gnarly concurrency, subtle algorithms) go to your strongest judgment model (`claude-opus-5-5-max`),",
      "**Defaults for every `subagent` call.** `background: true`, a full-access agent (`poteto-agent` or `general`, never `explore` when the work writes or needs MCP), file pointers not inlined context, explicit model per role from `pstack_roles` (configurable via `/setup-pstack`. Defaults a grok model for code, a claude opus model for prose and judgment). The user chose these models for pstack, so passing them is an explicit model request. Code delegates tier by difficulty. The hardest changes (cross-cutting design, gnarly concurrency, subtle algorithms) go to your strongest judgment model (the `hardest tasks` role),",
    ],
    [
      "Per-role lines in the `/setup-pstack` rule override these defaults and the model choices in the routed skills (`how`, `why`, `arena`, `swarm`, `architect`, `interrogate`, `reflect`). A role with no line keeps its default, and a role line of `inherit-parent` or `auto` runs that role on the parent chat model (omit Task `model`). Each code playbook's configured model comes from its line",
      "Roles set by `/setup-pstack` override these defaults and the model choices in the routed skills (`how`, `why`, `arena`, `swarm`, `architect`, `interrogate`, `reflect`). An unset role keeps its default, and a role of `inherit-parent` runs on the parent session's model (omit `model`). Each code playbook's configured model comes from its role",
    ],
    ["from a transcript, cloud-agent URL, or pushed branch.", "from a session, a share link, or a pushed branch."],
    ["going offline, a Cursor restart, or imminent context compaction.", "going offline, an OpenCode restart, or imminent context compaction."],
    ["Open a todolist whose first items are the matched playbook's steps", "Open a `pstack_todo` list whose first items are the matched playbook's steps"],
  ],
  "skills/poteto-mode/playbooks/bug-fix.md": [["Drive a long or stubborn hunt with Cursor's `/loop` command.", "Drive a long or stubborn hunt with `pstack_loop`."]],
  "skills/poteto-mode/playbooks/autonomous-run.md": [
    ["Pick the wake mechanism using Cursor's `/loop` command (a built-in, not a pstack skill).", "Pick the wake mechanism with `pstack_loop` (the agent side of the user's `/loop`)."],
  ],
  "skills/poteto-mode/playbooks/authoring-a-skill.md": [["1. Use the **create-skill** skill (Cursor's built-in for authoring SKILL.md files).", `1. Use ${SKILL_FORMAT}.`]],
  "skills/poteto-mode/playbooks/visual-parity.md": [["`/loop` per component until the diff is zero.", "Loop per component with `pstack_loop` until the diff is zero."]],
  "skills/poteto-mode/playbooks/opening-a-pr.md": [
    ["Run `/deslop` from `cursor-team-kit` over the diff before commit.", `Run ${DESLOP} before commit.`],
    ["Cloud-agent PR tools default to draft, so set `draft: false` on every PR creation call.", "Set `draft: false` on every PR creation call that takes one."],
  ],
  "skills/poteto-mode/playbooks/babysit.md": [
    [" This playbook replaces Cursor's built-in babysit skill for these requests, so do not route there even though its description matches the same words.", ""],
    ["Run `drive` and `background` under `/loop` in dynamic mode.", "Run `drive` and `background` under `pstack_loop` in dynamic mode (no `every`)."],
  ],
  "skills/poteto-mode/playbooks/shipping.md": [
    [
      "each a Cursor cloud agent, each exercising the real surface with the matching control skill (such as `control-ui` or `control-cli` from `cursor-team-kit`) against parent versus head.",
      `each a background subagent in ${WORKTREE}, each exercising the real surface (${CONTROL_UI} or ${CONTROL_CLI}) against parent versus head.`,
    ],
    ["Hold the watch under `/loop` in dynamic mode.", "Hold the watch under `pstack_loop` in dynamic mode (no `every`)."],
  ],
  "skills/poteto-mode/playbooks/multi-phase-plan.md": [
    [
      "Browser, Electron, and web UIs use `control-ui` from `cursor-team-kit`. CLIs and TUIs use `control-cli` from `cursor-team-kit`.",
      `Browser, Electron, and web UIs use ${CONTROL_UI}. CLIs and TUIs use ${CONTROL_CLI}.`,
    ],
    ["A surface with no control skill is a risk", "A surface with no driver is a risk"],
    ["In a local session, a real terminal `/loop`. In a cloud root, a cloud-sleeper wake chain.", "Arm it with `pstack_loop` and `every: \"30m\"`."],
    ["Each live lane runs on its own cloud VM at the PR head. Drive through `control-ui` or `control-cli` from `cursor-team-kit`.", `Each live lane runs in ${WORKTREE} at the PR head. Drive through ${CONTROL_UI} or ${CONTROL_CLI}.`],
  ],
  "skills/poteto-mode/playbooks/autopilot-full.md": [
    ["One Cursor cloud agent per PR owns build,", `One background subagent per PR, in ${WORKTREE}, owns build,`],
    ["a slop-strip (the `deslop` skill from the `cursor-team-kit` plugin (`/deslop`))", `a slop-strip (${DESLOP})`],
    ["(with the matching control skill, such as `control-cli` or `control-ui` from `cursor-team-kit`, or a named driver where none exists)", `(with ${CONTROL_UI}, ${CONTROL_CLI}, or a named driver where neither fits)`],
    [
      "A local root arms each tick as a real terminal `/loop`. The loop uses a monitored-shell 30-minute sleep and emits an output-notification sentinel. A cloud root uses the existing cloud-sleeper wake chain instead.",
      "The root arms each tick with `pstack_loop` and `every: \"30m\"`.",
    ],
  ],
  "skills/poteto-mode/playbooks/autopilot-stack.md": [
    ["One Cursor cloud agent per PR owns its change end to end:", `One background subagent per PR, in ${WORKTREE}, owns its change end to end:`],
    ["a slop-strip (the `deslop` skill from the `cursor-team-kit` plugin (`/deslop`))", `a slop-strip (${DESLOP})`],
    [
      "A local root arms each tick as a real terminal `/loop`. The loop uses a monitored-shell 30-minute sleep and emits an output-notification sentinel. A cloud root uses the existing cloud-sleeper wake chain instead.",
      "The root arms each tick with `pstack_loop` and `every: \"30m\"`.",
    ],
  ],
  "skills/poteto-mode/playbooks/orchestrate.md": [
    [
      "Always `environment: \"cloud\"` unless the task needs this machine: `control-ui` or `control-cli` runtime verification (from `cursor-team-kit`). Reading local transcripts under `agent-transcripts/`. Simulators and local IDE state. Auth that exists only here. Cloud agents cannot read the local store, so their briefs inline what they need or point at repo paths.",
      `A background subagent in ${WORKTREE}. Briefs point at repo and store paths instead of inlining them.`,
    ],
    ["Local spawns may reference the standing-orders file by store path. Verbatim paste is for cloud spawns and every resume.", "Spawns may reference the standing-orders file by store path. Verbatim paste is for every resume."],
    ["its spawn budget with the cloud default and the local exception list,", "its spawn budget,"],
    ["Restacks run in cloud. A local restack at this scale takes the laptop down.", "Restacks run one at a time in the stacker's own worktree."],
    ["pushed branches, the cloud agent's status in the Cursor dashboard. Transcript mtime is not liveness.", "pushed branches, the subagent session's status from `pstack.sessions({ children: true })`. Session `updated` time is not liveness."],
    [
      "After a Cursor restart: local agents are dead, cloud work is not. Re-read the standing orders and `units.tsv`, recompute the frontier, reattach cloud work by PR and branch rather than agent id,",
      "After an OpenCode restart: running subagents may have stopped. Re-read the standing orders and `units.tsv`, recompute the frontier, reattach work by PR and branch rather than session id,",
    ],
  ],
  "skills/poteto-mode/playbooks/session-pickup.md": [
    [
      "A local transcript under the active workspace's `agent-transcripts/` directory (the system prompt names the path. Do not glob across `~/.cursor/projects/*/`, that crosses workspace boundaries and reads private chats from unrelated projects), a cloud-agent URL, or a pushed branch. Read the metadata overview and last messages first,",
      "A prior session in this project (find it with `pstack.sessions` or `pstack.search`, read it with `pstack.transcript`. Never ask for another project's sessions), a share link, or a pushed branch. Read the transcript header and last messages first (`pstack.transcript` with `from`),",
    ],
  ],
  "skills/poteto-mode/playbooks/eval.md": [
    [
      "Read each candidate's local transcript under the active workspace's `agent-transcripts/` directory (the system prompt names this path). Do not glob across `~/.cursor/projects/*/`. That crosses workspace boundaries and reads private chats from unrelated projects. Look at which files each candidate actually opened.",
      'Render each candidate\'s session with `pstack.transcript({ sessionID, tools: "calls" })`. Look at which files each candidate actually opened.',
    ],
  ],
  "skills/poteto-mode/playbooks/worktree-cleanup.md": [
    ["misses one that lives at `.cursor/worktrees/myrepo/x`", "misses one that lives under `~/.local/share/opencode/worktree/`"],
    [
      "`~/Library/Application Support/Cursor` (`state.vscdb.backup`, and `snapshots/roots/<root>` where a `<root>` named for a folder you opened as a workspace balloons)",
      "`~/.local/share/opencode` (`snapshot/`, `backups/`, and the `.trash/` inside each `worktree/<project>/`) and `~/.cache/opencode/npm`. Never touch `opencode.db`",
    ],
    ["the newest chat that touched it, then suggests a bucket. The transcript scan is slow, so background it.", "the newest OpenCode session in it, then suggests a bucket. The session lookup is one API call per worktree, so background it on a big list."],
  ],
  "skills/poteto-mode/scripts/worktree-audit.sh": [
    [
      '# Transcripts dir: ~/.cursor/projects/<slugified-repo-path>/agent-transcripts.\nslug=$(printf \'%s\' "$main_wt" | sed \'s#^/##; s#/#-#g\')\ntranscripts="$HOME/.cursor/projects/$slug/agent-transcripts"\n',
      "",
    ],
    [
      '\t# Most recent chat whose transcript operated in this worktree. Match path\n\t# followed by "/" or a quote so glint-482 does not match glint-482-r37.\n\tlast="-"; last_ts=0\n\tif [ -d "$transcripts" ]; then\n\t\tf=$(rg -l -e "${wt}/" -e "${wt}\\"" "$transcripts" 2>/dev/null \\\n\t\t\t| xargs stat -f \'%m %N\' 2>/dev/null | sort -rn | head -1)\n\t\tif [ -n "$f" ]; then last_ts=$(echo "$f" | awk \'{print $1}\')\n\t\t\tlast=$(date -r "$last_ts" \'+%Y-%m-%d\' 2>/dev/null); fi\n\tfi\n',
      '\t# Newest OpenCode session that ran in this worktree.\n\tlast="-"; last_ts=0\n\tupdated=$(opencode api GET "/api/session?directory=${wt}&limit=1&order=desc" 2>/dev/null | jq -r \'.data[0].time.updated // empty\')\n\tif [ -n "$updated" ]; then last_ts=$(( updated / 1000 ))\n\t\tlast=$(date -r "$last_ts" \'+%Y-%m-%d\' 2>/dev/null); fi\n',
    ],
  ],
  "skills/recall/SKILL.md": [
    [
      'Transcripts live at `~/.cursor/projects/<slug>/agent-transcripts/<uuid>/<uuid>.jsonl`, where `<slug>` is the workspace path with the leading slash dropped and each "/" turned into "-" (so `/Users/you/proj` becomes `Users-you-proj`). Every line is one chat message.',
      "Your chat history is this project's OpenCode sessions. `pstack.sessions` lists them newest first (`days` sets the window, `children: true` adds subagent sessions). `pstack.search` finds text across user messages, replies, and tool inputs, and returns snippets with `seq` anchors. `pstack.transcript` renders one session as markdown, from a `seq` onward, or to a file for `grep`.",
    ],
    ["the workspace (default the active one. Never read another project's transcripts without being asked)", "the workspace (the `pstack.*` tools only see the current project)"],
    ["order candidates by real modification time (`ls -t`) and never by UUID name, grep the topic first and then read only the matching chats and only their relevant regions,", "take candidates from `pstack.sessions` (newest first), `pstack.search` the topic first and then render only the matching sessions and only their relevant regions (`from` the hit's `seq`),"],
    ["each citing the chat UUID.", "each citing the session ID."],
    ["cite chat findings by UUID", "cite chat findings by session ID"],
  ],
  "skills/automate-me/SKILL.md": [
    ["Cursor's built-in `create-skill` (authoring)", "`skill-creator` or OpenCode's skill format (authoring)"],
    ["Look recursively for `.cursor/skills/**/*-mode/SKILL.md` and `~/.cursor/skills/*-mode/SKILL.md` matching the user's handle. Mode skills can live in a personal category directory (`.cursor/skills/<handle>/`), not only at the top level.", "Look recursively for `.opencode/skills/**/*-mode/SKILL.md` and `~/.config/opencode/skills/*-mode/SKILL.md` matching the user's handle. Mode skills can live in a personal category directory (`.opencode/skills/<handle>/`), not only at the top level."],
    [
      "Locate the active workspace's transcripts before fanning out. The system prompt names the workspace's `agent-transcripts/` directory. Use only that path. Don't glob across `~/.cursor/projects/*/`. That crosses workspace boundaries and reads private chats from unrelated projects.",
      "Your history is this project's OpenCode sessions, read with `pstack.sessions`, `pstack.search`, and `pstack.transcript`. They only see the current project. Never ask for another project's sessions.",
    ],
    ["Use Cursor's built-in `create-skill` skill to author the skill.", `Author the skill with ${SKILL_FORMAT}.`],
    [
      "For a new mode, use `.cursor/skills/<handle>/<handle>-mode/SKILL.md` when the repo has an established personal category for that handle. Otherwise default to `.cursor/skills/<handle>-mode/SKILL.md` in the project (or `~/.cursor/skills/<handle>-mode/` if the user prefers a personal skill).",
      "For a new mode, use `.opencode/skills/<handle>/<handle>-mode/SKILL.md` when the repo has an established personal category for that handle. Otherwise default to `.opencode/skills/<handle>-mode/SKILL.md` in the project (or `~/.config/opencode/skills/<handle>-mode/` if the user prefers a personal skill). To make it a sticky mode like `poteto`, also offer an agent file (`.opencode/agent/<handle>.md` with `mode: primary`) whose prompt says to load that skill.",
    ],
    ["follow `create-skill`'s YAML rules.", "keep the YAML valid."],
    ["and `create-skill`'s writing guidelines to every line.", "to every line."],
    ["A `create-skill`-style test/iterate benchmark loop isn't useful here.", "A `skill-creator`-style test/iterate benchmark loop isn't useful here."],
    ["`create-skill` alone, no mining required.", "`skill-creator` alone, no mining required."],
  ],
  "skills/reflect/references/judgment-reviewer.md": [
    ["(workspace `.cursor/skills/`, user-level `~/.cursor/skills/`, or plugin-installed paths under `~/.cursor/plugins/`)", "or `skill` tool loads (pstack skills load as `pstack-<name>`; project skills live in `.opencode/skills/`, user skills in `~/.config/opencode/skills/`)"],
  ],
  "skills/reflect/references/tooling-reviewer.md": [
    ["(workspace `.cursor/skills/`, user-level `~/.cursor/skills/`, or plugin-installed paths under `~/.cursor/plugins/`)", "or `skill` tool loads (pstack skills load as `pstack-<name>`; project skills live in `.opencode/skills/`, user skills in `~/.config/opencode/skills/`)"],
  ],
  "skills/reflect/references/divergent-reviewer.md": [
    ["(workspace `.cursor/skills/`, user-level `~/.cursor/skills/`, or plugin-installed paths under `~/.cursor/plugins/`)", "or `skill` tool loads (pstack skills load as `pstack-<name>`; project skills live in `.opencode/skills/`, user skills in `~/.config/opencode/skills/`)"],
  ],
  "skills/show-me-your-work/SKILL.md": [
    [
      "Read this run's transcript under the active workspace's `agent-transcripts/` directory (the system prompt names the path). Don't glob across `~/.cursor/projects/*/`. That reads unrelated private chats.",
      "Read this run's session with `pstack.transcript` (no `sessionID` means the current session).",
    ],
  ],
  "skills/create-verification-skill/SKILL.md": [
    ["(`.cursor/skills/verify-<app>/`)", "(`.opencode/skills/verify-<app>/`)"],
    ["Write `.cursor/skills/verify-<app>/SKILL.md`", "Write `.opencode/skills/verify-<app>/SKILL.md`"],
    ["Create `.cursor/skills/verify-<app>/features/README.md`", "Create `.opencode/skills/verify-<app>/features/README.md`"],
  ],
  "skills/maintain-verification-skill/SKILL.md": [["(usually `.cursor/skills/verify-*/`)", "(usually `.opencode/skills/verify-*/`)"]],
}
