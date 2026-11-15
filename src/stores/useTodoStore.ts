import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
}

interface TodoState {
  tasks: Task[];
  add: (title: string) => boolean;
  edit: (id: string, title: string) => boolean;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clearCompleted: () => void;
}

function validTitle(title: string) {
  return title.trim().length > 0 && title.trim().length <= 200;
}

export const useTodoStore = create<TodoState>()(
  persist(
    (set, get) => ({
      tasks: [],
      add: (title) => {
        if (!validTitle(title)) return false;
        set((state) => ({
          tasks: [
            ...state.tasks,
            {
              id: crypto.randomUUID(),
              title: title.trim(),
              completed: false,
              createdAt: Date.now(),
            },
          ],
        }));
        return true;
      },
      edit: (id, title) => {
        if (!validTitle(title) || !get().tasks.some((task) => task.id === id))
          return false;
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, title: title.trim() } : task,
          ),
        }));
        return true;
      },
      toggle: (id) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, completed: !task.completed } : task,
          ),
        })),
      remove: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        })),
      clearCompleted: () =>
        set((state) => ({
          tasks: state.tasks.filter((task) => !task.completed),
        })),
    }),
    { name: "webos-todos", version: 1 },
  ),
);
