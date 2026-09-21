'use client';

import React from 'react';
import {
  UserPlus, UploadCloud, KeyRound, Zap, Users,
  CheckCircle2, ChevronRight, ShieldCheck, FileSpreadsheet
} from 'lucide-react';
import { AlegraTabId } from './AlegraSidebar';

interface AlegraOnboardingProps {
  onSelectTab: (tab: AlegraTabId) => void;
  onOpenAddClientModal?: () => void;
  onOpenCSDModal?: () => void;
}

export default function AlegraOnboarding({
  onSelectTab,
  onOpenAddClientModal,
  onOpenCSDModal
}: AlegraOnboardingProps) {
  const cards = [
    {
      id: 'add_client',
      title: 'Añade un cliente',
      description: 'Ingresa su RFC y crea tus clientes uno a la vez.',
      buttonText: 'Añadir cliente',
      icon: UserPlus,
      action: () => {
        if (onOpenAddClientModal) onOpenAddClientModal();
        else onSelectTab('espacio_trabajo');
      }
    },
    {
      id: 'import_clients',
      title: 'Importar varios clientes',
      description: 'Sube un archivo y agrega múltiples RFC en minutos.',
      buttonText: 'Importar clientes',
      icon: FileSpreadsheet,
      action: () => onSelectTab('espacio_trabajo')
    },
    {
      id: 'load_efirma',
      title: 'Carga las e.firmas y conecta con el SAT',
      description: 'Conecta con el SAT para monitorear el estatus de cumplimiento de tu cliente.',
      buttonText: 'Cargar e.firma',
      icon: KeyRound,
      action: () => {
        if (onOpenCSDModal) onOpenCSDModal();
        else onSelectTab('configuracion');
      }
    },
    {
      id: 'quick_actions',
      title: 'Explorar acciones rápidas',
      description: 'Dale acceso a tu cliente, comparte documentos y gestiona la contabilidad de tu cliente.',
      buttonText: 'Ver acciones',
      icon: Zap,
      action: () => onSelectTab('tareas')
    },
    {
      id: 'manage_team',
      title: 'Gestiona tu equipo del despacho',
      description: 'Añade colaboradores y asígnales los clientes que deben gestionar.',
      buttonText: 'Gestionar equipo',
      icon: Users,
      action: () => onSelectTab('mi_equipo')
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Cabecera de bienvenida con barra de progreso (Screenshot 3) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            ¡Te damos la bienvenida a tu Espacio Contador!
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Empieza con la configuración de tu despacho para gestionar la contabilidad de tus clientes
          </p>
        </div>

        {/* Barra de progreso 20% */}
        <div className="w-full md:w-56 rounded-xl bg-white p-3 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
            <span>Progreso</span>
            <span className="text-[#00C9A7]">20%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-[#00C9A7] rounded-full transition-all duration-500" style={{ width: '20%' }} />
          </div>
        </div>
      </div>

      {/* Subencabezado de lista */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-sm font-bold text-slate-800">
          Lista de configuración inicial
        </h2>
        <button
          type="button"
          onClick={() => onSelectTab('inicio')}
          className="text-xs font-medium text-[#00A88B] hover:underline"
        >
          Omitir configuración inicial
        </button>
      </div>

      {/* Grid de 5 tarjetas idéntico al screenshot 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-teal-200"
            >
              <div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E6FAF6] text-[#00C9A7]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-sm font-bold text-slate-900">
                  {card.title}
                </h3>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed min-h-[38px]">
                  {card.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-50">
                <button
                  type="button"
                  onClick={card.action}
                  className="w-full rounded-xl bg-[#D4F7EE] py-2.5 px-4 text-xs font-semibold text-[#008F76] transition hover:bg-[#00C9A7] hover:text-white active:scale-[0.98]"
                >
                  {card.buttonText}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
