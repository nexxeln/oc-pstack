// Regenerates skills/ and agents/ from vendor/pstack: exact patches, then generic rewrites, then overlay files.
// Fails when a patch no longer matches upstream or a Cursor mechanism survives the port.
import { cp, mkdir, readdir, rm } from "node:fs/promises"
import path from "node:path"
import { drop, patches } from "../overlay/patches.ts"

const root = path.join(import.meta.dir, "..")
const vendor = path.join(root, "vendor/pstack")
const overlay = path.join(root, "overlay")

const skillNames = (await readdir(path.join(vendor, "skills"), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && !drop.includes(`skills/${entry.name}`))
  .map((entry) => entry.name)

const roleOf = (name: string) => (name === "feature" ? "feature, refactoring" : name)

const rewrites: Array<[RegExp, string | ((match: string, ...groups: string[]) => string)]> = [
  [/- `subagent_type`: `generalPurpose`\n((?:- .*\n)*?)- `readonly`: `true`/g, "- `agent`: `explore` (read-only)\n$1"],
  [/the `([a-z ,-]+)` model \(default `[^`]+`\)/g, "the `$1` role from `pstack_roles`"],
  [/subagent_type: "poteto-agent"/g, 'agent: "poteto-agent"'],
  [/subagent_type: "Comment Sicko"/g, 'agent: "comment-sicko"'],
  [/`subagent_type`: `generalPurpose`/g, "`agent`: `general`"],
  [/`subagent_type: generalPurpose`/g, '`agent: "general"`'],
  [/subagent_type: generalPurpose/g, 'agent: "general"'],
  [/`generalPurpose`/g, "`general`"],
  [/\bgeneralPurpose\b/g, "general"],
  [/`run_in_background: true`/g, "`background: true`"],
  [/run_in_background: true/g, "background: true"],
  [/the Task tool/g, "the `subagent` tool"],
  [/\bTask tool\b/g, "`subagent` tool"],
  [/`Task` calls/g, "`subagent` calls"],
  [/`Task` call\b/g, "`subagent` call"],
  [/`Task` (prompts|response|subagent|with)/g, "`subagent` $1"],
  [/`Task`/g, "`subagent`"],
  [/`AskQuestion`/g, "the `question` tool"],
  [/\bAskQuestion\b/g, "the `question` tool"],
  [/\btodolist\b/g, "`pstack_todo` list"],
  [/\bopen todos\b/g, "open `pstack_todo` items"],
  [/arm a `\/goal`/g, "arm `pstack_goal`"],
  [/`model`: the `([^`]+)` line, default `[^`]+`/g, "`model`: the `$1` role from `pstack_roles`"],
  [/- `readonly`: `true`/g, "- `agent`: `explore` (read-only)"],
  [/your configured ([a-z-]+) model \(default `[^`]+`\)/g, (_, name: string) => `the \`${roleOf(name)}\` role from \`pstack_roles\``],
  [/the armed `\/goal`/g, "the armed goal (`pstack_goal`)"],
  [/the armed \/goal/g, "the armed goal"],
  [/Cursor's built-in `create-skill` skill/g, "the `skill-creator` skill"],
  [/\bcreate-skill\b/g, "skill-creator"],
  ...skillNames.map((name): [RegExp, string] => [
    new RegExp(`\\*\\*${name.replaceAll("-", "\\-")}\\*\\* skill(?! \\(\`pstack-)`, "g"),
    `**${name}** skill (\`pstack-${name}\`)`,
  ]),
]

const CURSOR = /grok-4\.|claude-opus-5|gpt-5\.6|`readonly`|readonly\/Ask|\.cursor\b|agent-transcripts|pstack-models|subagent_type|run_in_background|AskQuestion|readonly: |environment: "|cloud_base_branch|cursor-team-kit|control-(ui|cli)|cloud[ -](agent|root|vm|worker)|\bCursor\b/i
// `why` asks for the user's editor cursor location, which is not Cursor the product.
const allowed = [/cursor location/]

const port = (file: string, text: string) => {
  const patched = (patches[file] ?? []).reduce((result, [find, replace]) => {
    if (!result.includes(find)) throw new Error(`patch no longer matches ${file}:\n${find.slice(0, 160)}…`)
    return result.replace(find, replace)
  }, text)
  return rewrites.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement as (substring: string, ...args: string[]) => string),
    patched,
  )
}

await rm(path.join(root, "skills"), { recursive: true, force: true })
await rm(path.join(root, "agents"), { recursive: true, force: true })

const files = (await Array.fromAsync(new Bun.Glob("{skills,agents}/**/*").scan({ cwd: vendor, dot: true }))).filter(
  (file) => !file.includes("node_modules/") && !drop.some((prefix) => file.startsWith(`${prefix}/`)),
)
const unused = Object.keys(patches).filter((file) => !files.includes(file))
if (unused.length) throw new Error(`patches target missing files: ${unused.join(", ")}`)

await Promise.all(
  files.map(async (file) => {
    const target = path.join(root, file)
    await mkdir(path.dirname(target), { recursive: true })
    if (!/\.(md|sh)$/.test(file)) return cp(path.join(vendor, file), target)
    return Bun.write(target, port(file, await Bun.file(path.join(vendor, file)).text()))
  }),
)
await cp(path.join(overlay, "skills"), path.join(root, "skills"), { recursive: true })

const residue = (
  await Promise.all(
    (await Array.fromAsync(new Bun.Glob("{skills,agents}/**/*.{md,sh}").scan({ cwd: root }))).map(async (file) =>
      (await Bun.file(path.join(root, file)).text())
        .split("\n")
        .flatMap((line, index) =>
          CURSOR.test(line) && !allowed.some((pattern) => pattern.test(line)) ? [`${file}:${index + 1}: ${line.trim().slice(0, 160)}`] : [],
        ),
    ),
  )
).flat()
if (residue.length) {
  console.error(residue.join("\n"))
  throw new Error(`${residue.length} lines still name Cursor mechanisms`)
}
console.log(`ported ${skillNames.length} skills and ${files.filter((file) => file.startsWith("agents/")).length} agents`)
