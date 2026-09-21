'use client';

import React from 'react';
import {
  X, Plus, FileText, ShoppingCart, Users, CheckSquare,
  Stamp, Calculator, ArrowUpRight, Sparkles, Receipt
} from 'lucide-react';
import { AlegraTabId } from './AlegraSidebar';

interface QuickActionItem {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  color: string;
  action: () => void;
}

interface AlegraQuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: AlegraTabId) => void;
  onOpenCSDModal: () => void;
}

export default function AlegraQuickCreateModal({
  isOpen,
  onClose,
  onSelectTab,
  onOpenCSDModal
}: AlegraQuickCreateModalProps) {
  if (!isOpen) return null;

  const actions: QuickActionItem[] = [
    {
      id: 'task',
      title: 'Nueva Tarea Contable',
      subtitle: 'Asignar actividad o cierre mensual',
      icon: CheckSquare,
      color: 'bg-emerald-50 text-emerald-600',
      action: () => {
        onSelectTab('tareas');
        onClose();
      }
    },
    {
      id: 'rfc',
      title: 'Añadir Cliente / RFC',
      subtitle: 'Registrar nuevo contribuyente con IA',
      icon: Users,
      color: 'bg-teal-50 text-[#00A88B]',
      action: () => {
        onSelectTab('espacio_trabajo');
        onClose();
      }
    },
    {
      id: 'foliar',
      title: 'Foliar Documentos PDF',
      subtitle: 'Estampar folios consecutivos con membrete',
      icon: Stamp,
      color: 'bg-indigo-50 text-indigo-600',
      action: () => {
        onSelectTab('foliador');
        onClose();
      }
    },
    {
      id: 'csd',
      title: 'Cargar Certificado SAT (CSD)',
      subtitle: 'Conectar sellos digitales .cer y .key',
      icon: Receipt,
      color: 'bg-amber-50 text-amber-600',
      action: () => {
        onClose();
        onOpenCSDModal();
      }
    },
    {
      id: 'buzon',
      title: 'Revisar Buzón SAT',
      subtitle: 'Descargar notificaciones y opiniones 32-D',
      icon: FileText,
      color: 'bg-blue-50 text-blue-600',
      action: () => {
        onSelectTab('buzon_sat');
        onClose();
      }
    },
    {
      id: 'reporte',
      title: 'Generar Reporte o Balanza',
      subtitle: 'Exportar estados financieros a Excel/PDF',
      icon: Calculator,
      color: 'bg-purple-50 text-purple-600',
      action: () => {
        onSelectTab('reportes');
        onClose();
      }
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-900">
            Creación Rápida
          </h3>
          <p className="text-xs text-slate-500">
            Selecciona la acción o documento que deseas registrar en el despacho
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map(act => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                onClick={act.action}
                className="flex items-start gap-3 rounded-xl border border-slate-200/90 p-3.5 text-left transition hover:border-[#00C9A7] hover:bg-[#F8FAFC] hover:shadow-xs group"
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${act.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-[#00A88B] transition">
                    {act.title}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {act.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
