/**
 * PazSuma - Servicio de Gestión de Tareas con Supabase y Persistencia Real
 * Provee métodos CRUD completos (SELECT, INSERT, UPDATE, DELETE) para la tabla 'tasks',
 * con sincronización en tiempo real, registro de auditoría y respaldo local.
 */

import { logAuditOperation } from './auditService';

export interface TaskRecord {
  id: string;
  title: string;
  description?: string;
  status: 'pendiente' | 'en_proceso' | 'completada' | 'archivada';
  priority: 'alta' | 'media' | 'baja' | 'urgente';
  column: 'Pendiente' | 'En proceso' | 'Hecho' | 'Archivados';
  assignedTo?: string;
  dueDate?: string;
  due_date?: string;
  created_at?: string;
}

const LOCAL_STORAGE_KEY = 'pazsuma_tasks_cache_v1';

/**
 * Mapea el campo 'status' de la base de datos a la columna del tablero Kanban
 */
export function mapStatusToColumn(status?: string, columnName?: string): TaskRecord['column'] {
  if (columnName === 'Pendiente' || columnName === 'En proceso' || columnName === 'Hecho' || columnName === 'Archivados') {
    return columnName;
  }
  switch (status) {
    case 'en_proceso':
      return 'En proceso';
    case 'completada':
      return 'Hecho';
    case 'archivada':
      return 'Archivados';
    case 'pendiente':
    default:
      return 'Pendiente';
  }
}

/**
 * Mapea la columna visual del tablero Kanban al campo 'status' de Supabase
 */
export function mapColumnToStatus(col: TaskRecord['column']): TaskRecord['status'] {
  switch (col) {
    case 'En proceso':
      return 'en_proceso';
    case 'Hecho':
      return 'completada';
    case 'Archivados':
      return 'archivada';
    case 'Pendiente':
    default:
      return 'pendiente';
  }
}

/**
 * Formatea una fecha ISO a texto legible (ej: "25 Sep 2026")
 */
export function formatDueDate(dateStr?: string | null): string {
  if (!dateStr) return 'Sin fecha';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Obtiene el caché local de tareas para renderizado instantáneo
 */
export function getStoredTasks(): TaskRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Actualiza el caché local de tareas
 */
export function setStoredTasks(tasks: TaskRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Ignorar si localStorage está lleno
  }
}

/**
 * Recupera todas las tareas guardadas en Supabase (SELECT)
 */
export async function fetchTasksFromSupabase(): Promise<TaskRecord[]> {
  try {
    const res = await fetch('/api/tasks', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Error en GET /api/tasks: ${res.statusText}`);
    }
    const json = await res.json();
    const rows = json.tasks || [];

    const mapped: TaskRecord[] = rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description || '',
      status: r.status || 'pendiente',
      priority: r.priority || 'media',
      column: mapStatusToColumn(r.status, r.column_name),
      assignedTo: r.assigned_to_name || 'Uriel Gómez',
      dueDate: formatDueDate(r.due_date),
      due_date: r.due_date,
      created_at: r.created_at
    }));

    setStoredTasks(mapped);
    return mapped;
  } catch (err) {
    console.warn('Fallback a caché local de tareas:', err);
    return getStoredTasks();
  }
}

/**
 * Agrega una nueva tarea en Supabase (INSERT)
 */
export async function createTaskInSupabase(data: {
  title: string;
  description?: string;
  column?: TaskRecord['column'];
  priority?: TaskRecord['priority'];
  dueDate?: string;
  assignedTo?: string;
}): Promise<TaskRecord> {
  const status = mapColumnToStatus(data.column || 'Pendiente');
  const payload = {
    title: data.title,
    description: data.description,
    status,
    priority: data.priority || 'media',
    column_name: data.column || 'Pendiente',
    due_date: data.dueDate ? new Date(data.dueDate).toISOString() : null
  };

  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error || 'Error al guardar la tarea en Supabase');
  }

  const json = await res.json();
  const createdRow = json.task;

  const newTask: TaskRecord = {
    id: createdRow.id,
    title: createdRow.title,
    description: createdRow.description || '',
    status: createdRow.status || status,
    priority: createdRow.priority || (data.priority || 'media'),
    column: mapStatusToColumn(createdRow.status, createdRow.column_name || data.column),
    assignedTo: data.assignedTo || 'Uriel Gómez',
    dueDate: formatDueDate(createdRow.due_date || data.dueDate),
    due_date: createdRow.due_date,
    created_at: createdRow.created_at
  };

  // Actualizar caché
  const current = getStoredTasks();
  setStoredTasks([newTask, ...current]);

  // Registrar auditoría automática
  await logAuditOperation({
    usuario: data.assignedTo || 'Uriel Gómez',
    modulo: 'Tareas',
    accion: `Se creó la tarea "${newTask.title}" en columna "${newTask.column}"`,
    detalles: `Prioridad: ${newTask.priority} • Vence: ${newTask.dueDate}`,
    status: 'completado'
  }).catch(() => {});

  return newTask;
}

/**
 * Actualiza una tarea existente en Supabase (UPDATE)
 */
export async function updateTaskInSupabase(
  taskId: string,
  updates: Partial<TaskRecord>
): Promise<TaskRecord> {
  const payload: Record<string, any> = { id: taskId };

  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.priority !== undefined) payload.priority = updates.priority;
  if (updates.column !== undefined) {
    payload.column_name = updates.column;
    payload.status = mapColumnToStatus(updates.column);
  }
  if (updates.dueDate !== undefined) {
    payload.due_date = updates.dueDate ? new Date(updates.dueDate).toISOString() : null;
  }

  const res = await fetch('/api/tasks', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error || 'Error al actualizar la tarea en Supabase');
  }

  const json = await res.json();
  const updatedRow = json.task;

  const updatedTask: TaskRecord = {
    id: updatedRow.id,
    title: updatedRow.title,
    description: updatedRow.description || '',
    status: updatedRow.status,
    priority: updatedRow.priority,
    column: mapStatusToColumn(updatedRow.status, updatedRow.column_name || updates.column),
    assignedTo: updates.assignedTo || 'Uriel Gómez',
    dueDate: formatDueDate(updatedRow.due_date),
    due_date: updatedRow.due_date,
    created_at: updatedRow.created_at
  };

  // Actualizar caché
  const current = getStoredTasks();
  const nextList = current.map(t => (t.id === taskId ? { ...t, ...updatedTask } : t));
  setStoredTasks(nextList);

  // Registrar auditoría si hubo cambio de columna o estado
  if (updates.column) {
    await logAuditOperation({
      usuario: 'Uriel Gómez',
      modulo: 'Tareas',
      accion: `Se movió la tarea "${updatedTask.title}" a columna "${updatedTask.column}"`,
      detalles: `Prioridad: ${updatedTask.priority}`,
      status: 'completado'
    }).catch(() => {});
  }

  return updatedTask;
}

/**
 * Elimina una tarea de Supabase (DELETE)
 */
export async function deleteTaskFromSupabase(taskId: string, taskTitle?: string): Promise<void> {
  const res = await fetch(`/api/tasks?id=${taskId}`, {
    method: 'DELETE'
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error || 'Error al eliminar la tarea de Supabase');
  }

  // Actualizar caché
  const current = getStoredTasks();
  setStoredTasks(current.filter(t => t.id !== taskId));

  // Registrar auditoría
  await logAuditOperation({
    usuario: 'Uriel Gómez',
    modulo: 'Tareas',
    accion: `Se eliminó la tarea ${taskTitle ? `"${taskTitle}"` : taskId}`,
    status: 'completado'
  }).catch(() => {});
}
