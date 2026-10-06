---
name: setup-pstack
description: Configure which models pstack uses per role and at what reasoning budget. Detects your available models and stores them with pstack_roles. Use for /setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
---

# Setup pstack

Store pstack's model per role with the `pstack_roles` tool. Every pstack skill reads its role from there. Unset roles use the newest available Opus or Grok model, preferring the session's provider. The default budget is `large`, with `xhigh` reasoning. A missing model family falls back to `inherit-parent`, which runs on the parent session's model.

## Steps

### 1. Detect available models

List models with `opencode.models` (under code mode, `tools.opencode.models(...)` inside `execute`). Page with `offset` until `next` is null. Record each `providerID/modelID` and its `variants`. Never write a model you did not see there. `inherit-parent` is always valid.

### 2. Load current state

Call `pstack_roles` with no arguments. It returns every role, its current value, and the stored budget.

### 3. Budget, map, and confirm

**(a) Ask for a budget** with the `question` tool. Offer these labels, and name the current budget when one is stored. With no stored budget, say that `large` matches the skill defaults.

- `unlimited`, max reasoning
- `large`, xhigh reasoning
- `medium`, high reasoning
- `small`, medium reasoning

**(b) Apply it.** Keep any current role choices by model family, panel list, or `inherit-parent`. The budget picks a variant. For each chosen model, use the variant named for the target effort (`max`, `xhigh`, `high`, `medium`). If that variant does not exist, use the highest listed variant below it on `max` > `xhigh` > `high` > `medium` > `low`. If the model has no variants, write it without one. `inherit-parent` does not change. `unlimited` raises Opus to `max` when available. A Grok model that tops out at `xhigh` stays there.

**(c) Propose roles.** pstack splits work by model strength.

- Grok handles `feature, refactoring`, `bug-fix`, `perf-issue`, `hillclimb`, `how explorer`, `why investigators`, `swarm workers`, and `reflect tooling` by default.
- Opus handles `judgment and prose`, `hardest tasks`, `how explainer`, `why synthesizer`, and `reflect judgment, divergent, synthesizer` by default.
- Panels default to one Opus and one Grok. `arena runners`, `architect runners`, and `interrogate reviewers` spawn one subagent per entry. `arena cross-judge pool` is also a list, but Arena selects one entry, preferably from a different family than the parent. Users can choose other detected models or panel sizes.

Show every role with its proposed value. Confirm with `question`, offering the detected models plus `inherit-parent`.

### 4. Validate

Every value must be a model from step 1, optionally with one of its listed variants, or `inherit-parent`. If one is not, ask again.

### 5. Write

Call `pstack_roles` with `budget` and the full `roles` map, panels as arrays. The `budget` value must be exactly `unlimited`, `large`, `medium`, or `small`, without a label or description. Pass `reset: true` to drop every stored value first.

### 6. Confirm

Tell the user the roles are stored and apply to the next subagent spawn.

### 7. Offer a verification skill (optional)

If the project has no `verify-*` skill or harness that drives the real app, offer once to create one with `pstack-create-verification-skill`. On no, move on.
