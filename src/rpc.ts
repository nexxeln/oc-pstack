// Shared by the server plugin and the TUI sidebar.
export const status = ["pending", "in_progress", "completed", "cancelled"] as const

export interface Todo {
  readonly content: string
  readonly status: (typeof status)[number]
}

const todos = {
  type: "array",
  items: {
    type: "object",
    properties: { content: { type: "string" }, status: { type: "string", enum: status } },
    required: ["content", "status"],
    additionalProperties: false,
  },
} as const

export const Rpc = {
  id: "pstack",
  methods: {
    todo: {
      input: { type: "object", properties: { sessionID: { type: "string" } }, required: ["sessionID"] },
      output: { type: "object", properties: { todos }, required: ["todos"] },
    },
  },
  events: {
    todo: { schema: { type: "object", properties: { sessionID: { type: "string" }, todos }, required: ["sessionID", "todos"] } },
  },
} as const

export const mark: Record<Todo["status"], string> = { pending: "[ ]", in_progress: "[•]", completed: "[✓]", cancelled: "[-]" }
