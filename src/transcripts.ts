// Reads OpenCode's private SQLite tables directly because the plugin API cannot list, export, or search sessions.
import { Database } from "bun:sqlite"
import { mkdir, realpath } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

const DAY = 86_400_000

export function openDatabase(channel: string) {
  const data = path.join(process.env.XDG_DATA_HOME ?? path.join(os.homedir(), ".local/share"), "opencode")
  const file =
    process.env.OPENCODE_DB ??
    (["latest", "dev", "beta", "next", "prod"].includes(channel) || ["1", "true"].includes(process.env.OPENCODE_DISABLE_CHANNEL_DB ?? "")
      ? "opencode.db"
      : `opencode-${channel.replace(/[^a-zA-Z0-9._-]/g, "-")}.db`)
  return new Database(path.resolve(data, file), { readonly: true })
}

interface SessionRow {
  id: string
  title: string | null
  parent_id: string | null
  agent: string | null
  idle_outcome: string | null
  directory: string
  project_id: string
  time_created: number
  time_updated: number
}

const summary = (row: SessionRow, current: string) => ({
  id: row.id,
  title: row.title ?? "",
  parentID: row.parent_id,
  agent: row.agent,
  outcome: row.idle_outcome,
  directory: row.directory,
  created: new Date(row.time_created).toISOString(),
  updated: new Date(row.time_updated).toISOString(),
  current: row.id === current,
})

export interface SessionsInput {
  readonly days?: number
  readonly children?: boolean
  readonly limit?: number
}

export function sessions(db: Database, project: string, current: string, input: SessionsInput) {
  const rows = db
    .query<SessionRow, [string, number, number, number]>(
      `select * from session_v2
       where project_id = ?1 and time_updated > ?2 and time_archived is null and (?3 = 1 or parent_id is null)
       order by time_updated desc limit ?4`,
    )
    .all(project, Date.now() - (input.days ?? 7) * DAY, input.children ? 1 : 0, input.limit ?? 50)
  return rows.map((row) => summary(row, current))
}

export interface SearchInput {
  readonly query: string
  readonly days?: number
  readonly children?: boolean
  readonly in?: ReadonlyArray<"user" | "assistant" | "tool">
  readonly limit?: number
  readonly hits?: number
}

interface HitRow extends SessionRow {
  seq: number
  kind: string
  body: string
  hit_time: number
}

export function search(db: Database, project: string, current: string, input: SearchInput) {
  const kinds = input.in ?? ["user", "assistant", "tool"]
  const rows = db
    .query<HitRow, [string, number, string, string, number]>(
      `with hits as (
         select m.session_id, m.seq, m.time_created, 'user' kind, json_extract(m.data, '$.text') body
         from session_message m where m.type = 'user'
         union all
         select m.session_id, m.seq, m.time_created,
           case json_extract(c.value, '$.type') when 'tool' then 'tool:' || json_extract(c.value, '$.name') else 'assistant' end,
           case json_extract(c.value, '$.type')
             when 'text' then json_extract(c.value, '$.text')
             when 'tool' then json_extract(c.value, '$.state.input')
           end
         from session_message m, json_each(m.data, '$.content') c where m.type = 'assistant'
       )
       select s.*, h.seq, h.kind, h.body, h.time_created hit_time
       from hits h join session_v2 s on s.id = h.session_id
       where s.project_id = ?1 and h.time_created > ?2 and s.id != ?4 and coalesce(s.parent_id, '') != ?4
         and (?5 = 1 or s.parent_id is null) and h.body like '%' || ?3 || '%'
       order by h.time_created desc limit 1000`,
    )
    .all(project, Date.now() - (input.days ?? 30) * DAY, input.query, current, input.children ? 1 : 0)
  const grouped = Map.groupBy(
    rows.filter((row) => kinds.some((kind) => row.kind === kind || row.kind.startsWith(`${kind}:`))),
    (row) => row.id,
  )
  return Array.from(grouped.values())
    .slice(0, input.limit ?? 20)
    .map((hits) => ({
      session: summary(hits[0]!, current),
      total: hits.length,
      hits: hits.slice(0, input.hits ?? 3).map((hit) => ({
        seq: hit.seq,
        kind: hit.kind,
        time: new Date(hit.hit_time).toISOString(),
        snippet: snippet(hit.body, input.query),
      })),
    }))
}

function snippet(body: string, query: string) {
  const at = body.toLowerCase().indexOf(query.toLowerCase())
  const start = Math.max(0, at - 100)
  return `${start > 0 ? "…" : ""}${body.slice(start, at + query.length + 100).replace(/\s+/g, " ")}${at + query.length + 100 < body.length ? "…" : ""}`
}

export interface TranscriptInput {
  readonly sessionID?: string
  readonly tools?: "none" | "calls" | "full"
  readonly thinking?: boolean
  readonly from?: number
  readonly maxChars?: number
  readonly file?: boolean
}

export async function transcript(db: Database, project: string, current: string, input: TranscriptInput) {
  const id = input.sessionID ?? current
  const session = db.query<SessionRow, [string]>("select * from session_v2 where id = ?1").get(id)
  if (!session) throw new Error(`Session not found: ${id}`)
  if (session.project_id !== project) throw new Error(`Session ${id} belongs to another project. pstack only reads the current project's sessions.`)
  const messages = db
    .query<{ seq: number; type: string; data: string }, [string, number]>(
      "select seq, type, data from session_message where session_id = ?1 and seq >= ?2 order by seq",
    )
    .all(id, input.from ?? 0)
  const children = db
    .query<SessionRow, [string]>("select * from session_v2 where parent_id = ?1 order by time_created")
    .all(id)
  const options = { tools: input.tools ?? "calls", thinking: input.thinking ?? false }
  const header = [
    `# ${session.title ?? id}`,
    `session: ${id} · agent: ${session.agent ?? "?"} · outcome: ${session.idle_outcome ?? "?"} · updated: ${new Date(session.time_updated).toISOString()}`,
    ...(children.length
      ? ["subagent sessions:", ...children.map((child) => `- ${child.id} ${child.title ?? ""} (${child.idle_outcome ?? "?"})`)]
      : []),
  ].join("\n")
  const blocks = messages.flatMap((message) => render(message.seq, message.type, JSON.parse(message.data), options))
  if (input.file) {
    const directory = path.join(await realpath(os.tmpdir()), "opencode", "pstack")
    await mkdir(directory, { recursive: true })
    const target = path.join(directory, `transcript-${id}.md`)
    const text = [header, ...blocks].join("\n\n") + "\n"
    await Bun.write(target, text)
    return { sessionID: id, path: target, chars: text.length, messages: messages.length }
  }
  const limit = input.maxChars ?? 40_000
  const page = blocks.reduce<{ text: string[]; size: number; next?: number }>(
    (acc, block, index) => {
      if (acc.next !== undefined) return acc
      if (acc.size + block.length > limit && acc.text.length > 0) return { ...acc, next: messages[index]?.seq }
      return { text: [...acc.text, block], size: acc.size + block.length }
    },
    { text: [], size: header.length },
  )
  return { sessionID: id, text: [header, ...page.text].join("\n\n"), next: page.next ?? null }
}

type Json = Record<string, any>

export function render(seq: number, type: string, data: Json, options: { tools: "none" | "calls" | "full"; thinking: boolean }) {
  const anchor = `[#${seq}]`
  if (type === "user") return [`## ${anchor} User\n\n${data.text ?? ""}${attachments(data)}`]
  if (type === "synthetic") return [`## ${anchor} Synthetic\n\n${clip(data.text ?? "", 2_000)}`]
  if (type === "system") return [`## ${anchor} System\n\n${data.description ?? clip(data.text ?? "", 500)}`]
  if (type === "skill") return [`_${anchor} skill loaded: ${data.skill}_`]
  if (type === "shell") return [`## ${anchor} Shell\n\n\`\`\`\n$ ${data.command}\n${clip(data.output?.output ?? "", 2_000)}\n\`\`\``]
  if (type === "compaction") return [`## ${anchor} Compaction (${data.status})\n\n${clip(data.summary ?? "", 4_000)}`]
  if (type === "agent-switched") return [`_${anchor} agent → ${data.agent}_`]
  if (type === "model-switched") return [`_${anchor} model → ${data.model?.providerID}/${data.model?.id}_`]
  if (type === "location-switched") return [`_${anchor} moved → ${data.location?.directory}_`]
  if (type === "idle") return [`_${anchor} idle: ${data.outcome}_`]
  if (type !== "assistant") return []
  const parts = (data.content as Json[]).flatMap((part) => {
    if (part.type === "text") return part.text ? [`${part.text}\n`] : []
    if (part.type === "reasoning") return options.thinking && part.text ? [`_Thinking:_ ${part.text}\n`] : []
    if (part.type !== "tool" || options.tools === "none") return []
    const state = part.state as Json
    const error = state.status === "error" ? ` error: ${clip(state.error?.message ?? JSON.stringify(state.error), 300)}` : ""
    if (options.tools === "calls") return [`- ${part.name} [${state.status}] ${clip(inputText(state.input), 200)}${error}`]
    const output = ((state.content ?? []) as Json[]).map((item) => (item.type === "text" ? item.text : `[${item.type}]`)).join("\n")
    return [`**Tool: ${part.name}** [${state.status}]${error}\n\n\`\`\`json\n${inputText(state.input)}\n\`\`\`\n\n${output}`]
  })
  if (parts.length === 0 && !data.error) return []
  const failure = data.error ? `\n\n_error: ${clip(data.error.message ?? JSON.stringify(data.error), 300)}_` : ""
  return [`## ${anchor} Assistant (${data.agent})\n\n${parts.join("\n")}${failure}`]
}

const inputText = (input: unknown) => (typeof input === "string" ? input : JSON.stringify(input))

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}… (${text.length - max} more chars)` : text)

const attachments = (data: Json) => {
  const names = [
    ...((data.files ?? []) as Json[]).map((file) => file.name ?? file.uri ?? "file"),
    ...((data.skills ?? []) as Json[]).map((skill) => `@${skill.id}`),
    ...((data.agents ?? []) as Json[]).map((agent) => `@${agent.name}`),
  ]
  return names.length ? `\n\n_attached: ${names.join(", ")}_` : ""
}
