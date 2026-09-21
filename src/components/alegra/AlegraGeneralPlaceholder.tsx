'use client';

import React from 'react';
import {
  ArrowDownCircle, ArrowUpCircle, Package, Landmark, Calculator,
  Settings, Users, Plus, Download, Filter, Search, FileText,
  TrendingUp, CheckCircle, Clock
} from 'lucide-react';
import { AlegraTabId } from './AlegraSidebar';

interface AlegraGeneralPlaceholderProps {
  tab: AlegraTabId;
  onOpenQuickCreate: () => void;
  onOpenCSDModal: () => void;
}

export default function AlegraGeneralPlaceholder({
  tab,
  onOpenQuickCreate,
  onOpenCSDModal
}: AlegraGeneralPlaceholderProps) {
  const configs: Record<
    string,
    {
      title: string;
      subtitle: string;
      icon: any;
      primaryButton: string;
      stats: { label: string; value: string; color: string }[];
      tableHeaders: string[];
      sampleRows: string[][];
    }
  > = {
    ingresos: {
      title: 'Ingresos y Facturas de Venta',
      subtitle: 'Administra tus cobros, facturas electrónicas timbradas e ingresos del periodo',
      icon: ArrowDownCircle,
      primaryButton: '+ Nueva Factura de Venta',
      stats: [
        { label: 'Facturado este mes', value: '$124,500.00 MXN', color: 'text-emerald-600' },
        { label: 'Por cobrar vigente', value: '$32,100.00 MXN', color: 'text-blue-600' },
        { label: 'Cobrado efectivamente', value: '$92,400.00 MXN', color: 'text-[#00A88B]' }
      ],
      tableHeaders: ['Folio / UUID', 'Cliente', 'Fecha emisión', 'Subtotal', 'IVA 16%', 'Total', 'Estado'],
      sampleRows: [
        ['FAC-0104', 'Distribuidora Logística de México', '18 Sep 2026', '$45,000.00', '$7,200.00', '$52,200.00', 'Cobrada'],
        ['FAC-0105', 'Paula López Delgado', '19 Sep 2026', '$18,500.00', '$2,960.00', '$21,460.00', 'Cobrada'],
        ['FAC-0106', 'Servicios Industriales SA', '20 Sep 2026', '$27,672.41', '$4,427.59', '$32,100.00', 'Pendiente']
      ]
    },
    gastos: {
      title: 'Gastos y Compras de Proveedores',
      subtitle: 'Registra facturas de egreso recibidas, notas de débito y comprobantes de compras',
      icon: ArrowUpCircle,
      primaryButton: '+ Registrar Gasto / Compra',
      stats: [
        { label: 'Gastos del mes', value: '$48,250.00 MXN', color: 'text-slate-800' },
        { label: 'IVA acreditable', value: '$7,720.00 MXN', color: 'text-indigo-600' },
        { label: 'Por pagar a proveedores', value: '$14,500.00 MXN', color: 'text-rose-600' }
      ],
      tableHeaders: ['Folio Proveedor', 'Proveedor / Emisor', 'Categoría contable', 'Fecha', 'Total', 'Estado'],
      sampleRows: [
        ['CFDI-8821', 'Arrendadora de Inmuebles SA', 'Renta de Oficinas', '05 Sep 2026', '$25,000.00', 'Pagado'],
        ['GAS-3390', 'Comisión Federal de Electricidad', 'Servicios Públicos', '12 Sep 2026', '$8,750.00', 'Pagado'],
        ['PROV-1102', 'Papelería y Suministros MX', 'Gastos Generales', '18 Sep 2026', '$14,500.00', 'Por pagar']
      ]
    },
    contactos: {
      title: 'Directorio de Contactos (Clientes y Proveedores)',
      subtitle: 'Gestiona la base de datos de terceros, cuentas fiscales y datos de contacto',
      icon: Users,
      primaryButton: '+ Nuevo Contacto',
      stats: [
        { label: 'Total Clientes', value: '42 registrados', color: 'text-[#00A88B]' },
        { label: 'Total Proveedores', value: '18 registrados', color: 'text-blue-600' },
        { label: 'Con CFDI en el mes', value: '31 activos', color: 'text-purple-600' }
      ],
      tableHeaders: ['Nombre / Razón Social', 'RFC', 'Tipo', 'Teléfono', 'Correo', 'Saldo en Cuenta'],
      sampleRows: [
        ['Comercializadora Nacional SA de CV', 'XAXX010101000', 'Cliente', '+52 55 1234-5678', 'factura@nacional.com', '$0.00'],
        ['Paula López Delgado', 'EADM910204AB1', 'Cliente', '+52 55 9876-5432', 'paula@gmail.com', '$0.00'],
        ['Arrendadora de Inmuebles SA', 'AIN090101XYZ', 'Proveedor', '+52 55 2222-3333', 'cobranza@inmuebles.com', '$0.00']
      ]
    },
    inventario: {
      title: 'Inventario de Productos y Servicios',
      subtitle: 'Catálogo de ítems de venta con clave producto/servicio SAT y existencias',
      icon: Package,
      primaryButton: '+ Nuevo Producto / Servicio',
      stats: [
        { label: 'Ítems en catálogo', value: '64 productos', color: 'text-slate-900' },
        { label: 'Valor de inventario', value: '$318,400.00 MXN', color: 'text-emerald-600' },
        { label: 'Bajo en stock', value: '2 ítems', color: 'text-amber-600' }
      ],
      tableHeaders: ['Código', 'Nombre del ítem', 'Clave SAT', 'Precio de Venta', 'Costo Promedio', 'Existencia'],
      sampleRows: [
        ['SRV-01', 'Asesoría Contable Mensual Pyme', '84111500', '$4,500.00', '$0.00', 'Servicio'],
        ['SRV-02', 'Auditoría Fiscal y Dictamen', '84111506', '$18,000.00', '$0.00', 'Servicio'],
        ['LBN-01', 'Libro de Actas y Hojas Foliadas', '44101700', '$1,200.00', '$450.00', '48 unidades']
      ]
    },
    bancos: {
      title: 'Bancos y Conciliación Financiera',
      subtitle: 'Cuentas bancarias en moneda nacional y extranjera con saldos en tiempo real',
      icon: Landmark,
      primaryButton: '+ Vincular Cuenta Bancaria',
      stats: [
        { label: 'Saldo BBVA Bancomer', value: '$245,890.12 MXN', color: 'text-blue-700' },
        { label: 'Saldo Santander Empresas', value: '$112,450.00 MXN', color: 'text-rose-600' },
        { label: 'Movimientos por conciliar', value: '3 pendientes', color: 'text-amber-600' }
      ],
      tableHeaders: ['Institución Bancaria', 'Número de Cuenta / CLABE', 'Moneda', 'Saldo en Libros', 'Saldo en Banco', 'Estatus'],
      sampleRows: [
        ['BBVA México', '•••• 4912 (CLABE: 012180...)', 'MXN', '$245,890.12', '$245,890.12', 'Conciliado'],
        ['Santander México', '•••• 8821 (CLABE: 014180...)', 'MXN', '$112,450.00', '$112,450.00', 'Conciliado'],
        ['Caja Chica Despacho', 'Fondo Fijo de Efectivo', 'MXN', '$5,000.00', '$5,000.00', 'Cuadrado']
      ]
    },
    contabilidad: {
      title: 'Catálogo de Cuentas y Pólizas Contables',
      subtitle: 'Contabilidad electrónica bajo el código agrupador del SAT versión 1.3',
      icon: Calculator,
      primaryButton: '+ Nueva Póliza Contable',
      stats: [
        { label: 'Pólizas del periodo', value: '142 pólizas', color: 'text-slate-900' },
        { label: 'Suma de Debe', value: '$489,120.00 MXN', color: 'text-[#00A88B]' },
        { label: 'Suma de Haber', value: '$489,120.00 MXN', color: 'text-[#00A88B]' }
      ],
      tableHeaders: ['Número Póliza', 'Tipo', 'Fecha', 'Concepto', 'Total Cargos', 'Total Abonos', 'Cuadre'],
      sampleRows: [
        ['POL-ING-042', 'Ingresos', '20 Sep 2026', 'Cobro de factura FAC-0104 transferencia BBVA', '$52,200.00', '$52,200.00', 'Cuadrada'],
        ['POL-EGR-019', 'Egresos', '18 Sep 2026', 'Pago de renta de oficina Arrendadora', '$25,000.00', '$25,000.00', 'Cuadrada'],
        ['POL-DIA-088', 'Diario', '15 Sep 2026', 'Provisión mensual de impuestos y retenciones', '$14,350.00', '$14,350.00', 'Cuadrada']
      ]
    },
    configuracion: {
      title: 'Configuración General del Despacho',
      subtitle: 'Parámetros fiscales, sellos digitales CSD, numeración y preferencias del sistema',
      icon: Settings,
      primaryButton: 'Configurar Sellos CSD',
      stats: [
        { label: 'Régimen Fiscal', value: '601 General de Ley', color: 'text-slate-800' },
        { label: 'Versión CFDI', value: '4.0 Oficial', color: 'text-emerald-600' },
        { label: 'Certificado CSD', value: 'Vigente hasta 2028', color: 'text-[#00A88B]' }
      ],
      tableHeaders: ['Parámetro', 'Valor actual', 'Última modificación', 'Responsable', 'Acción'],
      sampleRows: [
        ['Certificado de Sello Digital (CSD)', 'Cargado y validado (.cer, .key)', '10 Sep 2026', 'Uriel Gómez', 'Actualizar'],
        ['Folios de Facturación', 'Serie A (del 1 al 10000)', '01 Ene 2026', 'Sistema', 'Modificar'],
        ['Conexión Buzón SAT', 'Sincronización diaria habilitada', 'Ayer', 'Automatización', 'Probar']
      ]
    }
  };

  const currentConfig = configs[tab] || configs['configuracion'];
  const Icon = currentConfig.icon;

  const handleAction = () => {
    if (tab === 'configuracion') {
      onOpenCSDModal();
    } else {
      onOpenQuickCreate();
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Cabecera del módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E6FAF6] text-[#00C9A7] shrink-0">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {currentConfig.title}
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
              {currentConfig.subtitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAction}
          className="inline-flex items-center gap-2 rounded-xl bg-[#00C9A7] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-[#00B596] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>{currentConfig.primaryButton}</span>
        </button>
      </div>

      {/* Métricas del módulo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {currentConfig.stats.map((stat, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="text-xs text-slate-500 font-medium">{stat.label}</div>
            <div className={`mt-2 text-xl font-bold ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Tabla con registros */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        {/* Barra de herramientas */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-b border-slate-100 bg-[#FAFAFC]">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar registro..."
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-[#00C9A7] focus:outline-none focus:ring-1 focus:ring-[#00C9A7]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <span>Filtrar</span>
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <Download className="h-3.5 w-3.5 text-slate-400" />
              <span>Exportar</span>
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <tr>
                {currentConfig.tableHeaders.map((header, idx) => (
                  <th key={idx} className="px-5 py-3.5">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentConfig.sampleRows.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-slate-50/80 transition">
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-5 py-4 font-medium text-slate-700">
                      {cellIdx === row.length - 1 && (cell === 'Cobrada' || cell === 'Pagado' || cell === 'Conciliado' || cell === 'Cuadrada') ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                          <CheckCircle className="h-3 w-3" />
                          <span>{cell}</span>
                        </span>
                      ) : cellIdx === row.length - 1 && cell === 'Pendiente' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                          <Clock className="h-3 w-3" />
                          <span>{cell}</span>
                        </span>
                      ) : cellIdx === row.length - 1 && cell === 'Actualizar' ? (
                        <button
                          onClick={onOpenCSDModal}
                          className="text-[#00A88B] hover:underline font-semibold"
                        >
                          Actualizar CSD
                        </button>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
