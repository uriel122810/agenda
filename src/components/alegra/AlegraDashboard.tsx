'use client';

import React, { useState } from 'react';
import {
  HelpCircle, Settings, ChevronDown, Plus, TrendingUp,
  FileText, ArrowUpRight, CheckCircle2, Circle, AlertCircle,
  ExternalLink, Calendar, BarChart2, DollarSign, Users,
  ShoppingBag, CreditCard, Stamp
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { AlegraTabId } from './AlegraSidebar';

interface AlegraDashboardProps {
  onSelectTab: (tab: AlegraTabId) => void;
  onOpenQuickCreate?: () => void;
  onOpenCSDModal?: () => void;
}

export default function AlegraDashboard({
  onSelectTab,
  onOpenQuickCreate,
  onOpenCSDModal
}: AlegraDashboardProps) {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [showOnboardingCard, setShowOnboardingCard] = useState<boolean>(true);
  const [period, setPeriod] = useState<'mes_actual' | 'mes_anterior' | 'este_año'>('mes_actual');

  // Checklist de parametrización institucional de PazSuma
  const checklistItems = [
    {
      id: 0,
      title: 'Parametrización y catálogo',
      heading: 'Parametrización Institucional PazSuma',
      description: 'Configura las cuentas y series documentales de acuerdo a las necesidades operativas.',
      actionText: 'Configurar parámetros',
      actionTab: 'contabilidad' as AlegraTabId
    },
    {
      id: 1,
      title: 'Importa CFDI desde el SAT',
      heading: 'Sincronización y Descarga SAT',
      description: 'Conecta tu e.firma o CSD para sincronizar comprobantes, facturas y opiniones de cumplimiento.',
      actionText: 'Cargar certificados CSD',
      isCSDAction: true
    },
    {
      id: 2,
      title: 'Foliador de Documentos Oficiales',
      heading: 'Foliador Digital y Membrete',
      description: 'Registra oficios, circulares y actas con folios consecutivos correlativos y sellado digital.',
      actionText: 'Abrir Foliador',
      actionTab: 'foliador' as AlegraTabId
    },
    {
      id: 3,
      title: 'Reportes y Balanzas',
      heading: 'Reportes y Estados Operativos',
      description: 'Genera balance general, reportes de tareas y bitácora de folios con un solo clic.',
      actionText: 'Ver reportes',
      actionTab: 'reportes' as AlegraTabId
    },
    {
      id: 4,
      title: 'Espacio de Trabajo / RFCs',
      heading: 'Cartera y Expedientes Institucionales',
      description: 'Supervisa las alertas fiscales, opiniones 32-D y estatus de colaboradores.',
      actionText: 'Explorar cartera',
      actionTab: 'espacio_trabajo' as AlegraTabId
    }
  ];

  // Datos simulados de gráfica Total de actividades y operaciones por periodo
  const chartData = [
    { day: '1 sep', ops: 0 },
    { day: '2 sep', ops: 1 },
    { day: '3 sep', ops: 0 },
    { day: '4 sep', ops: 2 },
    { day: '5 sep', ops: 0 },
    { day: '6 sep', ops: 0 },
    { day: '7 sep', ops: 3 },
    { day: '8 sep', ops: 1 },
    { day: '9 sep', ops: 0 },
    { day: '10 sep', ops: 2 },
    { day: '11 sep', ops: 4 },
    { day: '12 sep', ops: 1 },
    { day: '13 sep', ops: 0 },
    { day: '14 sep', ops: 2 },
    { day: '15 sep', ops: 5 },
    { day: '16 sep', ops: 3 },
    { day: '17 sep', ops: 2 },
    { day: '18 sep', ops: 4 },
    { day: '19 sep', ops: 6 },
    { day: '20 sep', ops: 2 },
  ];

  const currentStepData = checklistItems[activeStep] || checklistItems[0];

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Tarjeta superior de bienvenida / checklist institucional PazSuma */}
      {showOnboardingCard && (
        <div className="relative rounded-2xl border border-[#E8E2D9] bg-white p-6 shadow-sm">
          {/* Botón Ocultar */}
          <button
            onClick={() => setShowOnboardingCard(false)}
            className="absolute top-5 right-6 text-xs text-slate-400 hover:text-slate-600 transition"
          >
            Ocultar
          </button>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Lado izquierdo: Lista de 5 funcionalidades */}
            <div className="md:col-span-5 space-y-2 border-b md:border-b-0 md:border-r border-[#E8E2D9]/70 pb-4 md:pb-0 md:pr-6">
              {checklistItems.map((item, idx) => {
                const isSelected = activeStep === idx;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveStep(idx)}
                    className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left text-xs sm:text-sm font-medium transition ${
                      isSelected
                        ? 'bg-[#FBF0F3] text-[#581c2f] font-bold border border-[#EED7DC]'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                      {isSelected ? (
                        <div className="h-4 w-4 rounded-full border-2 border-[#581c2f] flex items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-[#581c2f]" />
                        </div>
                      ) : (
                        <Circle className="h-4 w-4 text-slate-300" />
                      )}
                    </div>
                    <span className="truncate">{item.title}</span>
                  </button>
                );
              })}
              <div className="pt-2 text-[11px] text-slate-400 font-normal px-2">
                PazSuma • Control de Operaciones
              </div>
            </div>

            {/* Lado derecho: Detalle del item con botón vino */}
            <div className="md:col-span-7 flex flex-col items-start justify-center pl-0 md:pl-6 space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FBF0F3] text-[#581c2f]">
                <Settings className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {currentStepData.heading}
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-md leading-relaxed">
                  {currentStepData.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (currentStepData.isCSDAction && onOpenCSDModal) {
                    onOpenCSDModal();
                  } else if (currentStepData.actionTab) {
                    onSelectTab(currentStepData.actionTab);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#581c2f] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-[#72223c] active:scale-[0.98]"
              >
                <span>{currentStepData.actionText}</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Sección: Resumen Institucional y Operativo */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Resumen Operativo y Financiero
          </h2>

          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={period}
                onChange={e => setPeriod(e.target.value as any)}
                className="appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-slate-700 shadow-xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
              >
                <option value="mes_actual">Mes actual</option>
                <option value="mes_anterior">Mes anterior</option>
                <option value="este_año">Este año</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>

            <button
              type="button"
              onClick={() => onSelectTab('foliador')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#581c2f] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#72223c]"
            >
              <Stamp className="h-3.5 w-3.5 text-[#b39656]" />
              <span>Nuevo Folio</span>
            </button>
          </div>
        </div>

        {/* 4 Tarjetas de Métricas con paleta PazSuma */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tarjeta 1: Cuentas por cobrar */}
          <div className="rounded-2xl border border-[#E8E2D9] bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="text-xs font-medium text-slate-500 underline decoration-slate-300 underline-offset-4 cursor-pointer hover:text-[#581c2f]">
              Cuentas por cobrar
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">$0.00</div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-1 rounded-full bg-emerald-500" />
                  <span className="text-[11px] text-slate-500">Vigentes</span>
                </div>
                <div className="text-xs font-semibold text-slate-800">$0.00</div>
                <div className="text-[10px] text-slate-400">0 documentos</div>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-1 rounded-full bg-rose-500" />
                  <span className="text-[11px] text-slate-500">Vencidas</span>
                </div>
                <div className="text-xs font-semibold text-slate-800">$0.00</div>
                <div className="text-[10px] text-slate-400">0 documentos</div>
              </div>
            </div>
          </div>

          {/* Tarjeta 2: Cuentas por pagar */}
          <div className="rounded-2xl border border-[#E8E2D9] bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="text-xs font-medium text-slate-500 underline decoration-slate-300 underline-offset-4 cursor-pointer hover:text-[#581c2f]">
              Cuentas por pagar
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">$0.00</div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-1 rounded-full bg-emerald-500" />
                  <span className="text-[11px] text-slate-500">Vigentes</span>
                </div>
                <div className="text-xs font-semibold text-slate-800">$0.00</div>
                <div className="text-[10px] text-slate-400">0 documentos</div>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-1 rounded-full bg-rose-500" />
                  <span className="text-[11px] text-slate-500">Vencidas</span>
                </div>
                <div className="text-xs font-semibold text-slate-800">$0.00</div>
                <div className="text-[10px] text-slate-400">0 documentos</div>
              </div>
            </div>
          </div>

          {/* Tarjeta 3: Impuestos y Cumplimiento SAT */}
          <div className="rounded-2xl border border-[#E8E2D9] bg-white p-5 shadow-sm transition hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">Impuestos en venta / IVA</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">$0.00</div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3">
              <div className="text-xs font-medium text-slate-700">Opiniones SAT 32-D</div>
              <div className="text-[10px] text-slate-400">Estatus de cumplimiento</div>
              <div className="mt-0.5 text-xs font-semibold text-emerald-600">38 Positivas • 1 Pendiente</div>
            </div>
          </div>

          {/* Tarjeta 4: Folios Emitidos y Documentos */}
          <div className="rounded-2xl border border-[#E8E2D9] bg-white p-5 shadow-sm transition hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">Folios Registrados</div>
              <div className="mt-2 text-2xl font-bold text-[#581c2f]">24</div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3">
              <div 
                onClick={() => onSelectTab('foliador')}
                className="text-xs font-medium text-[#581c2f] underline decoration-[#eed7dc] underline-offset-4 cursor-pointer hover:text-[#72223c]"
              >
                Foliador Digital Oficial
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-800">100% Consecutivos en regla</div>
            </div>
          </div>
        </div>

        {/* 3. Gráfica con la paleta de PazSuma (Tono Vino #581c2f) */}
        <div className="mt-6 rounded-2xl border border-[#E8E2D9] bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-slate-900">Actividad y Operaciones Registradas</h3>
                <span title="Evolución de movimientos y trámites en el periodo" className="cursor-help text-slate-400">
                  <HelpCircle className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Seguimiento continuo de oficios, pólizas y transacciones institucionales PazSuma.
              </p>
            </div>

            <div className="text-right">
              <span className="text-xl font-bold text-[#581c2f]">40 registros</span>
              <span className="ml-2 text-xs font-medium text-emerald-600 font-semibold">+12% este mes</span>
            </div>
          </div>

          {/* Recharts con degradado en vino #581c2f */}
          <div className="mt-6 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPazSuma" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#581c2f" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#581c2f" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={{ stroke: '#E8E2D9' }}
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  domain={[0, 8]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(88, 28, 47, 0.1)',
                    border: '1px solid #E8E2D9',
                    fontSize: '12px'
                  }}
                  formatter={(val: any) => [`${val} operaciones`, 'Actividad']}
                />
                <Area
                  type="monotone"
                  dataKey="ops"
                  stroke="#581c2f"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorPazSuma)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Botón flotante PazSuma */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => onSelectTab('foliador')}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#581c2f] text-[#F4F1EA] shadow-lg transition hover:scale-105 hover:bg-[#72223c] active:scale-95 focus:outline-none focus:ring-4 focus:ring-[#581c2f]/30"
          title="Foliador Oficial PazSuma"
        >
          <Stamp className="h-6 w-6 text-[#b39656]" />
        </button>
      </div>
    </div>
  );
}
