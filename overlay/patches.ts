// Exact upstream passages that name Cursor mechanisms, rewritten for OpenCode.
// Every `find` must match its file; scripts/port.ts fails when upstream drifts.

const ROLE_RULE =
  "Each spawn below names a role line in the `pstack-models.mdc` rule and a default. Set `model` to that line's value, or to the default if the rule or the line is missing. Leave `model` unset when the value is `auto` or `inherit-parent`. If the Task tool rejects a slug, use the default and say so. If it rejects the default, use the closest valid slug of the same family from its error message."
const ROLE_READ =
  "Read the roles once with `pstack_roles` and set the subagent `model` to that role's value. The user chose these models for pstack, so passing them is an explicit model request. Leave `model` unset when the value is `inherit-parent`. If the `subagent` tool rejects a model, look up the closest model of the same family with `opencode.models`, use it, and say so."
const ROLE_NATIVE = `Each spawn below names a role. ${ROLE_READ}`

const WORKTREE = "its own worktree (`rift.create` when available, otherwise `git worktree add`)"
const CONTROL_UI = "OpenCode's `browser` tools"
const CONTROL_CLI = "a real terminal driven through the shell"
const DESLOP = "`/deslop`"
// Cursor gives each agent a store directory and names it in the system prompt. OpenCode has none.
const STORE = "a store directory outside the repo (`~/.local/share/pstack/<repo>/`)"
const SKILL_FORMAT = "the `skill-creator` skill when installed, otherwise OpenCode's skill format (a `SKILL.md` with `name` and `description` frontmatter)"

const SKILL_USED = "a `Read` of its `SKILL.md` (under `.cursor/skills/`, `~/.cursor/skills/`, or `~/.cursor/plugins/`)"

const DEPTH =
  "OpenCode limits nesting with `experimental.subagent_depth` (default 1), so a delegate may be unable to spawn its own subagents. On a depth error, run that fan-out from the parent session and say so."

export const drop = ["skills/make-bot-ui"]

export const patches: Record<string, Array<[string, string]>> = {
  "skills/how/SKILL.md": [
    [
      "Every spawn is a Task subagent with `subagent_type: generalPurpose` and `readonly: true`. Explorers use the `how explorer` line in the `pstack-models.mdc` rule (default `grok-4.7-xhigh-fast`), and every explainer uses the `how explainer` line (default `claude-opus-5-5-xhigh`). Set `model` to that line's value, or to the default if the rule or the line is missing. Leave `model` unset when the value is `auto` or `inherit-parent`. If the Task tool rejects a slug, use the default and say so. If it rejects the default, use the closest valid slug of the same family from its error message.",
      `Every spawn is a \`subagent\` call with \`agent: "explore"\` (read-only). Explorers use the \`how explorer\` role, and every explainer uses the \`how explainer\` role. ${ROLE_READ}`,
    ],
  ],
  "skills/why/SKILL.md": [
    [ROLE_RULE, ROLE_NATIVE],
    [
      "Every spawn is `generalPurpose` with `readonly: false` (agent mode). **Do not use readonly/Ask mode.** It strips MCP access, which disables the MCP-backed investigators and the synthesizer's citation spot-checks.",
      'Every spawn is `agent: "general"`. **Never use `explore`.** It has no MCP access, which disables the MCP-backed investigators and the synthesizer\'s citation spot-checks.',
    ],
    [
      "list the available MCPs from the Cursor environment. Use the available-tools map when present. Otherwise inspect the `mcps/` directory Cursor exposes for enabled MCP servers.",
      "list the available MCP servers. They are the namespaces in your code-mode tool catalog and the `mcp_instructions` in your context. Search the catalog with `search` inside `execute` when a namespace is collapsed.",
    ],
  ],
  "skills/reflect/SKILL.md": [
    [
      "find this conversation's transcript in the `agent-transcripts/` directory the system prompt names. Do not glob across `~/.cursor/projects/*/`. That crosses workspace boundaries and reads private chats from unrelated projects.\n\n```bash\nls -t <agent-transcripts>/*.jsonl <agent-transcripts>/*/*.jsonl <agent-transcripts>/*/subagents/*.jsonl 2>/dev/null | head -10\n```\n\nThat covers the legacy flat (`<id>.jsonl`), current nested (`<id>/<id>.jsonl`), and subagent (`<parent>/subagents/<child>.jsonl`) layouts. For each candidate, read the first JSONL line. Take the file whose `message.content[0].text` contains the conversation's opening user prompt. If none matches, pass a tight digest of the session instead.",
      "render this conversation with `pstack.transcript({ file: true })` and no `sessionID`. It writes this session as markdown with `[#seq]` anchors and returns the path. The `pstack.*` session tools only see the current project. Never ask for another project's sessions. The transcript header lists subagent sessions. Render one with `pstack.transcript({ sessionID, file: true })` when a reviewer needs it. If the render fails, pass a tight digest of the session instead.",
    ],
    [
      "One message, three `Task` calls, `subagent_type: generalPurpose`, agent mode (`readonly: false`). Reviewers need MCP access to look up the tickets, chat threads, and observability traces the transcript references, and readonly strips MCPs.",
      'One message, three `subagent` calls, `agent: "general"`. Reviewers need MCP access to look up the tickets, chat threads, and observability traces the transcript references, and `explore` has none.',
    ],
    [ROLE_RULE.replace("Each spawn below names", "Each reviewer and the synthesizer name"), ROLE_NATIVE.replace("Each spawn below names a role", "Each reviewer and the synthesizer name a role")],
    ["| Lens | Role line | Default `model` | Prompt template |\n|---|---|---|---|", "| Lens | Role | Prompt template |\n|---|---|---|"],
    ["| `reflect judgment, divergent, synthesizer` | `claude-opus-5-5-xhigh` | `references/judgment-reviewer.md` |", "| `reflect judgment, divergent, synthesizer` | `references/judgment-reviewer.md` |"],
    ["| `reflect tooling` | `grok-4.7-xhigh-fast` | `references/tooling-reviewer.md` |", "| `reflect tooling` | `references/tooling-reviewer.md` |"],
    ["| `reflect judgment, divergent, synthesizer` | `claude-opus-5-5-xhigh` | `references/divergent-reviewer.md` |", "| `reflect judgment, divergent, synthesizer` | `references/divergent-reviewer.md` |"],
    [
      "One `Task` call, `subagent_type: generalPurpose`, `model` from the `reflect judgment, divergent, synthesizer` line (default `claude-opus-5-5-xhigh`), agent mode (`readonly: false`). It spot-verifies citations through MCP, and readonly strips MCPs.",
      'One `subagent` call, `agent: "general"`, `model` from the `reflect judgment, divergent, synthesizer` role. It spot-verifies citations through MCP, and `explore` has none.',
    ],
    [
      "Never edit a skill under `plugins/cache/`. Before approval, show its destination, `.cursor/skills/<skill>/` or `~/.cursor/skills/<skill>/`.",
      "Never edit a pstack skill in the plugin's own `skills/` directory. It is generated, and the next update overwrites it. Before approval, show its destination, `.opencode/skills/<skill>/` or `~/.config/opencode/skills/<skill>/`.",
    ],
  ],
  "skills/arena/SKILL.md": [
    [
      "Use the `arena runners` line in `~/.cursor/rules/pstack-models.mdc`. If the rule or that line is missing, default to one each on `claude-opus-5-5-xhigh` and `grok-4.7-xhigh-fast`. An `auto` or `inherit-parent` entry in this line means the parent model, so omit `model` for it. If the Task tool rejects a configured entry, run that seat on its family's default and say so. Families go by prefix: `claude-*`, and `grok-*` with `cursor-grok-*` and `composer-*`. A refused `composer-*` entry runs on `grok-4.7-xhigh-fast`. If the family has no default, or the Task tool rejects that default, use the closest valid slug of the same family from its error message, or drop the seat and say so when there is none.",
      "Use the `arena runners` role from `pstack_roles`. The default is one each from the claude and grok families. The user chose these models for pstack, so passing them is an explicit model request. An `inherit-parent` entry in this role means the parent model, so omit `model` for it. Families go by model ID: `claude-*`, and `grok-*`. If the `subagent` tool rejects an entry, run that seat on the closest model of its family from `opencode.models`, or drop the seat and say so when there is none.",
    ],
    [
      "choose one model from the `arena cross-judge pool` line in `~/.cursor/rules/pstack-models.mdc`. If the rule or that line is missing, choose from `claude-opus-5-5-xhigh` and `grok-4.7-xhigh-fast`. Spawn one readonly judge subagent.",
      "choose one model from the `arena cross-judge pool` role in `pstack_roles`. Spawn one read-only judge subagent (`agent: explore`).",
    ],
    [
      "An `auto` or `inherit-parent` entry is the parent model, so it never judges. With the default pool, a Claude parent gets `grok-4.7-xhigh-fast`. A parent from any other family gets `claude-opus-5-5-xhigh` first. If the Task tool rejects an entry, use a valid slug of the same model at the closest level or speed from the error message, or move to the next entry when there is none. If no entry from another family runs, try the default pool's entries from another family the same way.",
      "An `inherit-parent` entry is the parent model, so it never judges. If the `subagent` tool rejects an entry, use the same model at the closest variant from `opencode.models`, or move to the next entry when there is none. If no entry from another family runs, try the newest claude or grok model from another family the same way.",
    ],
    ["or one when the line has one entry", "or one when the role has one entry"],
    ["try the pool's real slugs in pool order", "try the pool's real models in pool order"],
    ["(a git worktree where possible, otherwise `/tmp/arena-<slug>/candidate-<n>/`)", "(its own worktree where possible, via `rift.create` or `git worktree add`, otherwise `/tmp/arena-<slug>/candidate-<n>/`)"],
  ],
  "skills/interrogate/SKILL.md": [["Read the `interrogate reviewers` line in place of `arena runners`.", "Read the `interrogate reviewers` role in place of `arena runners`."]],
  "skills/architect/SKILL.md": [
    [
      "Take the runners from the `architect runners` line in the `pstack-models.mdc` rule, in place of the `arena runners` line. If the rule or that line is missing, use `claude-opus-5-5-xhigh` and `grok-4.7-xhigh-fast`. Alias and rejected entries follow the runner rules in the **arena** skill's Phase A.",
      "Take the runners from the `architect runners` role in `pstack_roles`, in place of the `arena runners` role. `inherit-parent` and rejected entries follow the runner rules in the **arena** skill's Phase A.",
    ],
  ],
  "skills/swarm/SKILL.md": [
    [
      "Pick the worker model from the `swarm workers` line in `~/.cursor/rules/pstack-models.mdc`. If the rule or that line is missing, use `grok-4.7-xhigh-fast`. For `auto` or `inherit-parent`, omit `model` so the workers run on the parent model. If the Task tool rejects a slug, use the default and say so. If it rejects the default, use the closest valid slug of the same family from its error message.",
      "Pick the worker model from the `swarm workers` role in `pstack_roles`. The user chose it for pstack, so passing it is an explicit model request. For `inherit-parent`, omit `model` so the workers run on the parent model. If the `subagent` tool rejects it, use the closest model of the same family from `opencode.models` and say so.",
    ],
    [
      "Spawn all N workers in one message with `subagent_type: generalPurpose`, `environment: \"cloud\"`, `run_in_background: true`, and the step 3 model, left unset for `auto` or `inherit-parent`. Use `environment: \"local\"` only when the worker needs access to something on the user's computer.",
      `Spawn all N workers in one message with the \`subagent\` tool, \`agent: "general"\`, \`background: true\`, and the step 3 model, left unset for \`inherit-parent\`. A worker that writes gets ${WORKTREE}, named in its brief.`,
    ],
    ["When a worker must start from a non-default pushed branch, pass `cloud_base_branch`.", "When a worker must start from a non-default pushed branch, create its worktree at that branch."],
    ["If a worker drops out, proceed with N-1 and note it.", `If a worker drops out, proceed with N-1 and note it. ${DEPTH}`],
  ],
  "skills/poteto-mode/SKILL.md": [
    ["Agent-facing prose also follows the **create-skill** skill (Cursor's built-in for authoring SKILL.md files).", `Agent-facing prose also follows ${SKILL_FORMAT}.`],
    ["- Before commit → the `deslop` skill from the `cursor-team-kit` plugin (`/deslop`).", "- Before commit → `/deslop`, the **deslop** skill."],
    [
      "- Shipping UI / IDE / CLI → the matching control skill. `cursor-team-kit` publishes `control-cli` (CLIs and TUIs) and `control-ui` (browser / Electron / web UIs).",
      `- Shipping UI / IDE / CLI → drive the real surface. Browser, Electron, and web UIs use ${CONTROL_UI}. CLIs and TUIs use ${CONTROL_CLI}. A repo's own \`verify-*\` skill wins over both.`,
    ],
    [", not Cursor's built-in babysit skill, whose description matches the same words.", "."],
    ["About to `AskQuestion` on", "About to call the `question` tool on"],
    ["Read the leaf skill in full for any principle you apply.", "Read the leaf skill in full for any principle you apply. Principle skills load as `pstack-principle-<name>`."],
    ["**Use `subagent_type: \"poteto-agent\"` for any subagent you spawn inside a playbook step**", "**Use `agent: \"poteto-agent\"` for any subagent you spawn inside a playbook step**"],
    ["set their own `subagent_type` for diverse-model review.", "set their own `agent` for diverse-model review."],
    [
      "**Defaults for every `Task` call.** `run_in_background: true` (a steer or resume of a running agent too, because a foreground call holds your turn while other reports wait), agent mode (readonly strips MCP), file pointers not inlined context, explicit model per role (configurable via `/setup-pstack`. Defaults `grok-4.7-xhigh-fast` for code, `claude-opus-5-5-xhigh` for prose and judgment). Code delegates tier by difficulty. The hardest changes (cross-cutting design, gnarly concurrency, subtle algorithms) go to your strongest judgment model (`claude-opus-5-5-xhigh`),",
      "**Defaults for every `subagent` call.** `background: true` (a steer or resume of a running agent too, because a foreground call holds your turn while other reports wait), a full-access agent (`poteto-agent` or `general`, never `explore` when the work writes or needs MCP), file pointers not inlined context, explicit model per role from `pstack_roles` (configurable via `/setup-pstack`. Defaults a grok model for code, a claude opus model for prose and judgment). The user chose these models for pstack, so passing them is an explicit model request. Code delegates tier by difficulty. The hardest changes (cross-cutting design, gnarly concurrency, subtle algorithms) go to your strongest judgment model (the `hardest tasks` role),",
    ],
    [
      "**Match the model to the job.** Before each spawn, start from the role's line or default and pick the reasoning level and speed the job needs. The `/setup-pstack` budget sets each role's starting level, xhigh by default. Raise it one step, up to max, for the hardest or subtlest work. Lower it one step for judgment and two or more steps for routine work. Use fast mode only when the job is urgent, meaning CI or trunk is red or a person is blocked on the result right now. Otherwise use standard speed, the same slug without `-fast`. Verification is the exception and stays on the `swarm workers` model and speed (`grok-4.7-xhigh-fast` by default). Change only the effort level and whether the slug is fast, and keep the family the role names, so a diverse panel stays diverse. If the family has no slug at that level and speed, use its nearest slug. A role on `auto` or `inherit-parent` stays on the parent model. If the Task tool rejects the adjusted slug, do not try another adjusted slug. Use the role's line or default and say so. If the Task tool rejects that too, continue with the calling skill's fallback. A slug counts as rejected once a Task error says that the model is not valid, or leaves the slug out of its list of valid slugs. Never pass a rejected slug, and skip any fallback whose slug is already rejected. When the calling skill has no fallback, use the closest valid slug of the role's family from the error's list of valid slugs, or omit `model` so the subagent runs on the parent model when the list has none. When the calling skill's fallback runs out of slugs without saying what to do next, omit `model` too. Say so in both cases.",
      "**Match the model to the job.** Before each spawn, start from the role's model in `pstack_roles` and pick the reasoning variant the job needs. A model is `providerID/modelID#variant`, and `opencode.models` lists each model's variants. The `/setup-pstack` budget sets each role's starting variant, xhigh by default. Raise it one step, up to max, for the hardest or subtlest work. Lower it one step for judgment and two or more steps for routine work. Verification is the exception and stays on the `swarm workers` model and variant. Change only the variant, and keep the model the role names, so a diverse panel stays diverse. If the model has no variant at that level, use its nearest variant. A role on `inherit-parent` stays on the parent model. If the `subagent` tool rejects the adjusted model, do not try another variant. Use the role's model as `pstack_roles` gives it and say so. If the `subagent` tool rejects that too, continue with the calling skill's fallback. Never pass a rejected model again. When the calling skill has no fallback, or its fallback runs out, use the closest model of the role's family from `opencode.models`, or omit `model` so the subagent runs on the parent model when there is none. Say so in both cases.",
    ],
    [
      "Per-role lines in the `/setup-pstack` rule override these defaults and the model choices in the routed skills (`how`, `why`, `arena`, `swarm`, `architect`, `interrogate`, `reflect`). A role with no line keeps its default, and a role line of `inherit-parent` or `auto` runs that role on the parent chat model (omit Task `model`). Each code playbook's configured model comes from its line",
      "Roles set by `/setup-pstack` override these defaults and the model choices in the routed skills (`how`, `why`, `arena`, `swarm`, `architect`, `interrogate`, `reflect`). An unset role keeps its default, and a role of `inherit-parent` runs on the parent session's model (omit `model`). Each code playbook's configured model comes from its role",
    ],
    ["from a transcript, cloud-agent URL, or pushed branch.", "from a session, a share link, or a pushed branch."],
    ["You own every subagent's work.", `${DEPTH} You own every subagent's work.`],
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
    ["Run `/deslop` from `cursor-team-kit` over the diff before commit", "Run `/deslop` over the diff before commit"],
  ],
  "skills/poteto-mode/playbooks/babysit.md": [
    [" This playbook replaces Cursor's built-in babysit skill for these requests, so do not route there even though its description matches the same words.", ""],
    ["Run `drive` and `background` under `/loop` in dynamic mode.", "Run `drive` and `background` under `pstack_loop` in dynamic mode (no `every`)."],
  ],
  "skills/poteto-mode/playbooks/shipping.md": [
    [
      "each a Cursor cloud agent, runs the change the way a user would with the matching control skill (such as `control-ui` or `control-cli` from `cursor-team-kit`), parent against head,",
      `each a background subagent in ${WORKTREE}, runs the change the way a user would (${CONTROL_UI} or ${CONTROL_CLI}), parent against head,`,
    ],
    ["under `/loop` until it reports `COMPLETE`", "under `pstack_loop` in dynamic mode (no `every`) until it reports `COMPLETE`"],
  ],
  "skills/poteto-mode/playbooks/multi-phase-plan.md": [
    [
      "Browser, Electron, and web UIs use `control-ui` from `cursor-team-kit`. CLIs and TUIs use `control-cli` from `cursor-team-kit`.",
      `Browser, Electron, and web UIs use ${CONTROL_UI}. CLIs and TUIs use ${CONTROL_CLI}.`,
    ],
    ["A surface with no control skill is a risk", "A surface with no driver is a risk"],
    ["on a lane VM.", "in a lane's worktree."],
    ["arm the audit tick as `/loop 1h` with the tick prompt below.", "arm the audit tick as `/loop 1h`, using `pstack_loop` with `every: \"1h\"` and the tick prompt below."],
    ["Each live lane runs on its own cloud VM at the PR head. Drive through `control-ui` or `control-cli` from `cursor-team-kit`.", `Each live lane runs in ${WORKTREE} at the PR head. Drive through ${CONTROL_UI} or ${CONTROL_CLI}.`],
  ],
  "skills/poteto-mode/playbooks/autopilot-full.md": [
    ["Each owner is a Cursor cloud agent that builds,", `Each owner is a background subagent in ${WORKTREE} that builds,`],
    ["the slop-strip (the `deslop` skill from the `cursor-team-kit` plugin (`/deslop`))", `the slop-strip (${DESLOP})`],
    [
      "Assume the VM dies. Soon after starting, push and start a decision trail in the root agent's store (path in the system prompt)",
      `Assume the session dies. Soon after starting, push and start a decision trail in the root session's store, ${STORE},`,
    ],
    ["through its control skill (such as `control-ui` or `control-cli` from `cursor-team-kit`) or a named driver", `through ${CONTROL_UI}, ${CONTROL_CLI}, or a named driver`],
    ["On the operator's go, arm `/loop 1h` to audit", 'On the operator\'s go, arm `pstack_loop` with `every: "1h"` to audit'],
  ],
  "skills/poteto-mode/playbooks/orchestrate.md": [
    ["Keep the program's state in the Project tracker (`notes.md`) and the Project store.", `Keep the program's state in ${STORE}, with \`notes.md\` as its tracker.`],
    [
      "Run workers on a new cloud VM (`environment: \"cloud\"`) unless the work needs this machine: a `control-ui` or `control-cli` runtime check (from `cursor-team-kit`), local transcripts, a simulator, or auth that exists only here.",
      `Run each worker as a background subagent in ${WORKTREE}.`,
    ],
    ["Stop at three levels: you, sub-coordinators, and workers.", `Stop at three levels: you, sub-coordinators, and workers. ${DEPTH}`],
    ["a control-skill check,", "a check on the real surface,"],
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
      '\t# Most recent chat whose transcript operated in this worktree. Match path\n\t# followed by "/" or a quote so glint-482 does not match glint-482-r37.\n\tlast="-"; last_ts=0\n\tif [ -d "$transcripts" ]; then\n\t\tf=$(rg -l -e "${wt}/" -e "${wt}\\"" "$transcripts" 2>/dev/null \\\n\t\t\t| xargs stat "${stat_fmt[@]}" 2>/dev/null | sort -rn | head -1)\n\t\tif [ -n "$f" ]; then last_ts=$(echo "$f" | awk \'{print $1}\')\n\t\t\tlast=$(fmt_day "$last_ts" 2>/dev/null); fi\n\tfi\n',
      '\t# Newest OpenCode session that ran in this worktree.\n\tlast="-"; last_ts=0\n\tupdated=$(opencode api GET "/api/session?directory=${wt}&limit=1&order=desc" 2>/dev/null | jq -r \'.data[0].time.updated // empty\')\n\tif [ -n "$updated" ]; then last_ts=$(( updated / 1000 ))\n\t\tlast=$(fmt_day "$last_ts" 2>/dev/null); fi\n',
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
  ...Object.fromEntries(
    ["judgment", "tooling", "divergent"].map((lens) => [
      `skills/reflect/references/${lens}-reviewer.md`,
      [[SKILL_USED, "a `skill` tool load of it (pstack skills load as `pstack-<name>`), a read of its `SKILL.md` (under `.opencode/skills/` or `~/.config/opencode/skills/`)"]],
    ]),
  ),
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
  // Upstream keeps unslop user-invoked (cursor/plugins#379 closed unmerged). Here agents may invoke it without being asked.
  "skills/unslop/SKILL.md": [["description: Cut AI tells from any writing.\ndisable-model-invocation: true\n", "description: Cut AI tells from any writing.\n"]],
  "skills/ketchup/SKILL.md": [
    ["a chart or diagram from `/visualize`,", "a chart rendered to an image,"],
    ["a Mermaid diagram for how things connect and a `/visualize` chart for numbers.", "a Mermaid diagram for how things connect and a chart rendered to an image for numbers."],
  ],
  "agents/poteto-agent.md": [
    [
      "Use the absolute path your parent gave you. With no path, before any other work, search `~/.cursor/plugins/` for a file whose path ends in `skills/poteto-mode/SKILL.md`. If more than one file matches, use the copy whose `.cursor-plugin/plugin.json` has the highest `version`. Your skill catalog hides this skill, so a missing catalog entry does not mean pstack is absent. If no such file exists, stop and tell your parent.",
      "Load it with the `skill` tool before any other work. If it does not load, stop and tell your parent.",
    ],
  ],
  "skills/maintain-verification-skill/SKILL.md": [["(usually `.cursor/skills/verify-*/`)", "(usually `.opencode/skills/verify-*/`)"]],
}
