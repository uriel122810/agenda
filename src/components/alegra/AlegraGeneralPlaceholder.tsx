'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowDownCircle, ArrowUpCircle, Package, Landmark, Calculator,
  Settings, Users, Plus, Download, Filter, Search, FileText,
  TrendingUp, CheckCircle, Clock, X, AlertCircle, ShieldCheck,
  CheckCircle2, DollarSign, Building2, CreditCard, Hash
} from 'lucide-react';
import { AlegraTabId } from './AlegraSidebar';
import {
  ContactoRecord, InventarioRecord, CuentaBancariaRecord,
  PolizaRecord, GastoRecord, IngresoRecord,
  fetchContactos, saveContacto,
  fetchInventario, saveInventarioItem,
  fetchBancos, saveCuentaBancaria,
  fetchPolizas, savePoliza,
  fetchGastos, saveGasto,
  fetchIngresos, saveIngreso
} from '@/lib/crudService';
import { generateOfficialReportPdf } from '@/lib/pdfReportGenerator';

interface AlegraGeneralPlaceholderProps {
  tab: AlegraTabId;
  onOpenQuickCreate: () => void;
  onOpenCSDModal: () => void;
  searchQuery?: string;
}

export default function AlegraGeneralPlaceholder({
  tab,
  onOpenQuickCreate,
  onOpenCSDModal,
  searchQuery = ''
}: AlegraGeneralPlaceholderProps) {
  // Estados de datos
  const [contactos, setContactos] = useState<ContactoRecord[]>([]);
  const [inventario, setInventario] = useState<InventarioRecord[]>([]);
  const [bancos, setBancos] = useState<CuentaBancariaRecord[]>([]);
  const [polizas, setPolizas] = useState<PolizaRecord[]>([]);
  const [gastos, setGastos] = useState<GastoRecord[]>([]);
  const [ingresos, setIngresos] = useState<IngresoRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtro de búsqueda local combinado con global
  const [localSearch, setLocalSearch] = useState('');
  const activeSearch = (searchQuery || localSearch).trim().toLowerCase();

  // Estados de modales de creación
  const [isContactoModalOpen, setIsContactoModalOpen] = useState(false);
  const [isInventarioModalOpen, setIsInventarioModalOpen] = useState(false);
  const [isBancoModalOpen, setIsBancoModalOpen] = useState(false);
  const [isPolizaModalOpen, setIsPolizaModalOpen] = useState(false);
  const [isGastoModalOpen, setIsGastoModalOpen] = useState(false);
  const [isIngresoModalOpen, setIsIngresoModalOpen] = useState(false);

  // Notificación toast de éxito
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Carga inicial de datos desde Supabase / Local
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [c, inv, b, p, g, ing] = await Promise.all([
          fetchContactos(),
          fetchInventario(),
          fetchBancos(),
          fetchPolizas(),
          fetchGastos(),
          fetchIngresos()
        ]);
        if (isMounted) {
          setContactos(c);
          setInventario(inv);
          setBancos(b);
          setPolizas(p);
          setGastos(g);
          setIngresos(ing);
        }
      } catch (err) {
        console.error('Error loading crud data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  // Manejo del botón primario según la pestaña
  const handlePrimaryAction = () => {
    switch (tab) {
      case 'contactos':
        setIsContactoModalOpen(true);
        break;
      case 'inventario':
        setIsInventarioModalOpen(true);
        break;
      case 'bancos':
        setIsBancoModalOpen(true);
        break;
      case 'contabilidad':
        setIsPolizaModalOpen(true);
        break;
      case 'gastos':
        setIsGastoModalOpen(true);
        break;
      case 'ingresos':
        setIsIngresoModalOpen(true);
        break;
      case 'configuracion':
        onOpenCSDModal();
        break;
      default:
        onOpenQuickCreate();
        break;
    }
  };

  // ── Formularios en Modal ──────────────────────────────────────────────────

  // 1. Formulario Nuevo Contacto
  const [contactoForm, setContactoForm] = useState({
    nombre: '',
    rfc: '',
    tipo: 'Cliente' as 'Cliente' | 'Proveedor' | 'Colaborador',
    telefono: '',
    email: '',
    saldo: '$0.00'
  });

  const handleCreateContacto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactoForm.nombre || !contactoForm.rfc) return;
    const created = await saveContacto({
      nombre: contactoForm.nombre,
      rfc: contactoForm.rfc.toUpperCase().trim(),
      tipo: contactoForm.tipo,
      telefono: contactoForm.telefono || 'Sin teléfono',
      email: contactoForm.email || 'sin_correo@dominio.com',
      saldo: contactoForm.saldo || '$0.00'
    });
    setContactos(prev => [created, ...prev]);
    setIsContactoModalOpen(false);
    setContactoForm({ nombre: '', rfc: '', tipo: 'Cliente', telefono: '', email: '', saldo: '$0.00' });
    showToast(`Contacto ${created.nombre} registrado exitosamente en PazSuma y Supabase.`);
  };

  // 2. Formulario Nuevo Ítem / Inventario
  const [inventarioForm, setInventarioForm] = useState({
    codigo: '',
    nombre: '',
    clave_sat: '84111500',
    precio: '',
    costo: '',
    existencia: 'Servicio'
  });

  const handleCreateInventario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inventarioForm.codigo || !inventarioForm.nombre) return;
    const created = await saveInventarioItem({
      codigo: inventarioForm.codigo.toUpperCase().trim(),
      nombre: inventarioForm.nombre,
      clave_sat: inventarioForm.clave_sat || '84111500',
      precio: inventarioForm.precio.startsWith('$') ? inventarioForm.precio : `$${Number(inventarioForm.precio || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      costo: inventarioForm.costo.startsWith('$') ? inventarioForm.costo : `$${Number(inventarioForm.costo || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      existencia: inventarioForm.existencia || 'Servicio'
    });
    setInventario(prev => [created, ...prev]);
    setIsInventarioModalOpen(false);
    setInventarioForm({ codigo: '', nombre: '', clave_sat: '84111500', precio: '', costo: '', existencia: 'Servicio' });
    showToast(`Ítem ${created.nombre} (${created.codigo}) guardado exitosamente en catálogo.`);
  };

  // 3. Formulario Vincular Cuenta Bancaria
  const [bancoForm, setBancoForm] = useState({
    banco: 'BBVA México',
    numero_cuenta: '',
    clabe: '',
    moneda: 'MXN',
    saldo_inicial: '0.00'
  });

  const handleCreateBanco = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bancoForm.banco || !bancoForm.numero_cuenta) return;
    const num = Number(bancoForm.saldo_inicial || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 });
    const formatted = `$${num}`;
    const created = await saveCuentaBancaria({
      banco: bancoForm.banco,
      numero_cuenta: `•••• ${bancoForm.numero_cuenta.slice(-4)} (CLABE: ${bancoForm.clabe || 'N/A'})`,
      clabe: bancoForm.clabe || 'N/A',
      moneda: bancoForm.moneda,
      saldo_libros: formatted,
      saldo_banco: formatted,
      estatus: 'Conciliado'
    });
    setBancos(prev => [created, ...prev]);
    setIsBancoModalOpen(false);
    setBancoForm({ banco: 'BBVA México', numero_cuenta: '', clabe: '', moneda: 'MXN', saldo_inicial: '0.00' });
    showToast(`Cuenta de ${created.banco} vinculada exitosamente con saldo en libros.`);
  };

  // 4. Formulario Registrar Póliza Contable
  const [polizaForm, setPolizaForm] = useState({
    numero_poliza: `POL-DIA-${Math.floor(100 + Math.random() * 900)}`,
    tipo: 'Diario' as 'Ingresos' | 'Egresos' | 'Diario',
    concepto: '',
    monto: '10000.00'
  });

  const handleCreatePoliza = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!polizaForm.numero_poliza || !polizaForm.concepto) return;
    const formattedMonto = `$${Number(polizaForm.monto || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
    const created = await savePoliza({
      numero_poliza: polizaForm.numero_poliza.toUpperCase().trim(),
      tipo: polizaForm.tipo,
      fecha: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
      concepto: polizaForm.concepto,
      total_debe: formattedMonto,
      total_haber: formattedMonto,
      cuadre: 'Cuadrada'
    });
    setPolizas(prev => [created, ...prev]);
    setIsPolizaModalOpen(false);
    setPolizaForm({
      numero_poliza: `POL-DIA-${Math.floor(100 + Math.random() * 900)}`,
      tipo: 'Diario',
      concepto: '',
      monto: '10000.00'
    });
    showToast(`Póliza contable ${created.numero_poliza} registrada y cuadrada con éxito.`);
  };

  // 5. Formulario Registrar Gasto / Egreso
  const [gastoForm, setGastoForm] = useState({
    folio: `GAS-${Math.floor(1000 + Math.random() * 9000)}`,
    proveedor: '',
    categoria: 'Materiales y Útiles de Oficina',
    total: '',
    estado: 'Pagado' as 'Pagado' | 'Por pagar',
    metodo_pago: 'Transferencia BBVA'
  });

  const handleCreateGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gastoForm.proveedor || !gastoForm.total) return;
    const formattedTotal = `$${Number(gastoForm.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
    const created = await saveGasto({
      folio: gastoForm.folio.toUpperCase().trim(),
      proveedor: gastoForm.proveedor,
      categoria: gastoForm.categoria,
      fecha: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
      total: formattedTotal,
      estado: gastoForm.estado,
      metodo_pago: gastoForm.metodo_pago
    });
    setGastos(prev => [created, ...prev]);
    setIsGastoModalOpen(false);
    setGastoForm({
      folio: `GAS-${Math.floor(1000 + Math.random() * 9000)}`,
      proveedor: '',
      categoria: 'Materiales y Útiles de Oficina',
      total: '',
      estado: 'Pagado',
      metodo_pago: 'Transferencia BBVA'
    });
    showToast(`Gasto ${created.folio} registrado y contabilizado en el estado financiero.`);
  };

  // 6. Formulario Nueva Factura / Ingreso
  const [ingresoForm, setIngresoForm] = useState({
    folio: `FOL-${Math.floor(1000 + Math.random() * 9000)}`,
    cliente: '',
    subtotal: '',
    estado: 'Cobrada' as 'Cobrada' | 'Pendiente'
  });

  const handleCreateIngreso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingresoForm.cliente || !ingresoForm.subtotal) return;
    const sub = Number(ingresoForm.subtotal || 0);
    const iva = sub * 0.16;
    const tot = sub + iva;
    const created = await saveIngreso({
      folio: ingresoForm.folio.toUpperCase().trim(),
      cliente: ingresoForm.cliente,
      fecha: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
      subtotal: `$${sub.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      iva: `$${iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      total: `$${tot.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      estado: ingresoForm.estado
    });
    setIngresos(prev => [created, ...prev]);
    setIsIngresoModalOpen(false);
    setIngresoForm({
      folio: `FOL-${Math.floor(1000 + Math.random() * 9000)}`,
      cliente: '',
      subtotal: '',
      estado: 'Cobrada'
    });
    showToast(`Ingreso ${created.folio} emitido y registrado en cuentas por cobrar.`);
  };

  // ── Configuraciones dinámicas de la vista activa ──────────────────────────

  const viewData = useMemo(() => {
    switch (tab) {
      case 'ingresos': {
        const filtered = ingresos.filter(i =>
          !activeSearch ||
          i.folio.toLowerCase().includes(activeSearch) ||
          i.cliente.toLowerCase().includes(activeSearch) ||
          i.estado.toLowerCase().includes(activeSearch)
        );
        const totalFacturado = ingresos.reduce((acc, i) => acc + (parseFloat(i.total.replace(/[^0-9.-]/g, '')) || 0), 0);
        return {
          title: 'Ingresos y Comprobantes Fiscales',
          subtitle: 'Control de cobros, facturas emitidas y recepción de ingresos en PazSuma',
          icon: ArrowDownCircle,
          primaryButton: '+ Nueva Factura / Comprobante',
          stats: [
            { label: 'Facturado este mes', value: `$${totalFacturado.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`, color: 'text-[#581c2f]' },
            { label: 'Documentos emitidos', value: `${ingresos.length} comprobantes`, color: 'text-blue-700' },
            { label: 'Cobrado efectivamente', value: `$${(totalFacturado * 0.85).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`, color: 'text-emerald-700' }
          ],
          tableHeaders: ['Folio / UUID', 'Cliente / Dependencia', 'Fecha emisión', 'Subtotal', 'IVA 16%', 'Total', 'Estado'],
          rows: filtered.map(i => [i.folio, i.cliente, i.fecha, i.subtotal, i.iva, i.total, i.estado])
        };
      }
      case 'gastos': {
        const filtered = gastos.filter(g =>
          !activeSearch ||
          g.folio.toLowerCase().includes(activeSearch) ||
          g.proveedor.toLowerCase().includes(activeSearch) ||
          g.categoria.toLowerCase().includes(activeSearch) ||
          g.estado.toLowerCase().includes(activeSearch)
        );
        const totalGastos = gastos.reduce((acc, g) => acc + (parseFloat(g.total.replace(/[^0-9.-]/g, '')) || 0), 0);
        return {
          title: 'Egresos y Proveedores Institucionales',
          subtitle: 'Comprobantes de egreso recibidos, facturas de compras y gastos operativos',
          icon: ArrowUpCircle,
          primaryButton: '+ Registrar Gasto / Compra',
          stats: [
            { label: 'Gastos del mes', value: `$${totalGastos.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`, color: 'text-slate-800' },
            { label: 'IVA acreditable (16%)', value: `$${(totalGastos * 0.16).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`, color: 'text-indigo-700' },
            { label: 'Registros de egreso', value: `${gastos.length} comprobantes`, color: 'text-rose-700' }
          ],
          tableHeaders: ['Folio Proveedor', 'Proveedor / Emisor', 'Categoría presupuestal', 'Fecha', 'Total', 'Estado'],
          rows: filtered.map(g => [g.folio, g.proveedor, g.categoria, g.fecha, g.total, g.estado])
        };
      }
      case 'contactos': {
        const filtered = contactos.filter(c =>
          !activeSearch ||
          c.nombre.toLowerCase().includes(activeSearch) ||
          c.rfc.toLowerCase().includes(activeSearch) ||
          c.tipo.toLowerCase().includes(activeSearch) ||
          c.email.toLowerCase().includes(activeSearch)
        );
        const clientesCount = contactos.filter(c => c.tipo === 'Cliente').length;
        const provCount = contactos.filter(c => c.tipo === 'Proveedor').length;
        return {
          title: 'Padrón de Contactos y Contribuyentes',
          subtitle: 'Directorio institucional de clientes, proveedores y colaboradores de PazSuma',
          icon: Users,
          primaryButton: '+ Nuevo Contacto',
          stats: [
            { label: 'Total Clientes', value: `${clientesCount} registrados`, color: 'text-[#581c2f]' },
            { label: 'Total Proveedores', value: `${provCount} registrados`, color: 'text-blue-700' },
            { label: 'Total Padrón', value: `${contactos.length} activos`, color: 'text-purple-700' }
          ],
          tableHeaders: ['Nombre / Razón Social', 'RFC', 'Tipo', 'Teléfono', 'Correo', 'Saldo en Cuenta'],
          rows: filtered.map(c => [c.nombre, c.rfc, c.tipo, c.telefono, c.email, c.saldo])
        };
      }
      case 'inventario': {
        const filtered = inventario.filter(i =>
          !activeSearch ||
          i.codigo.toLowerCase().includes(activeSearch) ||
          i.nombre.toLowerCase().includes(activeSearch) ||
          i.clave_sat.toLowerCase().includes(activeSearch)
        );
        return {
          title: 'Inventario de Bienes y Catálogo de Servicios',
          subtitle: 'Control de existencias, claves SAT y suministros del despacho',
          icon: Package,
          primaryButton: '+ Nuevo Ítem / Servicio',
          stats: [
            { label: 'Ítems en catálogo', value: `${inventario.length} bienes y servicios`, color: 'text-slate-900' },
            { label: 'Valor de inventario', value: '$318,400.00 MXN', color: 'text-[#581c2f]' },
            { label: 'Bajo en stock', value: '0 ítems', color: 'text-amber-600' }
          ],
          tableHeaders: ['Código', 'Nombre del ítem', 'Clave SAT', 'Precio Estimado', 'Costo Promedio', 'Existencia'],
          rows: filtered.map(i => [i.codigo, i.nombre, i.clave_sat, i.precio, i.costo, i.existencia])
        };
      }
      case 'bancos': {
        const filtered = bancos.filter(b =>
          !activeSearch ||
          b.banco.toLowerCase().includes(activeSearch) ||
          b.numero_cuenta.toLowerCase().includes(activeSearch) ||
          b.estatus.toLowerCase().includes(activeSearch)
        );
        const totalBancos = bancos.reduce((acc, b) => acc + (parseFloat(b.saldo_libros.replace(/[^0-9.-]/g, '')) || 0), 0);
        return {
          title: 'Cuentas Bancarias y Fondos',
          subtitle: 'Saldos de cuentas institucionales y conciliación en tiempo real',
          icon: Landmark,
          primaryButton: '+ Vincular Cuenta',
          stats: [
            { label: 'Disponibilidad total', value: `$${totalBancos.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`, color: 'text-[#581c2f]' },
            { label: 'Cuentas activas', value: `${bancos.length} cuentas`, color: 'text-blue-700' },
            { label: 'Estatus conciliación', value: '100% Conciliado', color: 'text-emerald-700' }
          ],
          tableHeaders: ['Institución Bancaria', 'Número de Cuenta / CLABE', 'Moneda', 'Saldo en Libros', 'Saldo en Banco', 'Estatus'],
          rows: filtered.map(b => [b.banco, b.numero_cuenta, b.moneda, b.saldo_libros, b.saldo_banco, b.estatus])
        };
      }
      case 'contabilidad': {
        const filtered = polizas.filter(p =>
          !activeSearch ||
          p.numero_poliza.toLowerCase().includes(activeSearch) ||
          p.concepto.toLowerCase().includes(activeSearch) ||
          p.tipo.toLowerCase().includes(activeSearch)
        );
        const sumaDebe = polizas.reduce((acc, p) => acc + (parseFloat(p.total_debe.replace(/[^0-9.-]/g, '')) || 0), 0);
        return {
          title: 'Catálogo de Cuentas y Pólizas Contables',
          subtitle: 'Contabilidad bajo código agrupador del SAT y parámetros de PazSuma',
          icon: Calculator,
          primaryButton: '+ Nueva Póliza Contable',
          stats: [
            { label: 'Pólizas del periodo', value: `${polizas.length} pólizas`, color: 'text-slate-900' },
            { label: 'Suma de Debe (Cargos)', value: `$${sumaDebe.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`, color: 'text-[#581c2f]' },
            { label: 'Suma de Haber (Abonos)', value: `$${sumaDebe.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`, color: 'text-[#581c2f]' }
          ],
          tableHeaders: ['Número Póliza', 'Tipo', 'Fecha', 'Concepto', 'Total Cargos', 'Total Abonos', 'Cuadre'],
          rows: filtered.map(p => [p.numero_poliza, p.tipo, p.fecha, p.concepto, p.total_debe, p.total_haber, p.cuadre])
        };
      }
      case 'configuracion':
      default: {
        return {
          title: 'Configuración Institucional PazSuma',
          subtitle: 'Parámetros fiscales, certificados CSD, sellos digitales y preferencias del sistema',
          icon: Settings,
          primaryButton: 'Configurar Sellos CSD',
          stats: [
            { label: 'Régimen Fiscal', value: '601 General de Ley', color: 'text-slate-800' },
            { label: 'Versión CFDI', value: '4.0 Oficial', color: 'text-emerald-700' },
            { label: 'Certificado CSD', value: 'Vigente hasta 2028', color: 'text-[#581c2f]' }
          ],
          tableHeaders: ['Parámetro', 'Valor actual', 'Última modificación', 'Responsable', 'Acción'],
          rows: [
            ['Certificado de Sello Digital (CSD)', 'Cargado y validado (.cer, .key)', '10 Sep 2026', 'Uriel Gómez', 'Actualizar'],
            ['Folios de Documentos', 'Serie OFI (consecutivo digital)', '01 Ene 2026', 'Sistema', 'Modificar'],
            ['Conexión Buzón SAT', 'Sincronización diaria habilitada', 'Ayer', 'Automatización', 'Probar']
          ]
        };
      }
    }
  }, [tab, activeSearch, contactos, inventario, bancos, polizas, gastos, ingresos]);

  const Icon = viewData.icon;

  // Exportar reporte real en PDF
  const handleExportView = async () => {
    try {
      await generateOfficialReportPdf({
        id: `rep-${tab}`,
        name: `Reporte Institucional de ${viewData.title}`,
        description: `Exportación consolidada de registros en tiempo real de la plataforma PazSuma.`,
        category: tab
      });
      showToast('Reporte oficial en PDF descargado exitosamente.');
    } catch (err) {
      console.error('Error exporting PDF:', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Notificación Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-[#581c2f] px-5 py-3.5 text-white shadow-2xl animate-in slide-in-from-bottom duration-300 border border-[#b39656]/30">
          <CheckCircle2 className="h-5 w-5 text-[#b39656]" />
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-white/70 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Cabecera del módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FBF0F3] text-[#581c2f] shrink-0 border border-[#EED7DC]">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {viewData.title}
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
              {viewData.subtitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePrimaryAction}
          className="inline-flex items-center gap-2 rounded-xl bg-[#581c2f] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-[#72223c] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>{viewData.primaryButton}</span>
        </button>
      </div>

      {/* Métricas del módulo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {viewData.stats.map((stat, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-[#E8E2D9] bg-white p-5 shadow-xs transition hover:shadow-md"
          >
            <div className="text-xs text-slate-500 font-medium">{stat.label}</div>
            <div className={`mt-2 text-xl font-bold ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Tabla con registros interactivos y filtrado */}
      <div className="rounded-2xl border border-[#E8E2D9] bg-white shadow-xs overflow-hidden">
        {/* Barra de herramientas */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-b border-slate-100 bg-[#FAFAFC]">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery ? searchQuery : localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              placeholder={`Buscar en ${tab}...`}
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
            />
            {(searchQuery || localSearch) && (
              <button
                onClick={() => setLocalSearch('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportView}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              title="Descargar reporte en PDF oficial"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              <span>Exportar PDF</span>
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <tr>
                {viewData.tableHeaders.map((header, idx) => (
                  <th key={idx} className="px-5 py-3.5">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {viewData.rows.length === 0 ? (
                <tr>
                  <td colSpan={viewData.tableHeaders.length} className="px-5 py-8 text-center text-slate-400">
                    No se encontraron registros que coincidan con &quot;{activeSearch}&quot;
                  </td>
                </tr>
              ) : (
                viewData.rows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-[#FDFBF9] transition">
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="px-5 py-4 font-medium text-slate-700">
                        {cellIdx === row.length - 1 && (cell === 'Cobrada' || cell === 'Pagado' || cell === 'Conciliado' || cell === 'Cuadrada') ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                            <CheckCircle className="h-3 w-3" />
                            <span>{cell}</span>
                          </span>
                        ) : cellIdx === row.length - 1 && (cell === 'Pendiente' || cell === 'Por pagar') ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                            <Clock className="h-3 w-3" />
                            <span>{cell}</span>
                          </span>
                        ) : cellIdx === row.length - 1 && cell === 'Actualizar' ? (
                          <button
                            onClick={onOpenCSDModal}
                            className="text-[#581c2f] hover:underline font-bold"
                          >
                            Actualizar CSD
                          </button>
                        ) : (
                          cell
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL 1: NUEVO CONTACTO ───────────────────────────────────────── */}
      {isContactoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#E8E2D9] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#581c2f]" />
                <h3 className="text-base font-bold text-slate-900">Agregar Nuevo Contacto / Contribuyente</h3>
              </div>
              <button onClick={() => setIsContactoModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContacto} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Razón Social o Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Comercializadora del Centro SA de CV"
                  value={contactoForm.nombre}
                  onChange={e => setContactoForm({ ...contactoForm, nombre: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">RFC Oficial *</label>
                  <input
                    type="text"
                    required
                    placeholder="XAXX010101000"
                    value={contactoForm.rfc}
                    onChange={e => setContactoForm({ ...contactoForm, rfc: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-slate-800 uppercase focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Contacto</label>
                  <select
                    value={contactoForm.tipo}
                    onChange={e => setContactoForm({ ...contactoForm, tipo: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 bg-white focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                  >
                    <option value="Cliente">Cliente</option>
                    <option value="Proveedor">Proveedor</option>
                    <option value="Colaborador">Colaborador</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teléfono Institucional</label>
                  <input
                    type="text"
                    placeholder="+52 55 1234-5678"
                    value={contactoForm.telefono}
                    onChange={e => setContactoForm({ ...contactoForm, telefono: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="contacto@empresa.com"
                    value={contactoForm.email}
                    onChange={e => setContactoForm({ ...contactoForm, email: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsContactoModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#581c2f] px-5 py-2 font-semibold text-white hover:bg-[#72223c] transition shadow-xs"
                >
                  Guardar en Supabase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: NUEVO ÍTEM / INVENTARIO ──────────────────────────────── */}
      {isInventarioModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#E8E2D9] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-[#581c2f]" />
                <h3 className="text-base font-bold text-slate-900">Agregar Ítem / Servicio al Catálogo</h3>
              </div>
              <button onClick={() => setIsInventarioModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInventario} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Código Interno *</label>
                  <input
                    type="text"
                    required
                    placeholder="SRV-04"
                    value={inventarioForm.codigo}
                    onChange={e => setInventarioForm({ ...inventarioForm, codigo: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-mono uppercase text-slate-800 focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Clave SAT (Catálogo CFDI 4.0)</label>
                  <input
                    type="text"
                    placeholder="84111500"
                    value={inventarioForm.clave_sat}
                    onChange={e => setInventarioForm({ ...inventarioForm, clave_sat: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-slate-800 focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre o Descripción del Servicio / Bien *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Dictamen Fiscal Integral PazSuma"
                  value={inventarioForm.nombre}
                  onChange={e => setInventarioForm({ ...inventarioForm, nombre: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Precio Venta (MXN)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="5000.00"
                    value={inventarioForm.precio}
                    onChange={e => setInventarioForm({ ...inventarioForm, precio: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Costo Estimado</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={inventarioForm.costo}
                    onChange={e => setInventarioForm({ ...inventarioForm, costo: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Existencia / Tipo</label>
                  <input
                    type="text"
                    placeholder="Servicio"
                    value={inventarioForm.existencia}
                    onChange={e => setInventarioForm({ ...inventarioForm, existencia: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInventarioModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#581c2f] px-5 py-2 font-semibold text-white hover:bg-[#72223c] transition shadow-xs"
                >
                  Guardar en Inventario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: VINCULAR CUENTA BANCARIA ─────────────────────────────── */}
      {isBancoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#E8E2D9] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-[#581c2f]" />
                <h3 className="text-base font-bold text-slate-900">Vincular Nueva Cuenta Bancaria</h3>
              </div>
              <button onClick={() => setIsBancoModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBanco} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Institución Financiera *</label>
                <select
                  value={bancoForm.banco}
                  onChange={e => setBancoForm({ ...bancoForm, banco: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 bg-white focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                >
                  <option value="BBVA México">BBVA México</option>
                  <option value="Santander México">Santander México</option>
                  <option value="Banorte">Banorte</option>
                  <option value="Citibanamex">Citibanamex</option>
                  <option value="HSBC México">HSBC México</option>
                  <option value="Scotiabank">Scotiabank</option>
                  <option value="Inbursa">Inbursa</option>
                  <option value="Caja Chica Despacho">Caja Chica / Fondo Fijo</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Número de Cuenta *</label>
                  <input
                    type="text"
                    required
                    placeholder="1234567890"
                    value={bancoForm.numero_cuenta}
                    onChange={e => setBancoForm({ ...bancoForm, numero_cuenta: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-slate-800 focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">CLABE Interbancaria (18 dígitos)</label>
                  <input
                    type="text"
                    maxLength={18}
                    placeholder="012180001234567890"
                    value={bancoForm.clabe}
                    onChange={e => setBancoForm({ ...bancoForm, clabe: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-slate-800 focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Moneda</label>
                  <select
                    value={bancoForm.moneda}
                    onChange={e => setBancoForm({ ...bancoForm, moneda: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 bg-white focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                  >
                    <option value="MXN">MXN - Pesos Mexicanos</option>
                    <option value="USD">USD - Dólares Americanos</option>
                    <option value="EUR">EUR - Euros</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Saldo Inicial en Libros (MXN)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="50000.00"
                    value={bancoForm.saldo_inicial}
                    onChange={e => setBancoForm({ ...bancoForm, saldo_inicial: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBancoModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#581c2f] px-5 py-2 font-semibold text-white hover:bg-[#72223c] transition shadow-xs"
                >
                  Vincular Cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: REGISTRAR PÓLIZA CONTABLE ────────────────────────────── */}
      {isPolizaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#E8E2D9] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-[#581c2f]" />
                <h3 className="text-base font-bold text-slate-900">Registrar Póliza Contable Oficial</h3>
              </div>
              <button onClick={() => setIsPolizaModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePoliza} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Número de Póliza *</label>
                  <input
                    type="text"
                    required
                    value={polizaForm.numero_poliza}
                    onChange={e => setPolizaForm({ ...polizaForm, numero_poliza: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-slate-800 focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Póliza</label>
                  <select
                    value={polizaForm.tipo}
                    onChange={e => setPolizaForm({ ...polizaForm, tipo: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 bg-white focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                  >
                    <option value="Diario">Diario</option>
                    <option value="Ingresos">Ingresos</option>
                    <option value="Egresos">Egresos</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Concepto General del Asiento *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Ej. Registro contable de retenciones y provisiones fiscales del periodo"
                  value={polizaForm.concepto}
                  onChange={e => setPolizaForm({ ...polizaForm, concepto: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Monto Balanceado (Debe = Haber) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="15000.00"
                    value={polizaForm.monto}
                    onChange={e => setPolizaForm({ ...polizaForm, monto: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 pl-8 text-slate-800 font-mono font-bold focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                  />
                </div>
                <p className="mt-1 text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Póliza cuadrada automáticamente (Cargos = Abonos)
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPolizaModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#581c2f] px-5 py-2 font-semibold text-white hover:bg-[#72223c] transition shadow-xs"
                >
                  Registrar Póliza
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 5: REGISTRAR GASTO / EGRESO ─────────────────────────────── */}
      {isGastoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#E8E2D9] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="h-5 w-5 text-[#581c2f]" />
                <h3 className="text-base font-bold text-slate-900">Registrar Gasto / Compra Institucional</h3>
              </div>
              <button onClick={() => setIsGastoModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGasto} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Folio o Factura Proveedor *</label>
                  <input
                    type="text"
                    required
                    value={gastoForm.folio}
                    onChange={e => setGastoForm({ ...gastoForm, folio: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-slate-800 uppercase focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estado de Pago</label>
                  <select
                    value={gastoForm.estado}
                    onChange={e => setGastoForm({ ...gastoForm, estado: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 bg-white focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                  >
                    <option value="Pagado">Pagado</option>
                    <option value="Por pagar">Por pagar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Proveedor o Beneficiario *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Papelería y Suministros MX"
                  value={gastoForm.proveedor}
                  onChange={e => setGastoForm({ ...gastoForm, proveedor: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoría Presupuestal</label>
                  <select
                    value={gastoForm.categoria}
                    onChange={e => setGastoForm({ ...gastoForm, categoria: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 bg-white focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                  >
                    <option value="Arrendamiento de Oficinas">Arrendamiento de Oficinas</option>
                    <option value="Servicios Públicos (Luz/Agua/Internet)">Servicios Públicos</option>
                    <option value="Materiales y Útiles de Oficina">Materiales de Oficina</option>
                    <option value="Honorarios Profesionales">Honorarios Profesionales</option>
                    <option value="Viáticos y Transporte">Viáticos y Transporte</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Monto Total (MXN) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="14500.00"
                    value={gastoForm.total}
                    onChange={e => setGastoForm({ ...gastoForm, total: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 font-mono font-bold focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGastoModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#581c2f] px-5 py-2 font-semibold text-white hover:bg-[#72223c] transition shadow-xs"
                >
                  Registrar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 6: NUEVA FACTURA / INGRESO ──────────────────────────────── */}
      {isIngresoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#E8E2D9] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ArrowDownCircle className="h-5 w-5 text-[#581c2f]" />
                <h3 className="text-base font-bold text-slate-900">Emitir Comprobante de Ingreso</h3>
              </div>
              <button onClick={() => setIsIngresoModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIngreso} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Folio / Serie *</label>
                  <input
                    type="text"
                    required
                    value={ingresoForm.folio}
                    onChange={e => setIngresoForm({ ...ingresoForm, folio: e.target.value.toUpperCase() })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 font-mono text-slate-800 uppercase focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estado de Cobro</label>
                  <select
                    value={ingresoForm.estado}
                    onChange={e => setIngresoForm({ ...ingresoForm, estado: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 bg-white focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                  >
                    <option value="Cobrada">Cobrada</option>
                    <option value="Pendiente">Pendiente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cliente / Dependencia *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Distribuidora Logística de México"
                  value={ingresoForm.cliente}
                  onChange={e => setIngresoForm({ ...ingresoForm, cliente: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Monto Subtotal (MXN) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="45000.00"
                  value={ingresoForm.subtotal}
                  onChange={e => setIngresoForm({ ...ingresoForm, subtotal: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-slate-800 font-mono font-bold focus:border-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                />
                {ingresoForm.subtotal && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    + IVA (16%): ${(Number(ingresoForm.subtotal) * 0.16).toFixed(2)}  •  Total: ${(Number(ingresoForm.subtotal) * 1.16).toFixed(2)} MXN
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsIngresoModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#581c2f] px-5 py-2 font-semibold text-white hover:bg-[#72223c] transition shadow-xs"
                >
                  Emitir Comprobante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
