'use client';

import React, { useState } from 'react';
import {
  HelpCircle, Settings, ChevronDown, Plus, TrendingUp,
  FileText, ArrowUpRight, CheckCircle2, Circle, AlertCircle,
  ExternalLink, Calendar, BarChart2, DollarSign, Users,
  ShoppingBag, CreditCard
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

  // Checklist de parametrización contable exactamente como la captura 1
  const checklistItems = [
    {
      id: 0,
      title: 'Parámetros contables',
      heading: 'Parametrización contable',
      description: 'Ajusta tu catálogo de cuentas de acuerdo a las necesidades de tu negocio.',
      actionText: 'Configurar cuentas',
      actionTab: 'contabilidad' as AlegraTabId
    },
    {
      id: 1,
      title: 'Importa CFDI desde el SAT',
      heading: 'Descarga masiva de comprobantes',
      description: 'Conecta tu e.firma o CSD para sincronizar automáticamente todas tus facturas y gastos.',
      actionText: 'Cargar certificados SAT',
      isCSDAction: true
    },
    {
      id: 2,
      title: 'Conciliación bancaria automática',
      heading: 'Conciliación bancaria',
      description: 'Sube tus extractos bancarios en Excel o sincroniza directamente con tu institución.',
      actionText: 'Ir a bancos',
      actionTab: 'bancos' as AlegraTabId
    },
    {
      id: 3,
      title: 'Reportes contables inteligentes',
      heading: 'Reportes y estados financieros',
      description: 'Genera balance general, estado de resultados y pólizas con un solo clic.',
      actionText: 'Ver reportes',
      actionTab: 'reportes' as AlegraTabId
    },
    {
      id: 4,
      title: 'Espacio Contador',
      heading: 'Gestión colaborativa de clientes',
      description: 'Supervisa las alertas fiscales, opiniones de cumplimiento y tareas de tu cartera.',
      actionText: 'Explorar clientes RFC',
      actionTab: 'espacio_trabajo' as AlegraTabId
    }
  ];

  // Datos simulados de gráfica Total de ventas por periodo (1 sep a 20 sep como en la captura)
  const salesChartData = [
    { day: '1 sep', sales: 0, target: 1200 },
    { day: '2 sep', sales: 0, target: 1200 },
    { day: '3 sep', sales: 0, target: 1200 },
    { day: '4 sep', sales: 0, target: 1200 },
    { day: '5 sep', sales: 0, target: 1200 },
    { day: '6 sep', sales: 0, target: 1200 },
    { day: '7 sep', sales: 0, target: 1200 },
    { day: '8 sep', sales: 0, target: 1200 },
    { day: '9 sep', sales: 0, target: 1200 },
    { day: '10 sep', sales: 0, target: 1200 },
    { day: '11 sep', sales: 0, target: 1200 },
    { day: '12 sep', sales: 0, target: 1200 },
    { day: '13 sep', sales: 0, target: 1200 },
    { day: '14 sep', sales: 0, target: 1200 },
    { day: '15 sep', sales: 0, target: 1200 },
    { day: '16 sep', sales: 0, target: 1200 },
    { day: '17 sep', sales: 0, target: 1200 },
    { day: '18 sep', sales: 0, target: 1200 },
    { day: '19 sep', sales: 0, target: 1200 },
    { day: '20 sep', sales: 0, target: 1200 },
  ];

  const currentStepData = checklistItems[activeStep] || checklistItems[0];

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Tarjeta superior de bienvenida / checklist paramétrico (Screenshot 1) */}
      {showOnboardingCard && (
        <div className="relative rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
          {/* Botón Ocultar arriba a la derecha */}
          <button
            onClick={() => setShowOnboardingCard(false)}
            className="absolute top-5 right-6 text-xs text-slate-400 hover:text-slate-600 transition"
          >
            Ocultar
          </button>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Lado izquierdo: Lista de 5 funcionalidades */}
            <div className="md:col-span-5 space-y-2.5 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-6">
              {checklistItems.map((item, idx) => {
                const isSelected = activeStep === idx;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveStep(idx)}
                    className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left text-xs sm:text-sm font-medium transition ${
                      isSelected
                        ? 'bg-[#E6FAF6] text-[#00A88B]'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                      {isSelected ? (
                        <div className="h-4 w-4 rounded-full border-2 border-[#00C9A7] flex items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-[#00C9A7]" />
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
                0 de 5 funcionalidades completadas
              </div>
            </div>

            {/* Lado derecho: Detalle del item seleccionado con botón verde */}
            <div className="md:col-span-7 flex flex-col items-start justify-center pl-0 md:pl-6 space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E6FAF6] text-[#00C9A7]">
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
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#00C9A7] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-[#00B596] active:scale-[0.98]"
              >
                <span>{currentStepData.actionText}</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Sección: Resumen del negocio (Screenshot 1) */}
      <div>
        {/* Cabecera de la sección con selector y botón verde */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Resumen del negocio
          </h2>

          <div className="flex items-center gap-2">
            {/* Selector 'Mes actual ⌵' */}
            <div className="relative">
              <select
                value={period}
                onChange={e => setPeriod(e.target.value as any)}
                className="appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-slate-700 shadow-sm hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#00C9A7]"
              >
                <option value="mes_actual">Mes actual</option>
                <option value="mes_anterior">Mes anterior</option>
                <option value="este_año">Este año</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Botón verde 'Agregar gráfica ⌵' */}
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg bg-[#00C9A7] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#00B596]"
            >
              <span>Agregar gráfica</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* 4 Tarjetas de Métricas idénticas al screenshot 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tarjeta 1: Cuentas por cobrar */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="text-xs font-medium text-slate-500 underline decoration-slate-300 underline-offset-4 cursor-pointer hover:text-slate-800">
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
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="text-xs font-medium text-slate-500 underline decoration-slate-300 underline-offset-4 cursor-pointer hover:text-slate-800">
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

          {/* Tarjeta 3: Impuestos en venta & Devoluciones */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">Impuestos en venta</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">$0.00</div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3">
              <div className="text-xs font-medium text-slate-700">Devoluciones de clientes</div>
              <div className="text-[10px] text-slate-400">Incluye impuestos</div>
              <div className="mt-0.5 text-xs font-semibold text-slate-800">$0.00</div>
            </div>
          </div>

          {/* Tarjeta 4: Productos vendidos & Clientes */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500">Productos vendidos</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">0</div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3">
              <div className="text-xs font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 cursor-pointer">
                Clientes con ventas
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-800">0</div>
            </div>
          </div>
        </div>

        {/* 3. Gráfica Total de ventas con impuestos incluidos (Screenshot 1) */}
        <div className="mt-6 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-slate-900">Total de ventas</h3>
                <span title="La gráfica muestra el valor de tus ventas con impuestos incluidos." className="cursor-help text-slate-400">
                  <HelpCircle className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                La gráfica muestra el valor de tus ventas con impuestos incluidos.
              </p>
            </div>

            <div className="text-right">
              <span className="text-xl font-bold text-slate-900">$0.00</span>
              <span className="ml-2 text-xs font-medium text-slate-400">0%</span>
            </div>
          </div>

          {/* Lienzo de Recharts */}
          <div className="mt-6 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00C9A7" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00C9A7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  tickFormatter={val => `$${val}`}
                  domain={[0, 5]}
                  ticks={[0, 1, 2, 3, 4, 5]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px'
                  }}
                  formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Ventas']}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#00C9A7"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSales)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Botón flotante de Soporte Alegra (Screenshot 1: círculo teal con ? abajo a la derecha) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => onSelectTab('buzon_sat')}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00C9A7] text-white shadow-lg transition hover:scale-105 hover:bg-[#00B596] active:scale-95 focus:outline-none focus:ring-4 focus:ring-[#00C9A7]/30"
          title="¿Necesitas ayuda contable o del SAT?"
        >
          <HelpCircle className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
