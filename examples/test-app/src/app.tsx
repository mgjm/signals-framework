import { For, Show, createEffect } from "signals-framework";

type TodoItem = { title: string; done: boolean };

export function App()  {
  const newTitle = new Signal.State("");
  const todos = new Signal.State<TodoItem[]>(JSON.parse(localStorage.getItem('todos') || '[]'));

  createEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos.get()));
  });

  function addTodo(e: SubmitEvent)  {
    e.preventDefault();
    todos.set([...todos.get(), {
      title: newTitle.get(),
      done: false,
    }]);
    newTitle.set("");
  }

  function changeTodos(cb: (todos: TodoItem[]) => void) {
    const newTodos = [...todos.get()];
    cb(newTodos);
    todos.set(newTodos)
  }

  function changeTodo(i: number, todo: Partial<TodoItem>) {
    changeTodos(todos => {
      todos.splice(i, 1, {
        ...todos[i],
        ...todo,
      });
    });
  }

  const length = new Signal.Computed(() => todos.get().length);
  const isEmpty = new Signal.Computed(() => todos.get().length === 0);

  return (
    <>
      <h3>Simple Todos Example</h3>
      <form on:submit={addTodo}>
        <input
          placeholder="enter todo and click +"
          required
          value={newTitle}
          on:input={(e) => newTitle.set((e.currentTarget as any).value)}
        />
        <button>+</button>
      </form>
      <p>{length} Todos:</p>
      <Show when={isEmpty}>
        <p>No Todos yet</p>
      </Show>
      <For each={todos}>
        {(todo, i) => (
          <div>
            <input
              type="checkbox"
              checked={todo.done}
              on:change={(e) => changeTodo(i.get(), {
                done: (e.currentTarget as any).checked,
              })}
            />
            <input
              type="text"
              value={todo.title}
              on:change={(e) => changeTodo(i.get(), {
                title: (e.currentTarget as any).value,
              })}
            />
            <button on:click={() => changeTodos(todos => {
              todos.splice(i.get(), 1);
            })}>
              x
            </button>
          </div>
        )}
      </For>
    </>
  );
}
