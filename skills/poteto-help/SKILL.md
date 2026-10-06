---
name: poteto-help
description: Guides users through pstack setup, /poteto-mode, and picking the skill, playbook, or principle for a task. Type /poteto-help with a question.
disable-model-invocation: true
---

# Poteto help

Answer the user's question about pstack, hand them a prompt they can send, and link the file the answer came from. For a help question, don't start the work. Let the user send the prompt.

A message that asks for work, such as "use pstack to fix this bug", is not a help question. Read the `pstack-poteto-mode` skill, do the work under it, and mention once that the `poteto` agent keeps the mode on.

Read the file you route to before you quote it, and trust it when it disagrees with this map. Link the public copy at `https://github.com/nexxeln/oc-pstack/blob/main/` followed by its path. The [README](../../README.md) documents this port's installation and runtime mappings.

## Find out what they need

Infer the need from the message and conversation. A named situation goes straight to its section. If the need is still unclear, ask one multiple-choice question, then answer only the section they pick:

- Get set up
- Start a task with `/poteto-mode`
- Pick a skill for a situation
- Fix a run that went wrong
- Make pstack my own

Check the state that changes the answer, and mention it only when it does:

- Call `pstack_roles` with no arguments. `budget: large (default)` means no budget is stored. Returned roles include defaults and any stored or plugin-option overrides. Use those values rather than assuming setup has run.
- No `verify-*` skill or other app harness in the project means agents have no scripted way to drive the app. Mention `/create-verification-skill` when the question is about proving a change works.

When no budget is stored and it matters, ask whether the user wants to pick models and a reasoning budget now. It matters when the user is new, asks about setup or cost, or needs to know which models run. Ask at most once per chat. If the need is also unclear, ask both questions together. Offer two choices:

- Now. Give them `/setup-pstack` to type, and answer their question too.
- Later. Answer their question, and say the current role values keep applying until they run `/setup-pstack`.

## Get set up

1. Add `"github:nexxeln/oc-pstack"` to `plugins` in OpenCode's configuration, as shown in the README. The plugin requires OpenCode V2.
2. Run [`/setup-pstack`](../setup-pstack/SKILL.md). It asks for a reasoning budget and stores a model for each role with `pstack_roles`. Changes apply to the next subagent spawn.
3. Start a real task with `/poteto-mode`, a goal, and a check that can pass or fail.

`/poteto-help` is typed-only. `/setup-pstack`, `/deslop`, and `/unslop` can load automatically from their descriptions. Invoke the other skills directly or through a playbook. Offer to word their first prompt with them after reading [`references/prompting.md`](references/prompting.md).

If cost is the worry, explain that subagents and review panels spend extra tokens. Rerun `/setup-pstack` and pick a smaller budget or cheaper models. A role set to `inherit-parent` runs on the session's model. A shorter panel list runs fewer subagents, one for each entry. Save `/poteto-mode` for work that needs rigor.

Updates preserve saved model choices, including old defaults. A setup from an earlier version can still pin Sol and three-model panels. To adopt the current Opus/Grok defaults, explicitly change those roles during `/setup-pstack`. A rerun otherwise keeps the existing choices.

## Start a task with `/poteto-mode`

`/poteto-mode` matches the task to a playbook, copies its steps into `pstack_todo`, and runs the skills those steps need. A skipped step stays in the list with `skip: <reason>`. A good prompt states the goal and how to tell it's done. Read [`references/prompting.md`](references/prompting.md) before helping word one.

The command switches to the `poteto` primary agent. The plugin adds its reminder every turn until the user switches agents or says to leave the mode. Casual turns don't need a playbook. Mid-chat, "new task" selects a fresh playbook.

Playbook subagents use `agent: "poteto-agent"`. To load a skill with the `skill` tool, use `pstack-<name>`.

## Pick a skill

The default answer is `/poteto-mode`. Name a skill directly when the user wants more or less than the playbook gives. Read the skill before recommending it, and give one example prompt.

| The user wants to | Skill |
|---|---|
| Do a non-trivial task with rigor | `/poteto-mode` |
| Know how code works or where new code belongs | `/how` |
| Know why code is shaped this way or where a number came from | `/why` |
| Understand a change or subsystem in plain language | `/teach` |
| Catch up on recent work on a topic | `/recall` |
| Know what a small diff could break outside itself | `/blast-radius` |
| Settle types and module shape before implementation | `/architect` |
| Compare attempts at one brief and combine the best parts | `/arena` |
| Run parallel checks over slices or race background workers | `/swarm` |
| Have different models challenge a diff | `/interrogate` |
| Fix a bug test-first when a cheap local test exists | `/tdd` |
| Apply TypeScript rules | `/typescript-best-practices` |
| Strip comments before review | `/no-comments` |
| Clean AI-generated code | `/deslop` |
| Clean AI tells out of prose | `/unslop` |
| Write docs, an RFC, a README, or a PR description | `/technical-writing` |
| Hear the last reply again in plain words | `/bro` |
| Give agents a script to drive the app and prove behavior | `/create-verification-skill` |
| Update a verification skill and its feature map | `/maintain-verification-skill` |
| Vet a performance number | `/benchmark-checklist` |
| Plan and run a large or cross-cutting change | `/figure-it-out` |
| Keep a decision log and review it afterward | `/show-me-your-work` |
| Pick models and a reasoning budget | `/setup-pstack` |
| Turn working habits into a personal mode | `/automate-me` |
| Turn a finished task's lessons into skill edits | `/reflect` |
| Prevent repeated agent mistakes in a repo | `/correct` |
| Find their way around pstack | `/poteto-help` |

If a skill is missing from the table, read its frontmatter and route by its description.

Close calls:

- `/how` explains mechanics. `/why` explains reasons. `/teach` runs one or both and explains the result plainly.
- `/arena` gives every worker the same brief. `/swarm` splits work into slices or a race.
- `/architect` implements after settling the design. Add "with checkpoint" to review it before code.
- `/interrogate` reviews the diff. `/blast-radius` checks outside the diff.
- `/recall` covers recent sessions. The Session pickup playbook resumes one specific session or branch.
- `/figure-it-out` designs one rigorous run. Orchestrate spans days and many PRs. Autonomous run drives one task to a finish condition.

`/loop` is provided by this plugin. Agents arm it with `pstack_loop`. Use `skill-creator` when installed to author skills, otherwise follow OpenCode's SKILL.md format. Drive browsers with available browser tools and CLIs through the shell. There is no `/orchestrate` skill. Orchestrate is a playbook.

## Playbooks and principles

Playbooks are step lists inside `/poteto-mode`, with no separate slash command. These phrases select one directly:

- "babysit this pr" or "check on pr 123" selects Babysit. It stops at merge-ready unless the user asks to land.
- "land the stack" selects Shipping.
- "take over this branch" selects Session pickup.
- "pause safely" selects Pause safely.
- "full autopilot on this queue" selects Autopilot-full. "stack them, don't ship" selects Autopilot-stack.
- "run the eval playbook" selects Eval.

The Playbooks section of `pstack-poteto-mode` lists every playbook. Asking it for a plan across phases or stacked PRs selects Multi-phase plan, which writes the plan without implementing it. Prototype or `/architect` settles design questions in code first.

Principles are one-rule skills the mode reads and cites. Steer with their names, such as "apply prove it works. show me the real output." Load one with `pstack-principle-<name>`, or attach it as `@pstack-principle-<name>`.

## Fix a run that went wrong

| Symptom | Fix |
|---|---|
| The mode stopped applying | Check that the session uses the `poteto` agent. Run `/poteto-mode` again. |
| A question continued the previous task | Say "new task", or say the turn doesn't need the mode. |
| A model choice had no effect | Read `pstack_roles` and check the next spawn used that role. Running subagents keep their current model. |
| Runs cost more than expected | Choose a smaller budget or shorter panels in `/setup-pstack`. |
| A skill didn't load on its own | Only `/setup-pstack`, `/deslop`, and `/unslop` allow automatic invocation. Invoke other skills directly or use `/poteto-mode`. |
| Parallel agents overwrote each other | Give each writer its own worktree. |
| Nested subagents cannot spawn | Run the fan-out from the parent, or configure OpenCode's `experimental.subagent_depth`. |
| An overnight run moved but finished nothing | Give `/loop` a check that can pass or fail. |
| The reply claims success from a green build | Ask for the real command, flow, stored value, or profile. |

For a run that drifts, [`references/prompting.md`](references/prompting.md) has one-line steers.

## Make pstack my own

- `/automate-me` drafts a personal mode from the user's session history.
- `/reflect` turns a session's lessons into skill edits the user approves.
- `/poteto-mode write a skill for <workflow>` selects the authoring playbook. Eval tests skill changes blind.
- Fix a misbehaving skill in its own PR.

## Reply

Lead with the answer. Give at most one example prompt, adapted from [`references/recipes.md`](references/recipes.md), then link the file. Keep it short unless the user asks for the whole map.
