'use client';

import React from 'react';
import {
  UserPlus, UploadCloud, KeyRound, Zap, Users,
  CheckCircle2, ChevronRight, ShieldCheck, FileSpreadsheet, Stamp
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
      id: 'foliador_init',
      title: 'Foliar tu primer documento oficial',
      description: 'Estampa folios consecutivos, membrete y códigos de control en oficios PDF.',
      buttonText: 'Abrir Foliador',
      icon: Stamp,
      action: () => onSelectTab('foliador')
    },
    {
      id: 'add_client',
      title: 'Añadir cliente o expediente RFC',
      description: 'Ingresa el RFC del contribuyente o cliente para seguimiento fiscal.',
      buttonText: 'Añadir RFC',
      icon: UserPlus,
      action: () => {
        if (onOpenAddClientModal) onOpenAddClientModal();
        else onSelectTab('espacio_trabajo');
      }
    },
    {
      id: 'load_efirma',
      title: 'Carga de Certificados SAT (CSD)',
      description: 'Conecta certificados .cer y .key para monitorear cumplimiento ante el SAT.',
      buttonText: 'Cargar CSD',
      icon: KeyRound,
      action: () => {
        if (onOpenCSDModal) onOpenCSDModal();
        else onSelectTab('configuracion');
      }
    },
    {
      id: 'quick_actions',
      title: 'Gestión de tareas y actividades',
      description: 'Crea tableros de actividades operativas y asigna responsabilidades.',
      buttonText: 'Ver tareas',
      icon: Zap,
      action: () => onSelectTab('tareas')
    },
    {
      id: 'manage_team',
      title: 'Gestiona tu equipo institucional',
      description: 'Añade colaboradores y define niveles de acceso y permisos en PazSuma.',
      buttonText: 'Gestionar equipo',
      icon: Users,
      action: () => onSelectTab('mi_equipo')
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Cabecera de bienvenida con barra de progreso institucional PazSuma */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            ¡Te damos la bienvenida a tu Espacio PazSuma!
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Comienza con la configuración del sistema para gestionar tareas, documentos oficiales y obligaciones fiscales
          </p>
        </div>

        {/* Barra de progreso con tono vino #581c2f */}
        <div className="w-full md:w-56 rounded-2xl bg-white p-3.5 border border-[#E8E2D9] shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
            <span>Progreso inicial</span>
            <span className="text-[#581c2f]">40%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-[#581c2f] rounded-full transition-all duration-500" style={{ width: '40%' }} />
          </div>
        </div>
      </div>

      {/* Subencabezado de lista */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-sm font-bold text-slate-800">
          Ruta de configuración recomendada
        </h2>
        <button
          type="button"
          onClick={() => onSelectTab('inicio')}
          className="text-xs font-semibold text-[#581c2f] hover:underline"
        >
          Ir al Inicio
        </button>
      </div>

      {/* Grid de 5 tarjetas en estilo PazSuma */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="flex flex-col justify-between rounded-2xl border border-[#E8E2D9] bg-white p-6 shadow-xs transition hover:shadow-md hover:border-[#eed7dc]"
            >
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FBF0F3] text-[#581c2f]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-sm font-bold text-slate-900">
                  {card.title}
                </h3>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed min-h-[38px]">
                  {card.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={card.action}
                  className="w-full rounded-xl bg-[#FBF0F3] py-2.5 px-4 text-xs font-bold text-[#581c2f] transition hover:bg-[#581c2f] hover:text-white active:scale-[0.98]"
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
