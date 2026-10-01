import { Plugin } from "@opencode/plugin"
import { registerAgents } from "./agents.ts"
import { registerCommands } from "./commands.ts"
import { registerContext } from "./context.ts"
import { createLoops } from "./loop.ts"
import { registerSkills } from "./skills.ts"
import { registerTools } from "./tools.ts"

export default Plugin.define({
  id: "pstack",
  async setup(ctx) {
    const loops = createLoops(ctx)
    const skills = await registerSkills(ctx)
    const instructions = await registerAgents(ctx)
    await registerContext(ctx, instructions, loops)
    await registerCommands(ctx, skills, loops)
    await registerTools(ctx, loops)
    return () => loops.dispose()
  },
})
