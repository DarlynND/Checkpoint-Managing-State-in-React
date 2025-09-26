import React, { useEffect, useMemo, useReducer, useRef, useState } from "react";

const STORAGE_KEY = "todo.tasks.v1";

/** @typedef {{ id: string, name: string, description: string, completed: boolean, createdAt: number, updatedAt: number }} Task */

/** @typedef {{ tasks: Task[] }} State */

const initialState /** @type {State} */ = { tasks: [] };

// ------------------------------ Reducer ---------------------------------
function tasksReducer(state, action) {
  switch (action.type) {
    case "HYDRATE": {
      return { tasks: action.payload };
    }
    case "ADD": {
      const now = Date.now();
      const newTask = {
        id: crypto.randomUUID(),
        name: action.payload.name.trim(),
        description: action.payload.description.trim(),
        completed: false,
        createdAt: now,
        updatedAt: now,
      };
      return { tasks: [...state.tasks, newTask] };
    }
    case "UPDATE": {
      const { id, name, description } = action.payload;
      return {
        tasks: state.tasks.map((t) =>
          t.id === id
            ? { ...t, name: name.trim(), description: description.trim(), updatedAt: Date.now() }
            : t
        ),
      };
    }
    case "DELETE": {
      return { tasks: state.tasks.filter((t) => t.id !== action.payload.id) };
    }
    case "TOGGLE": {
      return {
        tasks: state.tasks.map((t) =>
          t.id === action.payload.id ? { ...t, completed: !t.completed, updatedAt: Date.now() } : t
        ),
      };
    }
    default:
      return state;
  }
}

// ------------------------------ Helpers ---------------------------------
function saveToStorage(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {}
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// --------------------------- Reusable UI Bits ----------------------------
function Section({ title, children, right }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      {right}
      {children && <div className="hidden" aria-hidden>{children}</div>}
    </div>
  );
}

function Badge({ children }) {
  return (
    <span className="px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-700">{children}</span>
  );
}

// -------------------------------- App -----------------------------------
export default function TodoApp() {
  const [state, dispatch] = useReducer(tasksReducer, initialState);

  // UI state
  const [filter, setFilter] = useState("all"); // all | active | completed
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null); // task or null

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = loadFromStorage();
    if (Array.isArray(saved)) {
      dispatch({ type: "HYDRATE", payload: saved });
    }
  }, []);

  // Persist to localStorage whenever tasks change
  useEffect(() => {
    saveToStorage(state.tasks);
  }, [state.tasks]);

  const filtered = useMemo(() => {
    let list = state.tasks;
    if (filter === "active") list = list.filter((t) => !t.completed);
    if (filter === "completed") list = list.filter((t) => t.completed);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [state.tasks, filter, query]);

  const completedCount = state.tasks.filter((t) => t.completed).length;

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-gray-100 py-10 px-4">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">To‑Do List</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Add, edit, complete, delete tasks — with validation & persistence.
          </p>
        </header>

        {/* Add / Edit Form */}
        <div className="bg-white dark:bg-neutral-800 shadow-sm rounded-2xl p-5 mb-6">
          <Section title={editing ? "Edit Task" : "Add a New Task"} />
          <TaskForm
            key={editing ? editing.id : "new"}
            initialValues={
              editing ? { name: editing.name, description: editing.description } : undefined
            }
            onCancel={() => setEditing(null)}
            onSubmit={(values) => {
              if (editing) {
                dispatch({ type: "UPDATE", payload: { id: editing.id, ...values } });
                setEditing(null);
              } else {
                dispatch({ type: "ADD", payload: values });
              }
            }}
          />
        </div>

        {/* Toolbar: Filters + Search + Counters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="inline-flex items-center gap-2 bg-white dark:bg-neutral-800 shadow-sm rounded-xl p-1">
            {[
              { key: "all", label: "All" },
              { key: "active", label: "Active" },
              { key: "completed", label: "Completed" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-sm transition border ${
                  filter === key
                    ? "bg-black text-white border-black dark:bg-white dark:text-black dark:border-white"
                    : "bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-neutral-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks…"
              className="w-full sm:w-64 px-3 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 outline-none focus:ring-2 focus:ring-black/20"
            />
            <Badge>
              {completedCount} / {state.tasks.length} done
            </Badge>
          </div>
        </div>

        {/* List */}
        <div className="bg-white dark:bg-neutral-800 shadow-sm rounded-2xl divide-y divide-gray-100 dark:divide-neutral-700">
          <TaskList
            tasks={filtered}
            onToggle={(id) => dispatch({ type: "TOGGLE", payload: { id } })}
            onEdit={(task) => setEditing(task)}
            onDelete={(id) => dispatch({ type: "DELETE", payload: { id } })}
          />
        </div>

        {/* Footer / small tips */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
          Tip: Data is saved in your browser (localStorage). Clear site data to reset.
        </p>
      </div>
    </div>
  );
}

// ------------------------------ TaskForm --------------------------------
function TaskForm({ initialValues, onSubmit, onCancel }) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [touched, setTouched] = useState({ name: false, description: false });

  // For UX: autofocus the name field when the form mounts
  const nameRef = useRef(null);
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const nameError = !name.trim() && touched.name ? "Task name is required" : "";
  const descError = !description.trim() && touched.description ? "Description is required" : "";
  const hasErrors = !name.trim() || !description.trim();

  function handleSubmit(e) {
    e.preventDefault();
    setTouched({ name: true, description: true });
    if (hasErrors) return;
    onSubmit({ name, description });
    setName("");
    setDescription("");
    setTouched({ name: false, description: false });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div className="grid gap-1">
        <label className="text-sm">Task Name</label>
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          placeholder="e.g., Prepare Black Friday brief"
          className={`px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border outline-none focus:ring-2 focus:ring-black/20 ${
            nameError ? "border-red-500" : "border-gray-200 dark:border-neutral-700"
          }`}
        />
        {nameError && <p className="text-xs text-red-500">{nameError}</p>}
      </div>

      <div className="grid gap-1">
        <label className="text-sm">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, description: true }))}
          placeholder="Details, links, deliverables…"
          rows={3}
          className={`px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border outline-none focus:ring-2 focus:ring-black/20 ${
            descError ? "border-red-500" : "border-gray-200 dark:border-neutral-700"
          }`}
        />
        {descError && <p className="text-xs text-red-500">{descError}</p>}
      </div>

      <div className="flex items-center gap-2 mt-2">
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black hover:opacity-90"
        >
          {initialValues ? "Update Task" : "Add Task"}
        </button>
        {initialValues && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-gray-300 dark:border-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-700"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

// ------------------------------ TaskList --------------------------------
function TaskList({ tasks, onToggle, onEdit, onDelete }) {
  if (!tasks.length) {
    return (
      <div className="p-6 text-center text-sm text-gray-600 dark:text-gray-400">
        No tasks yet. Add your first task above.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100 dark:divide-neutral-700">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </ul>
  );
}

// ------------------------------ TaskItem --------------------------------
function TaskItem({ task, onToggle, onEdit, onDelete }) {
  const { id, name, description, completed } = task;

  function handleDelete() {
    const ok = window.confirm("Delete this task? This cannot be undone.");
    if (ok) onDelete(id);
  }

  return (
    <li className="p-4 flex items-start gap-3">
      <input
        type="checkbox"
        checked={completed}
        onChange={() => onToggle(id)}
        className="mt-1 h-4 w-4 rounded border-gray-300"
      />

      <div className="flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className={`font-medium ${completed ? "line-through opacity-60" : ""}`}>{name}</h3>
            <p className={`text-sm text-gray-600 dark:text-gray-400 ${completed ? "line-through opacity-60" : ""}`}>
              {description}
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-1">
            <button
              onClick={() => onEdit(task)}
              className="px-2 py-1 text-xs rounded-lg border border-gray-300 dark:border-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-700"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="px-2 py-1 text-xs rounded-lg border border-gray-300 dark:border-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
