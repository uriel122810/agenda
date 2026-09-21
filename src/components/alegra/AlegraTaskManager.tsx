'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Kanban, List, Plus, CheckCircle2, Clock, AlertCircle,
  MoreVertical, Calendar, User, Search, Filter, ArrowRight,
  Archive, Check, Trash2, Tag, ChevronDown, RefreshCw, Loader2
} from 'lucide-react';
import {
  TaskRecord,
  fetchTasksFromSupabase,
  createTaskInSupabase,
  updateTaskInSupabase,
  deleteTaskFromSupabase,
  getStoredTasks
} from '@/lib/tasksService';

export type TaskItem = TaskRecord;

interface AlegraTaskManagerProps {
  initialTasks?: TaskItem[];
  onAddTask?: (task: TaskItem) => void;
  onUpdateTask?: (task: TaskItem) => void;
  onDeleteTask?: (taskId: string) => void;
}

export default function AlegraTaskManager({
  initialTasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask
}: AlegraTaskManagerProps) {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('todas');

  // Estado de tareas sincronizadas con Supabase
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    if (initialTasks && initialTasks.length > 0) return initialTasks;
    const stored = getStoredTasks();
    if (stored.length > 0) return stored;
    return [];
  });

  // Estados de carga e indicadores de sincronización con Supabase
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);

  // Consulta SELECT a Supabase al cargar el componente
  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchTasksFromSupabase();
      setTasks(data);
    } catch (err) {
      console.error('Error al cargar tareas de Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const [inlineColumn, setInlineColumn] = useState<string | null>(null);
  const [inlineTitle, setInlineTitle] = useState('');
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

  // Formulario modal de nueva tarea
  const [modalTitle, setModalTitle] = useState('');
  const [modalDesc, setModalDesc] = useState('');
  const [modalColumn, setModalColumn] = useState<TaskItem['column']>('Pendiente');
  const [modalPriority, setModalPriority] = useState<TaskItem['priority']>('media');
  const [modalAssigned, setModalAssigned] = useState('Uriel Gómez');
  const [modalDate, setModalDate] = useState('2026-09-25');

  const columns: { name: TaskItem['column']; color: string; bg: string }[] = [
    { name: 'Pendiente', color: 'text-amber-700 border-amber-300', bg: 'bg-amber-50' },
    { name: 'En proceso', color: 'text-[#581c2f] border-[#eed7dc]', bg: 'bg-[#FBF0F3]' },
    { name: 'Hecho', color: 'text-emerald-700 border-emerald-300', bg: 'bg-emerald-50' },
    { name: 'Archivados', color: 'text-slate-600 border-slate-300', bg: 'bg-slate-100' }
  ];

  const filteredTasks = tasks.filter(t => {
    if (priorityFilter !== 'todas' && t.priority !== priorityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Mutación INSERT en Supabase al agregar tarea inline
  const handleInlineAdd = async (colName: TaskItem['column']) => {
    if (!inlineTitle.trim()) return;
    const title = inlineTitle.trim();
    setInlineTitle('');
    setInlineColumn(null);

    setIsSaving(true);
    setSaveStatusMessage('Guardando tarea en Supabase...');

    try {
      const created = await createTaskInSupabase({
        title,
        column: colName,
        priority: 'media',
        assignedTo: 'Uriel Gómez',
        dueDate: new Date().toISOString()
      });

      setTasks(prev => [created, ...prev]);
      if (onAddTask) onAddTask(created);
      setSaveStatusMessage('Tarea guardada en Supabase');
      setTimeout(() => setSaveStatusMessage(null), 3000);
    } catch (err: any) {
      console.error('Fallo al agregar tarea inline:', err);
      setSaveStatusMessage('Error al guardar en Supabase');
      setTimeout(() => setSaveStatusMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Mutación INSERT en Supabase al crear tarea desde el modal
  const handleCreateModalTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle.trim()) return;

    setIsSaving(true);
    setSaveStatusMessage('Guardando tarea en Supabase...');

    try {
      const created = await createTaskInSupabase({
        title: modalTitle.trim(),
        description: modalDesc.trim(),
        column: modalColumn,
        priority: modalPriority,
        assignedTo: modalAssigned,
        dueDate: modalDate
      });

      setTasks(prev => [created, ...prev]);
      if (onAddTask) onAddTask(created);
      setIsNewTaskModalOpen(false);
      setModalTitle('');
      setModalDesc('');
      setSaveStatusMessage('Tarea guardada en Supabase');
      setTimeout(() => setSaveStatusMessage(null), 3000);
    } catch (err: any) {
      console.error('Fallo al crear tarea en modal:', err);
      setSaveStatusMessage('Error al guardar en Supabase');
      setTimeout(() => setSaveStatusMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Mutación UPDATE en Supabase al mover columna o cambiar estado
  const handleMoveColumn = async (taskId: string, targetCol: TaskItem['column']) => {
    // Actualización optimista
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, column: targetCol } : t))
    );

    setIsSaving(true);
    setSaveStatusMessage('Actualizando estado en Supabase...');

    try {
      const updated = await updateTaskInSupabase(taskId, { column: targetCol });
      if (onUpdateTask) onUpdateTask(updated);
      setSaveStatusMessage('Estado sincronizado en Supabase');
      setTimeout(() => setSaveStatusMessage(null), 2500);
    } catch (err: any) {
      console.error('Fallo al actualizar columna en Supabase:', err);
      // Revertir en caso de fallo
      loadTasks();
      setSaveStatusMessage('Error al actualizar');
      setTimeout(() => setSaveStatusMessage(null), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  // Mutación DELETE en Supabase al eliminar tarea
  const handleDelete = async (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    // Eliminación optimista
    setTasks(prev => prev.filter(t => t.id !== taskId));

    setIsSaving(true);
    setSaveStatusMessage('Eliminando tarea de Supabase...');

    try {
      await deleteTaskFromSupabase(taskId, taskToDelete?.title);
      if (onDeleteTask) onDeleteTask(taskId);
      setSaveStatusMessage('Tarea eliminada de Supabase');
      setTimeout(() => setSaveStatusMessage(null), 2500);
    } catch (err: any) {
      console.error('Fallo al eliminar tarea de Supabase:', err);
      loadTasks();
      setSaveStatusMessage('Error al eliminar');
      setTimeout(() => setSaveStatusMessage(null), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Cabecera del módulo con toggle Kanban / Lista y estado de sincronización */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Gestión de Tareas y Operaciones
            </h1>
            <span className="rounded-full bg-[#FBF0F3] px-2.5 py-0.5 text-xs font-bold text-[#581c2f] border border-[#EED7DC]">
              Persistencia Supabase
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <p className="text-xs sm:text-sm text-slate-500">
              Control de actividades contables, cierres y foliado institucional PazSuma
            </p>
            {/* Indicador de estado de persistencia */}
            {isSaving ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#581c2f] bg-[#FBF0F3] px-2.5 py-0.5 rounded-full border border-[#EED7DC]">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>{saveStatusMessage || 'Guardando en base de datos...'}</span>
              </span>
            ) : saveStatusMessage ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 animate-in fade-in">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span>{saveStatusMessage}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Conectado a Supabase</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Botón Refrescar / Sincronizar */}
          <button
            onClick={loadTasks}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-xl border border-[#E8E2D9] bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-[#FBF0F3] transition disabled:opacity-50"
            title="Sincronizar tareas con Supabase"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-[#581c2f]' : 'text-slate-400'}`} />
            <span>Actualizar</span>
          </button>

          {/* Toggle Vista */}
          <div className="flex items-center rounded-xl border border-[#E8E2D9] bg-white p-1 shadow-2xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                viewMode === 'kanban'
                  ? 'bg-[#FBF0F3] text-[#581c2f]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Tablero</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                viewMode === 'list'
                  ? 'bg-[#FBF0F3] text-[#581c2f]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Lista</span>
            </button>
          </div>

          {/* Botón Nueva Tarea */}
          <button
            onClick={() => setIsNewTaskModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#581c2f] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-[#72223c] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva tarea</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar tarea..."
            className="w-full rounded-lg border border-slate-200 bg-[#FDFBF9] py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-[#581c2f] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
          />
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Prioridad:</span>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white py-1 px-2.5 text-xs text-slate-700 focus:border-[#581c2f] focus:outline-none"
            >
              <option value="todas">Todas</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>

          <div className="text-slate-400 font-medium">
            {filteredTasks.length} de {tasks.length} tareas
          </div>
        </div>
      </div>

      {/* Estado de carga inicial con spinner */}
      {isLoading && tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-[#E8E2D9] shadow-xs">
          <Loader2 className="h-8 w-8 animate-spin text-[#581c2f] mb-3" />
          <p className="text-xs font-bold text-slate-700">Cargando tareas desde Supabase...</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Sincronizando tablero y base de datos en tiempo real</p>
        </div>
      ) : viewMode === 'kanban' ? (
        /* VISTA 1: TABLERO KANBAN */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {columns.map(col => {
            const colTasks = filteredTasks.filter(t => t.column === col.name);
            return (
              <div
                key={col.name}
                className="flex flex-col rounded-2xl border border-[#E8E2D9] bg-[#FDFBF9] p-3 min-h-[460px]"
              >
                <div className="flex items-center justify-between px-2 py-1 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">{col.name}</span>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-slate-600 shadow-2xs">
                      {colTasks.length}
                    </span>
                  </div>

                  <button
                    onClick={() => setInlineColumn(col.name)}
                    className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-slate-200 text-slate-500 transition"
                    title={`Añadir tarea a ${col.name}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Formulario inline */}
                {inlineColumn === col.name && (
                  <div className="mb-3 rounded-xl border border-[#eed7dc] bg-white p-3 shadow-xs animate-in fade-in">
                    <input
                      type="text"
                      autoFocus
                      value={inlineTitle}
                      onChange={e => setInlineTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleInlineAdd(col.name);
                        if (e.key === 'Escape') setInlineColumn(null);
                      }}
                      placeholder="Nombre de la actividad..."
                      className="w-full text-xs text-slate-800 placeholder-slate-400 border-0 focus:ring-0 p-0 mb-2 focus:outline-none"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setInlineColumn(null)}
                        className="rounded px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleInlineAdd(col.name)}
                        className="rounded bg-[#581c2f] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#72223c]"
                      >
                        Añadir
                      </button>
                    </div>
                  </div>
                )}

                {/* Tarjetas */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="py-10 text-center text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white/50">
                      Sin tareas en esta columna
                    </div>
                  ) : (
                    colTasks.map(task => {
                      const priorityStyles = {
                        urgente: 'bg-rose-50 text-rose-700 border-rose-200',
                        alta: 'bg-[#FBF0F3] text-[#581c2f] border-[#eed7dc]',
                        media: 'bg-blue-50 text-blue-700 border-blue-200',
                        baja: 'bg-slate-50 text-slate-600 border-slate-200'
                      }[task.priority];

                      return (
                        <div
                          key={task.id}
                          className="rounded-xl border border-[#E8E2D9] bg-white p-3.5 shadow-2xs transition hover:shadow-md hover:border-[#eed7dc]"
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold border ${priorityStyles}`}
                            >
                              {task.priority.toUpperCase()}
                            </span>

                            <div className="flex items-center gap-1">
                              <select
                                value={task.column}
                                onChange={e => handleMoveColumn(task.id, e.target.value as any)}
                                className="text-[10px] bg-transparent text-slate-400 hover:text-slate-800 border-0 focus:ring-0 cursor-pointer p-0"
                              >
                                <option value="Pendiente">Pendiente</option>
                                <option value="En proceso">En proceso</option>
                                <option value="Hecho">Hecho</option>
                                <option value="Archivados">Archivados</option>
                              </select>
                              <button
                                onClick={() => handleDelete(task.id)}
                                className="text-slate-300 hover:text-rose-500 p-0.5 transition"
                                title="Eliminar de Supabase"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 leading-snug">
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{task.dueDate || 'Sin fecha'}</span>
                            </div>

                            <div className="flex items-center gap-1 text-slate-600 font-medium">
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#581c2f] text-[10px] font-bold text-white">
                                {task.assignedTo ? task.assignedTo.charAt(0) : 'U'}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA 2: LISTA */
        <div className="rounded-2xl border border-[#E8E2D9] bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Tarea</th>
                  <th className="px-4 py-3.5">Estado / Columna</th>
                  <th className="px-4 py-3.5">Prioridad</th>
                  <th className="px-4 py-3.5">Responsable</th>
                  <th className="px-4 py-3.5">Fecha límite</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No se encontraron tareas con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map(task => (
                    <tr key={task.id} className="hover:bg-[#FDFBF9] transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">{task.title}</div>
                        {task.description && (
                          <div className="text-[11px] text-slate-400 max-w-md truncate">{task.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={task.column}
                          onChange={e => handleMoveColumn(task.id, e.target.value as any)}
                          className="rounded-lg border border-slate-200 bg-white py-1 px-2 text-[11px] font-medium text-slate-700 focus:border-[#581c2f] focus:outline-none"
                        >
                          <option value="Pendiente">Pendiente</option>
                          <option value="En proceso">En proceso</option>
                          <option value="Hecho">Hecho</option>
                          <option value="Archivados">Archivados</option>
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-bold capitalize text-[11px] text-[#581c2f]">
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-700 font-medium">
                        {task.assignedTo || 'Uriel Gómez'}
                      </td>
                      <td className="px-4 py-4 text-slate-500">
                        {task.dueDate || 'Sin fecha'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          title="Eliminar de Supabase"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nueva Tarea */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 border border-[#E8E2D9]">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Nueva Tarea Institucional</h3>
            <p className="text-xs text-slate-500 mb-4">Crea una actividad operativa que se guardará de forma permanente en Supabase</p>

            <form onSubmit={handleCreateModalTask} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Título de la actividad *
                </label>
                <input
                  type="text"
                  required
                  value={modalTitle}
                  onChange={e => setModalTitle(e.target.value)}
                  placeholder="Ej: Presentar complementaria SAT"
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  value={modalDesc}
                  onChange={e => setModalDesc(e.target.value)}
                  placeholder="Detalles y notas relevantes..."
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Columna inicial
                  </label>
                  <select
                    value={modalColumn}
                    onChange={e => setModalColumn(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-[#581c2f] focus:outline-none"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="En proceso">En proceso</option>
                    <option value="Hecho">Hecho</option>
                    <option value="Archivados">Archivados</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Prioridad
                  </label>
                  <select
                    value={modalPriority}
                    onChange={e => setModalPriority(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-[#581c2f] focus:outline-none"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Fecha límite
                </label>
                <input
                  type="date"
                  value={modalDate}
                  onChange={e => setModalDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-[#581c2f] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#581c2f] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#72223c] disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{isSaving ? 'Guardando...' : 'Crear tarea en Supabase'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
