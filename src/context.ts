import type { Context } from "@opencode/plugin/promise/plugin"
import type { Loops } from "./loop.ts"

export async function registerContext(ctx: Context, instructions: Record<string, string>, loops: Loops) {
  await ctx.session.hook("context", async (input) => {
    const goal = await loops.goal(input.sessionID)
    const text = [
      instructions[input.agent],
      goal && `<goal>\nThe armed goal for this session. It holds across turns until it is met or cleared with \`pstack_goal\`.\n\n${goal}\n</goal>`,
    ]
      .filter(Boolean)
      .join("\n\n")
    if (text) input.system.push({ type: "text", text })
  })
}
