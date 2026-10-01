import { Plugin } from "@opencode/plugin/tui"
import { createEffect, createSignal, For, onCleanup, Show } from "solid-js"
import { mark, Rpc, type Todo } from "./rpc.ts"

// Cursor renders its todo list next to the chat. This is the same list in OpenCode's sidebar.
function Todos(props: { context: Plugin.Context; sessionID: string }) {
  const theme = props.context.theme
  const rpc = props.context.client.rpc(Rpc)
  const [todos, setTodos] = createSignal<readonly Todo[]>([])

  createEffect(() => {
    const sessionID = props.sessionID
    const directory = props.context.data.session.get(sessionID)?.location.directory
    void rpc
      .todo({ sessionID }, directory ? { location: { directory } } : undefined)
      .then((result) => setTodos((result as { todos: Todo[] }).todos))
      .catch(() => setTodos([]))
  })
  onCleanup(
    rpc.events.on("todo", (event) => {
      if (event.data.sessionID === props.sessionID) setTodos(event.data.todos as Todo[])
    }),
  )

  return (
    <Show when={todos().length > 0}>
      <box>
        <text fg={theme.text.base}>
          <b>Todo</b>
        </text>
        <For each={todos()}>
          {(item) => (
            <text fg={item.status === "completed" || item.status === "cancelled" ? theme.text.muted : theme.text.base}>
              {mark[item.status]} {item.content}
            </text>
          )}
        </For>
      </box>
    </Show>
  )
}

export default Plugin.define({
  id: "pstack.tui",
  setup(context) {
    context.ui.slot({
      append: "sidebar.content",
      render: (props) => <Todos context={context} sessionID={props.sessionID} />,
    })
  },
})
