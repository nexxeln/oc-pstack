import type { Context } from "@opencode/plugin/promise/plugin"

// OpenCode equivalents of Cursor's `/loop` and `/goal`, which pstack's autonomous playbooks lean on.

interface Loop {
  readonly prompt: string
  readonly every?: number
  readonly max: number
  iteration: number
  timer?: ReturnType<typeof setTimeout>
}

export interface LoopInput {
  readonly prompt?: string
  readonly every?: string
  readonly stop?: boolean
  readonly reason?: string
}

const UNIT = { s: 1_000, m: 60_000, h: 3_600_000 } as const

export function duration(text: string) {
  const match = /^(\d+)(s|m|h)$/.exec(text.trim())
  if (!match) return undefined
  return Number(match[1]) * UNIT[match[2] as keyof typeof UNIT]
}

export function createLoops(ctx: Context) {
  const loops = new Map<string, Loop>()
  const goals = new Map<string, string | null>()
  const abort = new AbortController()
  const max = Number((ctx.options.loop as { max?: number } | undefined)?.max ?? 50)

  const send = async (sessionID: string, loop: Loop) => {
    loop.timer = undefined
    loop.iteration++
    if (loop.iteration > loop.max) return stop(sessionID)
    await ctx.session.prompt({
      sessionID: sessionID as never,
      text: [
        `Loop iteration ${loop.iteration} of at most ${loop.max}${loop.every ? `, every ${loop.every / 60_000} min` : ", dynamic mode"}.`,
        "",
        loop.prompt,
        "",
        "When the loop's done condition holds, call `pstack_loop` with `stop: true` and a one-line reason. Otherwise end your turn and the loop continues.",
      ].join("\n"),
      metadata: { pstack: { loop: loop.iteration } },
    })
  }

  const stop = (sessionID: string) => {
    const loop = loops.get(sessionID)
    if (loop?.timer) clearTimeout(loop.timer)
    loops.delete(sessionID)
    return loop
  }

  const next = (sessionID: string) => {
    const loop = loops.get(sessionID)
    if (!loop || loop.timer) return
    loop.timer = setTimeout(() => void send(sessionID, loop).catch(() => stop(sessionID)), loop.every ?? 0)
  }

  void (async () => {
    for await (const event of ctx.event.subscribe({ signal: abort.signal })) {
      if (!("data" in event) || !event.data || typeof event.data !== "object" || !("sessionID" in event.data)) continue
      const sessionID = String(event.data.sessionID)
      if (!loops.has(sessionID)) continue
      if (event.type === "session.execution.succeeded") next(sessionID)
      if (event.type === "session.execution.failed") stop(sessionID)
      if (event.type === "session.execution.interrupted" && "reason" in event.data && event.data.reason === "user") stop(sessionID)
    }
  })().catch(() => {})

  return {
    /** Arms a loop. `immediate` sends iteration 1 now (the user's `/loop`); otherwise it starts when this turn ends. */
    async start(sessionID: string, input: { prompt: string; every?: string }, immediate: boolean) {
      const every = input.every === undefined ? undefined : duration(input.every)
      if (input.every !== undefined && every === undefined) throw new Error(`Invalid interval "${input.every}". Use 90s, 30m, or 2h.`)
      stop(sessionID)
      const loop: Loop = { prompt: input.prompt, every, max, iteration: 0 }
      loops.set(sessionID, loop)
      if (immediate) await send(sessionID, loop)
      return describe(loop)
    },
    stop: (sessionID: string) => {
      const loop = stop(sessionID)
      return loop ? `Stopped the loop after ${loop.iteration} iterations.` : "No loop is running."
    },
    status: (sessionID: string) => {
      const loop = loops.get(sessionID)
      return loop ? describe(loop) : "No loop is running."
    },
    async goal(sessionID: string, text?: string | null) {
      const key = `goal/${sessionID}`
      if (text === undefined) {
        if (!goals.has(sessionID)) goals.set(sessionID, ((await ctx.storage.get(key)) as string | undefined) ?? null)
        return goals.get(sessionID) ?? null
      }
      goals.set(sessionID, text)
      await (text === null ? ctx.storage.remove(key) : ctx.storage.set(key, text))
      return text
    },
    dispose() {
      abort.abort()
      loops.forEach((loop) => loop.timer && clearTimeout(loop.timer))
      loops.clear()
    },
  }
}

export type Loops = ReturnType<typeof createLoops>

const describe = (loop: Loop) =>
  `Loop armed: ${loop.every ? `every ${loop.every / 60_000} min` : "dynamic mode"}, iteration ${loop.iteration} of at most ${loop.max}. Prompt: ${loop.prompt}`
