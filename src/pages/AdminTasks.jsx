import { useMemo, useState } from "react";
import { CheckCircle2, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useAdminData } from "../admin/AdminDataProvider.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";
import { ROLES } from "../auth/permissions.js";

const priorityLabels = {
  low: "Baja",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

const emptyTaskDraft = {
  id: "",
  title: "",
  description: "",
  assignedTo: "general",
  assignedToName: "General",
  dueDate: new Date().toISOString().slice(0, 10),
  priority: "normal",
  status: "pending",
};

function formatDate(dateValue) {
  if (!dateValue) return "Sin fecha";
  return new Intl.DateTimeFormat("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${dateValue}T12:00:00`));
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getTaskTiming(task) {
  if (!task.dueDate || task.status === "done") return "normal";
  const today = todayISO();
  if (task.dueDate < today) return "overdue";
  if (task.dueDate === today) return "today";
  return "normal";
}

function taskSortScore(task) {
  const timing = getTaskTiming(task);
  if (timing === "overdue") return 0;
  if (timing === "today") return 1;
  if (task.priority === "urgent") return 2;
  if (task.priority === "high") return 3;
  return 4;
}

function sortPendingTasks(a, b) {
  return taskSortScore(a) - taskSortScore(b) || String(a.dueDate || "9999-12-31").localeCompare(String(b.dueDate || "9999-12-31"));
}

function canManagerSeeTask(task, profile, user) {
  const uid = profile?.uid || user?.uid || "";
  const email = profile?.email || user?.email || "";
  return !task.assignedTo || task.assignedTo === "general" || task.assignedTo === uid || task.assignedTo === email;
}

export default function AdminTasks({ mode = "admin" }) {
  const { profile, user } = useAuth();
  const { tasks, users, saveTask, completeTask, reopenTask, deleteTask } = useAdminData();
  const isManager = mode === "manager";
  const [draft, setDraft] = useState(emptyTaskDraft);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const assignees = useMemo(
    () => [
      { uid: "general", name: "General", email: "" },
      ...users
        .filter((item) => item.role === ROLES.manager && item.active !== false)
        .map((item) => ({ uid: item.uid || item.id, name: item.name || item.email, email: item.email })),
    ],
    [users],
  );

  const visibleTasks = useMemo(
    () => (isManager ? tasks.filter((task) => canManagerSeeTask(task, profile, user)) : tasks),
    [isManager, profile, tasks, user],
  );
  const pendingTasks = useMemo(
    () => visibleTasks.filter((task) => task.status !== "done").sort(sortPendingTasks),
    [visibleTasks],
  );
  const doneTasks = useMemo(
    () =>
      visibleTasks
        .filter((task) => task.status === "done")
        .sort((a, b) => String(b.completedAt || b.updatedAt).localeCompare(String(a.completedAt || a.updatedAt))),
    [visibleTasks],
  );

  const resetForm = () => {
    setDraft(emptyTaskDraft);
    setIsFormOpen(false);
  };

  const handleAssigneeChange = (value) => {
    const assignee = assignees.find((item) => item.uid === value) || assignees[0];
    setDraft((current) => ({
      ...current,
      assignedTo: assignee.uid,
      assignedToName: assignee.name || "General",
    }));
  };

  const submitTask = async (event) => {
    event.preventDefault();
    if (isManager || isSaving) return;
    if (!draft.title.trim()) {
      setMessage("Completá el título de la tarea.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    try {
      await saveTask(draft);
      setMessage(draft.id ? "Tarea editada." : "Tarea creada.");
      resetForm();
    } catch (error) {
      setMessage(error.message || "No se pudo guardar la tarea.");
    } finally {
      setIsSaving(false);
    }
  };

  const editTask = (task) => {
    if (isManager) return;
    setDraft({
      id: task.id,
      title: task.title,
      description: task.description || "",
      assignedTo: task.assignedTo || "general",
      assignedToName: task.assignedToName || "General",
      dueDate: task.dueDate || todayISO(),
      priority: task.priority || "normal",
      status: task.status || "pending",
    });
    setIsFormOpen(true);
  };

  const markDone = async (task) => {
    await completeTask(task.id);
    setMessage("Tarea completada.");
  };

  const reopen = async (task) => {
    if (isManager) return;
    await reopenTask(task.id);
    setMessage("Tarea reabierta.");
  };

  const removeTask = async (task) => {
    if (isManager) return;
    const confirmed = window.confirm("¿Seguro que querés eliminar esta tarea?");
    if (!confirmed) return;
    await deleteTask(task.id);
    setMessage("Tarea eliminada.");
  };

  const renderTaskCard = (task) => {
    const timing = getTaskTiming(task);
    const isDone = task.status === "done";
    return (
      <article className={`admin-task-card admin-task-card--${timing} ${isDone ? "admin-task-card--done" : ""}`} key={task.id}>
        <header>
          <div>
            <h3>{task.title}</h3>
            <span>{task.assignedToName || "General"}</span>
          </div>
          <div className="admin-task-card__badges">
            {timing === "overdue" ? <em>Vencida</em> : null}
            {timing === "today" ? <em>Hoy</em> : null}
            {task.priority === "urgent" ? <em>Urgente</em> : null}
            <strong>{isDone ? "Hecha" : "Pendiente"}</strong>
          </div>
        </header>
        {task.description ? <p>{task.description}</p> : null}
        <dl>
          <div><dt>Fecha límite</dt><dd>{formatDate(task.dueDate)}</dd></div>
          <div><dt>Prioridad</dt><dd>{priorityLabels[task.priority] || task.priority}</dd></div>
          {isDone ? <div><dt>Completada</dt><dd>{task.completedAt ? new Date(task.completedAt).toLocaleString("es-PY") : "Sin fecha"}</dd></div> : null}
        </dl>
        <footer>
          {!isDone ? (
            <button type="button" className="admin-primary-button" onClick={() => markDone(task)}>
              <CheckCircle2 size={17} aria-hidden="true" /> Marcar hecha
            </button>
          ) : null}
          {!isManager ? (
            <>
              {!isDone ? <button type="button" onClick={() => editTask(task)}><Pencil size={16} aria-hidden="true" /> Editar</button> : null}
              {isDone ? <button type="button" onClick={() => reopen(task)}><RotateCcw size={16} aria-hidden="true" /> Reabrir</button> : null}
              <button type="button" className="admin-danger-button" onClick={() => removeTask(task)}><Trash2 size={16} aria-hidden="true" /> Eliminar</button>
            </>
          ) : null}
        </footer>
      </article>
    );
  };

  return (
    <section className="admin-section admin-tasks-section">
      <div className="admin-section-heading">
        <div>
          <h2>Tareas</h2>
        </div>
        {!isManager ? (
          <button type="button" onClick={() => setIsFormOpen((current) => !current)}>
            <Plus size={17} aria-hidden="true" /> Nueva tarea
          </button>
        ) : null}
      </div>

      {message ? <p className="admin-form-message">{message}</p> : null}

      {!isManager && isFormOpen ? (
        <form className="admin-task-form admin-editor-card" onSubmit={submitTask}>
          <label>Título de la tarea<input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} required /></label>
          <label>Encargado asignado<select value={draft.assignedTo} onChange={(event) => handleAssigneeChange(event.target.value)}>{assignees.map((item) => <option key={item.uid} value={item.uid}>{item.name}</option>)}</select></label>
          <label>Fecha límite<input type="date" value={draft.dueDate} onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))} /></label>
          <label>Prioridad<select value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value }))}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="admin-task-form__description">Descripción opcional<textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} /></label>
          <div className="admin-task-form__actions">
            <button type="button" className="admin-secondary-button" onClick={resetForm}>Cancelar</button>
            <button type="submit" className="admin-primary-button" disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar tarea"}</button>
          </div>
        </form>
      ) : null}

      <section className="admin-task-group">
        <header>
          <h3>Tareas pendientes</h3>
          <span>{pendingTasks.length} pendientes</span>
        </header>
        <div className="admin-task-list">
          {pendingTasks.length ? pendingTasks.map(renderTaskCard) : <p className="admin-empty-note">No hay tareas pendientes.</p>}
        </div>
      </section>

      <details className="admin-task-group admin-collapsible-card">
        <summary>
          <span>
            <strong>Tareas completadas</strong>
            <small>{doneTasks.length} tareas hechas.</small>
          </span>
        </summary>
        <div className="admin-collapsible-card__content admin-task-list">
          {doneTasks.length ? doneTasks.map(renderTaskCard) : <p className="admin-empty-note">No hay tareas completadas.</p>}
        </div>
      </details>
    </section>
  );
}
