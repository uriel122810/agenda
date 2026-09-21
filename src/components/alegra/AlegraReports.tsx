'use client';

import React, { useState } from 'react';
import {
  FileText, BarChart3, TrendingUp, DollarSign, PieChart,
  Download, Filter, Calendar, ShieldCheck, KeyRound, ArrowUpRight,
  Receipt, Scale, Calculator, Building, Landmark, ChevronRight, Stamp
} from 'lucide-react';

interface ReportItem {
  id: string;
  name: string;
  description: string;
  frequency: string;
  format: 'PDF' | 'Excel' | 'XML';
}

interface ReportCategory {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  reports: ReportItem[];
}

interface AlegraReportsProps {
  onOpenCSDModal: () => void;
}

export default function AlegraReports({ onOpenCSDModal }: AlegraReportsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const categories: ReportCategory[] = [
    {
      id: 'folios',
      name: 'Libros y Foliador Oficial',
      description: 'Bitácoras oficiales de oficios foliados, sellos consecutivos y actas',
      icon: Stamp,
      color: 'bg-[#FBF0F3] text-[#581c2f] border-[#eed7dc]',
      reports: [
        { id: 'rep-fol1', name: 'Libro Consecutivo de Folios', description: 'Registro cronológico y estatus de todos los oficios y circulares foliadas.', frequency: 'En tiempo real', format: 'PDF' },
        { id: 'rep-fol2', name: 'Bitácora de Sellos Digitales', description: 'Control de autenticidad, folios correlativos y firmas digitales.', frequency: 'Mensual', format: 'PDF' },
        { id: 'rep-fol3', name: 'Padrón de Documentos por Destinatario', description: 'Consolidado de oficios enviados y recibidos por dependencia o cliente.', frequency: 'Mensual', format: 'Excel' }
      ]
    },
    {
      id: 'fiscales',
      name: 'Fiscales y Auditoría SAT',
      description: 'DIOT, auxiliares de impuestos y conciliación con el portal SAT',
      icon: ShieldCheck,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      reports: [
        { id: 'rep-sat1', name: 'Declaración Informativa (DIOT)', description: 'Archivo para carga batch de operaciones con terceros ante el SAT.', frequency: 'Mensual', format: 'Excel' },
        { id: 'rep-sat2', name: 'Auxiliar de Impuestos (IVA e ISR)', description: 'IVA trasladado efectivamente cobrado vs IVA acreditable pagado.', frequency: 'Mensual', format: 'Excel' },
        { id: 'rep-sat3', name: 'Conciliación SAT vs Contabilidad', description: 'Cruce automático de XML descargados vs registros en libros contables.', frequency: 'Mensual', format: 'PDF' }
      ]
    },
    {
      id: 'financieros',
      name: 'Financieros Oficiales',
      description: 'Estados financieros bajo Normas de Información Financiera (NIF)',
      icon: PieChart,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      reports: [
        { id: 'rep-f1', name: 'Balance General (Estado de Posición)', description: 'Activo, pasivo y capital contable detallado al corte de periodo.', frequency: 'Mensual / Anual', format: 'PDF' },
        { id: 'rep-f2', name: 'Estado de Resultados Integral (P&L)', description: 'Ventas, costos de operación, EBITDA y utilidad neta neta.', frequency: 'Mensual', format: 'PDF' },
        { id: 'rep-f3', name: 'Flujo de Efectivo', description: 'Origen y aplicación de recursos operativos, inversión y financiamiento.', frequency: 'Mensual', format: 'Excel' }
      ]
    },
    {
      id: 'contables',
      name: 'Contabilidad Institucional',
      description: 'Libros y catálogo de cuentas agrupado para el SAT',
      icon: Calculator,
      color: 'bg-teal-50 text-[#008970] border-teal-200',
      reports: [
        { id: 'rep-c1', name: 'Balanza de Comprobación', description: 'Saldos iniciales, movimientos debe/haber y saldos finales.', frequency: 'Mensual (Cierre)', format: 'Excel' },
        { id: 'rep-c2', name: 'Libro Mayor de Cuentas', description: 'Desglose analítico de pólizas por cada cuenta y subcuenta contable.', frequency: 'Mensual', format: 'PDF' },
        { id: 'rep-c3', name: 'Libro Diario de Pólizas', description: 'Registro cronológico de pólizas de ingreso, egreso y diario.', frequency: 'Continuo', format: 'PDF' }
      ]
    },
    {
      id: 'administrativos',
      name: 'Administrativos y Cartera',
      description: 'Cuentas por cobrar, cuentas por pagar y antigüedad de saldos',
      icon: DollarSign,
      color: 'bg-blue-50 text-blue-600 border-blue-200',
      reports: [
        { id: 'rep-a1', name: 'Antigüedad de Saldos (CxC)', description: 'Clasificación de cobranza vencida a 30, 60, 90 y más de 120 días.', frequency: 'Semanal', format: 'Excel' },
        { id: 'rep-a2', name: 'Cuentas por Pagar a Proveedores (CxP)', description: 'Compromisos de pago programados y egresos pendientes.', frequency: 'Quincenal', format: 'PDF' }
      ]
    }
  ];

  const handleDownload = (report: ReportItem) => {
    setDownloadingId(report.id);
    setTimeout(() => {
      setDownloadingId(null);
      alert(`Reporte institucional "${report.name}" descargado en formato ${report.format}.`);
    }, 700);
  };

  const displayedCategories =
    selectedCategory === 'todas'
      ? categories
      : categories.filter(c => c.id === selectedCategory);

  return (
    <div className="space-y-6 pb-12">
      {/* Cabecera del módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Centro de Reportes Oficiales y Balanzas
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Descarga libros de folios, estados financieros, balanzas y papeles de trabajo de PazSuma
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCSDModal}
          className="inline-flex items-center gap-2 rounded-xl bg-white border border-[#eed7dc] px-4 py-2 text-xs sm:text-sm font-semibold text-[#581c2f] shadow-2xs hover:bg-[#FBF0F3] transition"
        >
          <KeyRound className="h-4 w-4 text-[#b39656]" />
          <span>Configurar Sellos CSD</span>
        </button>
      </div>

      {/* Selector de categorías en pestañas */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#E8E2D9]">
        <button
          onClick={() => setSelectedCategory('todas')}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition ${
            selectedCategory === 'todas'
              ? 'bg-[#581c2f] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Todas las categorías
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition ${
              selectedCategory === cat.id
                ? 'bg-[#581c2f] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Grid de Categorías y sus Reportes */}
      <div className="space-y-6">
        {displayedCategories.map(category => {
          const CatIcon = category.icon;
          return (
            <div
              key={category.id}
              className="rounded-2xl border border-[#E8E2D9] bg-white p-6 shadow-xs"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${category.color}`}>
                  <CatIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{category.name}</h3>
                  <p className="text-xs text-slate-500">{category.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.reports.map(report => (
                  <div
                    key={report.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-[#FDFBF9] p-4 transition hover:bg-white hover:shadow-md hover:border-[#eed7dc]"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="rounded bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                          {report.format}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {report.frequency}
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                        {report.name}
                      </h4>
                      <p className="mt-1 text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                        {report.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">PazSuma Certificado</span>
                      <button
                        onClick={() => handleDownload(report)}
                        disabled={downloadingId === report.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-[#E8E2D9] px-2.5 py-1 text-xs font-bold text-[#581c2f] shadow-2xs hover:bg-[#FBF0F3] transition disabled:opacity-50"
                      >
                        <Download className="h-3 w-3" />
                        <span>{downloadingId === report.id ? 'Generando...' : 'Descargar'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
