import type { Context } from "@opencode/plugin/promise/plugin"
import type { SkillEditor } from "@opencode/plugin/promise/skill"
import path from "node:path"
import { readDocument, root } from "./markdown.ts"

type SkillInfo = Parameters<SkillEditor["add"]>[0]

// OpenCode has no plugin namespace for skills, so the prefix keeps `tdd` or `teach` from replacing the user's own.
export const skillID = (name: string) => `pstack-${name}`

export async function registerSkills(ctx: Context) {
  const directory = path.join(root, "skills")
  const documents = await Promise.all(
    Array.from(new Bun.Glob("*/SKILL.md").scanSync(directory), (file) => readDocument(path.join(directory, file))),
  )
  const skills = documents.map((document) => ({ name: path.basename(path.dirname(document.path)), document }))
  await ctx.skill.transform((editor) => {
    for (const skill of skills)
      editor.add({
        id: skillID(skill.name) as SkillInfo["id"],
        name: (skill.document.frontmatter.name ?? skill.name) as SkillInfo["name"],
        description: skill.document.frontmatter.description,
        autoinvoke: skill.document.frontmatter["disable-model-invocation"] !== true,
        path: skill.document.path as SkillInfo["path"],
        content: skill.document.body,
      })
  })
  return skills.map((skill) => ({ name: skill.name, description: skill.document.frontmatter.description }))
}
