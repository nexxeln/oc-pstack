import type { CommandInvocation } from "@opencode/plugin/promise/command"
import type { Context } from "@opencode/plugin/promise/plugin"
import { Agents } from "./agents.ts"
import { duration, type Loops } from "./loop.ts"
import { skillID } from "./skills.ts"

// Cursor exposes every pstack skill as a slash command. Principles stay `@pstack-principle-*` attachments.
const special = new Set(["poteto-mode", "setup-pstack"])

export async function registerCommands(ctx: Context, skills: ReadonlyArray<{ name: string; description?: string }>, loops: Loops) {
  const withSkill = (name: string, fallback: string) => async (input: CommandInvocation) => {
    await ctx.session.prompt({
      ...input.prompt,
      text: input.prompt.text.trim() || fallback,
      sessionID: input.sessionID,
      delivery: input.delivery,
      skills: [...(input.prompt.skills ?? []), { id: skillID(name) }],
    })
  }

  await ctx.command.transform((editor) => {
    editor.add({
      name: "poteto-mode",
      description: "enter Poteto Mode (sticky) and route the task through its playbooks",
      execute: async (input) => {
        await ctx.session.switchAgent({ sessionID: input.sessionID, agent: Agents.mode })
        if (input.prompt.text.trim() === "") return
        await withSkill("poteto-mode", "")(input)
      },
    })
    editor.add({
      name: "setup-pstack",
      description: "choose pstack's model per role and reasoning budget",
      execute: withSkill("setup-pstack", "Set up pstack."),
    })
    for (const skill of skills) {
      if (special.has(skill.name) || skill.name.startsWith("principle-")) continue
      editor.add({
        name: skill.name,
        description: summary(skill.description),
        execute: withSkill(skill.name, `Run ${skill.name}.`),
      })
    }
    editor.add({
      name: "loop",
      description: "re-run a prompt each time this session goes idle: /loop [30m] <prompt> · /loop stop",
      execute: async (input) => {
        const text = input.prompt.text.trim()
        if (text === "stop" || text === "") {
          const result = loops.stop(input.sessionID)
          await ctx.session.synthetic({ sessionID: input.sessionID, text: result, description: result, resume: false })
          return
        }
        const [first = "", ...rest] = text.split(/\s+/)
        const every = duration(first) === undefined ? undefined : first
        await loops.start(input.sessionID, { prompt: every ? rest.join(" ") : text, every }, true)
      },
    })
  })
}

const summary = (description?: string) => {
  const sentence = (description ?? "").split(/(?<=\.)\s/)[0] ?? ""
  return sentence.length > 120 ? `${sentence.slice(0, 117)}…` : sentence
}
