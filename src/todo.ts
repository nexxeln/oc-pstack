import type { Context } from "@opencode/plugin/promise/plugin"
import type { Todo } from "./rpc.ts"

export async function readTodos(ctx: Context, sessionID: string) {
  return ((await ctx.storage.get(`todo/${sessionID}`)) ?? []) as unknown as Todo[]
}

export async function writeTodos(ctx: Context, sessionID: string, todos: readonly Todo[]) {
  const value = todos.map((item) => ({ content: item.content, status: item.status }))
  await ctx.storage.set(`todo/${sessionID}`, value)
  return value
}
