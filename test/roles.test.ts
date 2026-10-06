import type { Context } from "@opencode/plugin/promise/plugin"
import { expect, test } from "bun:test"
import { roles } from "../src/roles.ts"

function fixture(stored: unknown = null, options = {}) {
  let value = stored
  const ctx = {
    storage: {
      get: async () => value,
      set: async (_key: string, next: unknown) => { value = next },
    },
    session: { get: async () => ({ model: { providerID: "opencode" } }) },
    model: {
      default: async () => ({ data: { providerID: "other" } }),
      list: async () => ({ data: [
        { id: "claude-opus-5-5", variants: ["max", "xhigh", "high", "medium"] },
        { id: "grok-4.7", variants: ["xhigh", "high", "medium"] },
        { id: "gpt-6.1-sol", variants: ["max", "xhigh", "high", "medium"] },
      ].map((model) => ({
        ...model, providerID: "opencode", enabled: true, status: "active", time: { released: 1 },
        variants: model.variants.map((id) => ({ id })),
      })) }),
    },
    options,
  } as unknown as Context
  return ctx
}

test("defaults use Opus and Grok at xhigh with two-seat panels", async () => {
  const result = await roles(fixture(), "ses_test", {})
  expect(result.budget).toBeNull()
  expect(Object.fromEntries(result.roles.map(({ role, value }) => [role, value]))).toEqual({
    "feature, refactoring": "opencode/grok-4.7#xhigh",
    "bug-fix": "opencode/grok-4.7#xhigh",
    "perf-issue": "opencode/grok-4.7#xhigh",
    hillclimb: "opencode/grok-4.7#xhigh",
    "judgment and prose": "opencode/claude-opus-5-5#xhigh",
    "hardest tasks": "opencode/claude-opus-5-5#xhigh",
    "how explorer": "opencode/grok-4.7#xhigh",
    "how explainer": "opencode/claude-opus-5-5#xhigh",
    "why investigators": "opencode/grok-4.7#xhigh",
    "why synthesizer": "opencode/claude-opus-5-5#xhigh",
    "reflect tooling": "opencode/grok-4.7#xhigh",
    "reflect judgment, divergent, synthesizer": "opencode/claude-opus-5-5#xhigh",
    "arena runners": ["opencode/claude-opus-5-5#xhigh", "opencode/grok-4.7#xhigh"],
    "arena cross-judge pool": ["opencode/claude-opus-5-5#xhigh", "opencode/grok-4.7#xhigh"],
    "swarm workers": "opencode/grok-4.7#xhigh",
    "architect runners": ["opencode/claude-opus-5-5#xhigh", "opencode/grok-4.7#xhigh"],
    "interrogate reviewers": ["opencode/claude-opus-5-5#xhigh", "opencode/grok-4.7#xhigh"],
  })
})

test.each([
  ["unlimited", "max", "xhigh"],
  ["large", "xhigh", "xhigh"],
  ["medium", "high", "high"],
  ["small", "medium", "medium"],
])("%s budget selects supported reasoning variants", async (budget, opus, grok) => {
  const ctx = fixture()
  await roles(ctx, "ses_test", { budget })
  const result = await roles(ctx, "ses_test", {})
  expect(result.budget).toBe(budget)
  expect(result.roles.find(({ role }) => role === "arena runners")?.value).toEqual([
    `opencode/claude-opus-5-5#${opus}`, `opencode/grok-4.7#${grok}`,
  ])
})

test("upstream defaults preserve explicit stored and plugin-option choices", async () => {
  const ctx = fixture({ budget: "unlimited", roles: {
    "reflect tooling": "opencode/gpt-6.1-sol#max",
    "arena runners": ["inherit-parent", "opencode/gpt-6.1-sol#max"],
  } }, { roles: { "how explorer": "inherit-parent" } })
  const result = await roles(ctx, "ses_test", {})
  expect(result.roles.filter(({ source }) => source !== "default")).toEqual([
    { role: "how explorer", value: "inherit-parent", source: "options" },
    { role: "reflect tooling", value: "opencode/gpt-6.1-sol#max", source: "stored" },
    { role: "arena runners", value: ["inherit-parent", "opencode/gpt-6.1-sol#max"], source: "stored" },
  ])
})

test.each(["unlimited, max reasoning", "typo", "__proto__"])("rejects invalid budget %s without storing it", async (budget) => {
  const ctx = fixture({ budget: "small", roles: {} })
  await expect(roles(ctx, "ses_test", { budget })).rejects.toThrow("Unknown budget")
  const result = await roles(ctx, "ses_test", {})
  expect(result.budget).toBe("small")
  expect(result.roles.find(({ role }) => role === "judgment and prose")?.value).toBe("opencode/claude-opus-5-5#medium")
})
