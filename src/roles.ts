import type { Context } from "@opencode/plugin/promise/plugin"

type Effort = "max" | "xhigh" | "high" | "medium" | "low"
type Family = { readonly pattern: RegExp; readonly effort: Effort }

const judgment: Family = { pattern: /^claude-opus-/, effort: "max" }
const code: Family = { pattern: /^grok-\d/, effort: "xhigh" }
const tooling: Family = { pattern: /^gpt-[\d.]+-sol$/, effort: "max" }
const panel = [judgment, tooling, code]

// pstack's upstream split: grok for code, claude opus for judgment and prose, a gpt sol model for diversity.
const defaults: Record<string, Family | readonly Family[]> = {
  "feature, refactoring": code,
  "bug-fix": code,
  "perf-issue": code,
  hillclimb: code,
  "judgment and prose": judgment,
  "hardest tasks": judgment,
  "how explorer": code,
  "how explainer": judgment,
  "why investigators": code,
  "why synthesizer": judgment,
  "reflect tooling": tooling,
  "reflect judgment, divergent, synthesizer": judgment,
  "arena runners": panel,
  "arena cross-judge pool": panel,
  "swarm workers": code,
  "architect runners": panel,
  "interrogate reviewers": panel,
}

const ladder: Effort[] = ["max", "xhigh", "high", "medium", "low"]
const budgets: Record<string, Effort> = { unlimited: "max", large: "xhigh", medium: "high", small: "medium" }

type Value = string | string[]
interface Stored {
  readonly budget?: string
  readonly roles: Record<string, Value>
}
export interface Input {
  readonly roles?: Record<string, Value>
  readonly budget?: string
  readonly reset?: boolean
}

const MODEL = /^(inherit-parent|[^/\s#]+\/[^#\s]+(#[\w.-]+)?)$/
const KEY = "roles"

export async function roles(ctx: Context, sessionID: string, input: Input) {
  const current = ((await ctx.storage.get(KEY)) ?? { roles: {} }) as unknown as Stored
  const write = input.roles !== undefined || input.budget !== undefined || input.reset === true
  if (write) Object.entries(input.roles ?? {}).forEach(([role, value]) => validate(role, value))
  const stored: Stored = write
    ? {
        budget: input.budget ?? (input.reset ? undefined : current.budget),
        roles: { ...(input.reset ? {} : current.roles), ...input.roles },
      }
    : current
  if (write) await ctx.storage.set(KEY, JSON.parse(JSON.stringify(stored)))
  const [session, models, fallback] = await Promise.all([
    ctx.session.get({ sessionID: sessionID as never }),
    ctx.model.list(),
    ctx.model.default(),
  ])
  const pick = picker(models.data, session.model?.providerID ?? fallback.data?.providerID, budgets[stored.budget?.split(" ")[0] ?? ""] ?? "max")
  const options = (ctx.options.roles ?? {}) as Record<string, Value>
  return {
    budget: stored.budget ?? null,
    roles: Object.entries(defaults).map(([role, family]) => {
      const value = stored.roles[role] ?? options[role]
      if (value !== undefined) return { role, value, source: stored.roles[role] !== undefined ? "stored" : "options" }
      return { role, value: Array.isArray(family) ? family.map(pick) : pick(family as Family), source: "default" }
    }),
  }
}

type Available = Awaited<ReturnType<Context["model"]["list"]>>["data"]

function picker(models: Available, provider: string | undefined, cap: Effort) {
  const usable = models.filter((model) => model.enabled && model.status !== "deprecated")
  return (family: Family) => {
    const match = usable
      .filter((model) => family.pattern.test(model.id))
      .toSorted((a, b) => Number(b.providerID === provider) - Number(a.providerID === provider) || b.time.released - a.time.released)[0]
    if (!match) return "inherit-parent"
    const target = ladder[Math.max(ladder.indexOf(family.effort), ladder.indexOf(cap))]!
    const variant = ladder.slice(ladder.indexOf(target)).find((effort) => match.variants.some((item) => item.id === effort))
    return `${match.providerID}/${match.id}${variant ? `#${variant}` : ""}`
  }
}

function validate(role: string, value: Value) {
  const family = defaults[role]
  if (!family) throw new Error(`Unknown role "${role}". Roles: ${Object.keys(defaults).join("; ")}`)
  if (Array.isArray(family) !== Array.isArray(value))
    throw new Error(Array.isArray(family) ? `"${role}" is a panel. Pass an array of models.` : `"${role}" takes one model, not an array.`)
  const invalid = [value].flat().find((model) => !MODEL.test(model))
  if (invalid) throw new Error(`Invalid model "${invalid}". Use providerID/modelID, providerID/modelID#variant, or inherit-parent.`)
}
