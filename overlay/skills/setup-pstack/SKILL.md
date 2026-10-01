---
name: setup-pstack
description: Configure which models pstack uses per role and at what reasoning budget. Detects your available models and stores them with pstack_roles. Use for /setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
disable-model-invocation: true
---

# Setup pstack

Store pstack's model per role with the `pstack_roles` tool. Every pstack skill reads its role from there. A role without a stored value is `inherit-parent`, which runs on the parent session's model.

## Steps

### 1. Detect available models

List models with `opencode.models` (under code mode, `tools.opencode.models(...)` inside `execute`). Page with `offset` until `next` is null. Record each `providerID/modelID` and its `variants`. Never write a model you did not see there. `inherit-parent` and `auto` are always valid.

### 2. Load current state

Call `pstack_roles` with no arguments. It returns every role, its current value, and the stored budget.

### 3. Budget, map, and confirm

**(a) Ask for a budget** with the `question` tool. Offer these labels exactly, and name the current budget when one is stored.

- `unlimited — keep max`
- `large — xhigh reasoning`
- `medium — high reasoning`
- `small — medium reasoning`

**(b) Apply it.** The budget picks a variant. For each chosen model, use the variant named for the target effort (`max`, `xhigh`, `high`, `medium`). If that variant does not exist, use the highest listed variant below it on `max` > `xhigh` > `high` > `medium` > `low`. If the model has no variants, write it without one. `inherit-parent` and `auto` do not change.

**(c) Propose roles.** pstack splits work by model strength.

- A fast code model: `feature, refactoring`, `bug-fix`, `perf-issue`, `hillclimb`, `how explorer`, `why investigators`, `swarm workers`.
- The strongest judgment model: `judgment and prose`, `hardest tasks`, `how explainer`, `why synthesizer`, `reflect judgment, divergent, synthesizer`.
- A different model family from the judgment model: `reflect tooling`.
- Panels are lists, one subagent per entry, so the list length sets the fan-out: `arena runners`, `arena cross-judge pool`, `architect runners`, `interrogate reviewers`. Use up to three models from different families. Diversity is the point.

Show every role with its proposed value. Confirm with `question`, offering the detected models plus `inherit-parent`.

### 4. Validate

Every value must be a model from step 1, optionally with one of its listed variants, or `inherit-parent` or `auto`. If one is not, ask again.

### 5. Write

Call `pstack_roles` with `budget` and the full `roles` map, panels as arrays. Pass `reset: true` to drop every stored value first.

### 6. Confirm

Tell the user the roles are stored and apply to the next subagent spawn.

### 7. Offer a verification skill (optional)

If the project has no `verify-*` skill or harness that drives the real app, offer once to create one with `pstack-create-verification-skill`. On no, move on.
