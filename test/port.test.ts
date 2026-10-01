import { expect, test } from "bun:test"
import path from "node:path"
import { duration } from "../src/loop.ts"

const root = path.join(import.meta.dir, "..")
const read = (file: string) => Bun.file(path.join(root, file)).text()

test("ported skills keep upstream's voice and drop Cursor mechanisms", async () => {
  const swarm = await read("skills/swarm/SKILL.md")
  expect(swarm).toContain('the `subagent` tool, `agent: "general"`, `background: true`')
  expect(swarm).not.toContain("cloud")
  const how = await read("skills/how/SKILL.md")
  expect(how).toContain("- `agent`: `explore` (read-only)\n- `model`: the `how explorer` role from `pstack_roles`")
  expect(await read("skills/poteto-mode/SKILL.md")).toContain('**Use `agent: "poteto-agent"` for any subagent you spawn inside a playbook step**')
})

test("make-bot-ui (Cursor automations only) is not shipped", async () => {
  expect(await Bun.file(path.join(root, "skills/make-bot-ui/SKILL.md")).exists()).toBe(false)
})

test("loop intervals parse like Cursor's /loop", () => {
  expect([duration("90s"), duration("30m"), duration("2h"), duration("soon")]).toEqual([90_000, 1_800_000, 7_200_000, undefined])
})
