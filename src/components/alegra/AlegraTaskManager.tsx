'use client';

import React, { useState } from 'react';
import {
  Kanban, List, Plus, CheckCircle2, Clock, AlertCircle,
  MoreVertical, Calendar, User, Search, Filter, ArrowRight,
  Archive, Check, Trash2, Tag, ChevronDown
} from 'lucide-react';

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  column: 'Pendiente' | 'En proceso' | 'Hecho' | 'Archivados';
  priority: 'baja' | 'media' | 'alta' | 'urgente';
  assignedTo?: string;
  dueDate?: string;
  project?: string;
}

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

  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    if (initialTasks && initialTasks.length > 0) return initialTasks;
    return [
      {
        id: 't-1',
        title: 'Presentar Declaración Mensual de IVA e ISR',
        description: 'Verificar conciliación bancaria y pólizas de egresos antes de enviar al SAT.',
        column: 'Pendiente',
        priority: 'alta',
        assignedTo: 'Uriel Gómez',
        dueDate: '25 Sep 2026',
        project: 'Comercializadora Nacional'
      },
      {
        id: 't-2',
        title: 'Descargar comprobantes CFDI 4.0 del mes',
        description: 'Ejecutar sincronizador de buzón SAT para facturas de clientes con retenciones.',
        column: 'En proceso',
        priority: 'media',
        assignedTo: 'Ana Martínez',
        dueDate: '22 Sep 2026',
        project: 'Paula López Delgado'
      },
      {
        id: 't-3',
        title: 'Renovar Certificado de Sello Digital (CSD)',
        description: 'El sello vence el 30 de septiembre. Solicitar e.firma vigente al contribuyente.',
        column: 'En proceso',
        priority: 'urgente',
        assignedTo: 'Carlos Ruiz',
        dueDate: '21 Sep 2026',
        project: 'Industrias y Aceros'
      },
      {
        id: 't-4',
        title: 'Foliar libros contables y actas de asamblea',
        description: 'Estampar folios consecutivos del 001 al 250 en actas digitalizadas.',
        column: 'Hecho',
        priority: 'baja',
        assignedTo: 'Uriel Gómez',
        dueDate: '19 Sep 2026',
        project: 'Despacho Central'
      },
      {
        id: 't-5',
        title: 'Cierre anual de ejercicio fiscal 2025',
        description: 'Auditoría interna completada y papeles de trabajo archivados.',
        column: 'Archivados',
        priority: 'baja',
        assignedTo: 'Ana Martínez',
        dueDate: '15 Ago 2026',
        project: 'Empresa Demo SA'
      }
    ];
  });

  const [inlineColumn, setInlineColumn] = useState<string | null>(null);
  const [inlineTitle, setInlineTitle] = useState('');
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

  // Nuevo formulario modal
  const [modalTitle, setModalTitle] = useState('');
  const [modalDesc, setModalDesc] = useState('');
  const [modalColumn, setModalColumn] = useState<TaskItem['column']>('Pendiente');
  const [modalPriority, setModalPriority] = useState<TaskItem['priority']>('media');
  const [modalAssigned, setModalAssigned] = useState('Uriel Gómez');
  const [modalDate, setModalDate] = useState('2026-09-25');

  const columns: { name: TaskItem['column']; color: string; bg: string }[] = [
    { name: 'Pendiente', color: 'text-amber-700 border-amber-300', bg: 'bg-amber-50' },
    { name: 'En proceso', color: 'text-blue-700 border-blue-300', bg: 'bg-blue-50' },
    { name: 'Hecho', color: 'text-emerald-700 border-emerald-300', bg: 'bg-emerald-50' },
    { name: 'Archivados', color: 'text-slate-600 border-slate-300', bg: 'bg-slate-100' }
  ];

  const filteredTasks = tasks.filter(t => {
    if (priorityFilter !== 'todas' && t.priority !== priorityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.project && t.project.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleInlineAdd = (colName: TaskItem['column']) => {
    if (!inlineTitle.trim()) return;
    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      title: inlineTitle.trim(),
      column: colName,
      priority: 'media',
      assignedTo: 'Uriel Gómez',
      dueDate: 'Esta semana'
    };
    setTasks(prev => [...prev, newTask]);
    if (onAddTask) onAddTask(newTask);
    setInlineTitle('');
    setInlineColumn(null);
  };

  const handleCreateModalTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle.trim()) return;

    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      title: modalTitle.trim(),
      description: modalDesc.trim(),
      column: modalColumn,
      priority: modalPriority,
      assignedTo: modalAssigned,
      dueDate: modalDate
    };

    setTasks(prev => [...prev, newTask]);
    if (onAddTask) onAddTask(newTask);
    setIsNewTaskModalOpen(false);
    setModalTitle('');
    setModalDesc('');
  };

  const handleMoveColumn = (taskId: string, targetCol: TaskItem['column']) => {
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, column: targetCol } : t))
    );
  };

  const handleDelete = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    if (onDeleteTask) onDeleteTask(taskId);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Cabecera del módulo con toggle Kanban / Lista */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Gestión de Tareas
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Control de actividades contables, cierres y obligaciones de clientes
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle Vista */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === 'kanban'
                  ? 'bg-[#E6FAF6] text-[#00A88B]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Tablero</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === 'list'
                  ? 'bg-[#E6FAF6] text-[#00A88B]'
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
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#00C9A7] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-[#00B596] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva tarea</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar tarea o cliente..."
            className="w-full rounded-lg border border-slate-200 bg-[#F8FAFC] py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-[#00C9A7] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00C9A7]"
          />
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Prioridad:</span>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white py-1 px-2.5 text-xs text-slate-700 focus:border-[#00C9A7] focus:outline-none"
            >
              <option value="todas">Todas</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>

          <div className="text-slate-400">
            {filteredTasks.length} de {tasks.length} tareas
          </div>
        </div>
      </div>

      {/* VISTA 1: TABLERO KANBAN (4 Columnas) */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {columns.map(col => {
            const colTasks = filteredTasks.filter(t => t.column === col.name);
            return (
              <div
                key={col.name}
                className="flex flex-col rounded-2xl border border-slate-200/90 bg-[#F8FAFC] p-3 min-h-[460px]"
              >
                {/* Cabecera de Columna */}
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

                {/* Formulario rápido inline */}
                {inlineColumn === col.name && (
                  <div className="mb-3 rounded-xl border border-teal-200 bg-white p-3 shadow-sm animate-in fade-in">
                    <input
                      type="text"
                      autoFocus
                      value={inlineTitle}
                      onChange={e => setInlineTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleInlineAdd(col.name);
                        if (e.key === 'Escape') setInlineColumn(null);
                      }}
                      placeholder="Nombre de la tarea..."
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
                        className="rounded bg-[#00C9A7] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#00B596]"
                      >
                        Añadir
                      </button>
                    </div>
                  </div>
                )}

                {/* Lista de tarjetas en columna */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.map(task => {
                    const priorityStyles = {
                      urgente: 'bg-rose-50 text-rose-700 border-rose-200',
                      alta: 'bg-amber-50 text-amber-700 border-amber-200',
                      media: 'bg-blue-50 text-blue-700 border-blue-200',
                      baja: 'bg-slate-50 text-slate-600 border-slate-200'
                    }[task.priority];

                    return (
                      <div
                        key={task.id}
                        className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs transition hover:shadow-md hover:border-slate-300"
                      >
                        {/* Etiquetas */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-semibold border ${priorityStyles}`}
                          >
                            {task.priority.toUpperCase()}
                          </span>

                          <div className="flex items-center gap-1">
                            {/* Mover rápido a otra columna */}
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
                              className="text-slate-300 hover:text-rose-500 p-0.5"
                              title="Eliminar"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        {/* Título y descripción */}
                        <h4 className="text-xs font-semibold text-slate-900 leading-snug">
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        {/* Footer de tarjeta */}
                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{task.dueDate || 'Sin fecha'}</span>
                          </div>

                          <div className="flex items-center gap-1 text-slate-600 font-medium">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#EDE9FE] text-[10px] font-bold text-[#7C3AED]">
                              {task.assignedTo ? task.assignedTo.charAt(0) : 'U'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA 2: LISTA DETALLADA */
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">Tarea</th>
                  <th className="px-4 py-3.5">Estado / Columna</th>
                  <th className="px-4 py-3.5">Prioridad</th>
                  <th className="px-4 py-3.5">Asignado</th>
                  <th className="px-4 py-3.5">Fecha límite</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.map(task => (
                  <tr key={task.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 text-xs sm:text-sm">{task.title}</div>
                      {task.description && (
                        <div className="text-[11px] text-slate-400 max-w-md truncate">{task.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                        {task.column}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-semibold capitalize text-[11px]">
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-700 font-medium">
                      {task.assignedTo || 'Sin asignar'}
                    </td>
                    <td className="px-4 py-4 text-slate-500">
                      {task.dueDate || 'Sin fecha'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nueva Tarea */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Nueva Tarea Contable</h3>
            <p className="text-xs text-slate-500 mb-4">Crea una actividad para el despacho o tus clientes</p>

            <form onSubmit={handleCreateModalTask} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Título de la tarea *
                </label>
                <input
                  type="text"
                  required
                  value={modalTitle}
                  onChange={e => setModalTitle(e.target.value)}
                  placeholder="Ej: Conciliar cuentas bancarias Santander"
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-[#00C9A7] focus:outline-none focus:ring-1 focus:ring-[#00C9A7]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Descripción (opcional)
                </label>
                <textarea
                  rows={3}
                  value={modalDesc}
                  onChange={e => setModalDesc(e.target.value)}
                  placeholder="Detalles sobre los documentos o procedimientos requeridos..."
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-[#00C9A7] focus:outline-none focus:ring-1 focus:ring-[#00C9A7]"
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
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-[#00C9A7] focus:outline-none"
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
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-[#00C9A7] focus:outline-none"
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
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-[#00C9A7] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#00C9A7] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#00B596]"
                >
                  Crear tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
