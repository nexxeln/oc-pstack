import type { Context } from "@opencode/plugin/promise/plugin"
import path from "node:path"
import { readDocument, root } from "./markdown.ts"
import { skillID } from "./skills.ts"

// Upstream's names: `/poteto-mode` is the sticky mode, `poteto-agent` and Comment Sicko are subagents.
export const Agents = {
  mode: "poteto",
  delegate: "poteto-agent",
  sicko: "comment-sicko",
} as const

export async function registerAgents(ctx: Context) {
  const [mode, delegate, sicko] = await Promise.all(
    ["skills/poteto-mode/SKILL.md", "agents/poteto-agent.md", "agents/comment-sicko.md"].map((file) => readDocument(path.join(root, file))),
  )
  await ctx.agent.transform((editor) => {
    editor.update(Agents.mode, (agent) => {
      agent.mode = "primary"
      agent.color = "#EAB308"
      agent.description = mode!.frontmatter.description
    })
    editor.update(Agents.delegate, (agent) => {
      agent.mode = "subagent"
      agent.description = delegate!.frontmatter.description
    })
    editor.update(Agents.sicko, (agent) => {
      agent.mode = "subagent"
      agent.description = `${sicko!.frontmatter.description} Read-only. Usually invoked through /no-comments.`
      agent.permissions.push({ action: "edit", resource: "*", effect: "deny" })
    })
  })
  // Config appends the user's global `permission` after every agent's rules, so a blanket `"*": "allow"` wins over the
  // rule above. Comment Sicko is report-only upstream; the evaluate hook keeps it that way.
  await ctx.permission.hook("evaluate", (event) => {
    if (event.agent !== Agents.sicko || event.action !== "edit") return
    event.effect = "deny"
    event.message = "Comment Sicko reports. It never edits."
  })

  // Cursor appends a mode skill's `reminder` every turn and loads an agent file as the subagent's instructions.
  // OpenCode has no per-agent prompt addendum that keeps the base system prompt, so the `context` hook adds it.
  return {
    [Agents.mode]: [
      `You are in Poteto Mode, the sticky mode from pstack's \`/poteto-mode\`. ${mode!.frontmatter.reminder}`,
      `"Apply /poteto-mode" means load the \`${skillID("poteto-mode")}\` skill in full and follow it. Every pstack skill loads as \`pstack-<name>\`, principles as \`pstack-principle-<name>\`. The user leaves the mode by switching agents or by saying so.`,
    ].join("\n\n"),
    [Agents.delegate]: delegate!.body.replace("the `poteto-mode` skill's", `the \`${skillID("poteto-mode")}\` skill's`).trim(),
    [Agents.sicko]: sicko!.body.trim(),
  } as Record<string, string>
}
