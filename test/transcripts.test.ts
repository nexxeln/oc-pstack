import { Database } from "bun:sqlite"
import { expect, test } from "bun:test"
import { render, search, sessions, transcript } from "../src/transcripts.ts"

const now = Date.now()

function fixture() {
  const db = new Database(":memory:")
  db.run(`create table session_v2 (id text, project_id text, parent_id text, title text, agent text, idle_outcome text,
    directory text, time_created integer, time_updated integer, time_archived integer)`)
  db.run("create table session_message (id text, session_id text, type text, seq integer, time_created integer, data text)")
  const session = db.query("insert into session_v2 values (?, ?, ?, ?, 'build', 'succeeded', '/repo', ?, ?, null)")
  session.run("ses_a", "p1", null, "fix scroll drift", now - 1000, now - 1000)
  session.run("ses_b", "p1", null, "current", now, now)
  session.run("ses_c", "p2", null, "other project", now, now)
  const message = db.query("insert into session_message values (?, ?, ?, ?, ?, ?)")
  message.run("m1", "ses_a", "user", 1, now - 900, JSON.stringify({ text: "the scroll drifts every 750ms" }))
  message.run(
    "m2",
    "ses_a",
    "assistant",
    2,
    now - 800,
    JSON.stringify({
      agent: "build",
      content: [
        { type: "text", text: "Reproducing first." },
        { type: "reasoning", text: "hidden" },
        { type: "tool", name: "shell", state: { status: "completed", input: { command: "bun test scroll" }, content: [{ type: "text", text: "1 fail" }] } },
      ],
    }),
  )
  message.run("m3", "ses_b", "user", 1, now, JSON.stringify({ text: "search for scroll" }))
  message.run("m4", "ses_c", "user", 1, now, JSON.stringify({ text: "scroll in another project" }))
  return db
}

test("sessions lists the current project newest first", () => {
  expect(sessions(fixture(), "p1", "ses_b", {}).map((row) => [row.id, row.current])).toEqual([
    ["ses_b", true],
    ["ses_a", false],
  ])
})

test("search skips the current session and other projects", () => {
  const results = search(fixture(), "p1", "ses_b", { query: "SCROLL" })
  expect(results.map((result) => [result.session.id, result.total, result.hits.map((hit) => [hit.seq, hit.kind])])).toEqual([
    ["ses_a", 2, [[2, "tool:shell"], [1, "user"]]],
  ])
})

test("search filters by kind", () => {
  expect(search(fixture(), "p1", "ses_b", { query: "scroll", in: ["user"] })[0]?.total).toBe(1)
})

test("render prints one line per tool call and hides reasoning", () => {
  const db = fixture()
  const row = db.query<{ data: string }, []>("select data from session_message where id = 'm2'").get()!
  expect(render(2, "assistant", JSON.parse(row.data), { tools: "calls", thinking: false })).toEqual([
    '## [#2] Assistant (build)\n\nReproducing first.\n\n- shell [completed] {"command":"bun test scroll"}',
  ])
})

test("transcript refuses sessions from another project", async () => {
  await expect(transcript(fixture(), "p1", "ses_b", { sessionID: "ses_c" })).rejects.toThrow("another project")
})

test("transcript pages by maxChars", async () => {
  const result = await transcript(fixture(), "p1", "ses_b", { sessionID: "ses_a", maxChars: 150 })
  expect("next" in result && result.next).toBe(2)
})
