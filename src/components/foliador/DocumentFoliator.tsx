'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText, Plus, Search, Filter, Download, Printer,
  CheckCircle2, Clock, AlertCircle, FileCheck, Stamp,
  Upload, Eye, Trash2, ArrowUpDown, X, ChevronRight,
  ExternalLink, Copy, Check, Sparkles, RefreshCw,
  FolderLock, Tag, Layers, Calendar, User, ArrowRight
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import FolioVisualEditor from './FolioVisualEditor';

export interface DocumentFolio {
  id: string;
  folio: string;
  tipo_documento: string;
  asunto: string;
  remitente: string;
  destinatario: string;
  fecha_documento: string;
  estatus: 'registrado' | 'en_tramite' | 'atendido' | 'archivado' | 'cancelado';
  prioridad: 'baja' | 'normal' | 'urgente' | 'muy_urgente';
  archivo_nombre?: string | null;
  archivo_tamano?: string | null;
  archivo_url?: string | null;
  notas?: string | null;
  foliado_digital?: boolean;
  creador_email?: string | null;
  created_at?: string;
}

interface DocumentFoliatorProps {
  userEmail?: string;
  userName?: string;
  isDark?: boolean;
  searchQuery?: string;
}

const TIPOS_DOCUMENTO = [
  'Oficio',
  'Memorándum',
  'Circular',
  'Minuta',
  'Petición Ciudadana',
  'Informe Técnico',
  'Notificación',
  'Acuerdo',
  'Contrato / Convenio',
  'Factura / Comprobante',
  'Otro'
];

const PREFIJOS = ['FOL', 'OFICIO', 'MEMO', 'CIRC', 'PET', 'INF'];

const ESTATUS_CONFIG = {
  registrado: { label: 'Registrado', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' },
  en_tramite: { label: 'En Trámite', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' },
  atendido:   { label: 'Atendido',   color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' },
  archivado:  { label: 'Archivado',  color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
  cancelado:  { label: 'Cancelado',  color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' }
};

const PRIORIDAD_CONFIG = {
  baja:        { label: 'Baja',        color: 'text-slate-500' },
  normal:      { label: 'Normal',      color: 'text-slate-600 dark:text-slate-300' },
  urgente:     { label: 'Urgente',     color: 'text-amber-600 font-semibold' },
  muy_urgente: { label: 'Muy Urgente', color: 'text-red-600 font-bold' }
};

const LOCAL_STORAGE_KEY = 'pazsuma_document_folios_v1';

export default function DocumentFoliator({ userEmail, userName, isDark = false, searchQuery: externalSearchQuery = '' }: DocumentFoliatorProps) {
  const supabase = createSupabaseBrowserClient();

  // ── States ─────────────────────────────────────────────────────────────────
  const [folios, setFolios] = useState<DocumentFolio[]>([]);
  const [activeTab, setActiveTab] = useState<'libro' | 'estampador'>('libro');
  const [loading, setLoading] = useState(true);
  const [usingSupabase, setUsingSupabase] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery);

  useEffect(() => {
    setSearchQuery(externalSearchQuery);
  }, [externalSearchQuery]);
  const [filterTipo, setFilterTipo] = useState('todos');
  const [filterEstatus, setFilterEstatus] = useState('todos');
  const [filterPrioridad, setFilterPrioridad] = useState('todos');

  // Modals & Viewers
  const [isNewFolioModalOpen, setIsNewFolioModalOpen] = useState(false);
  const [selectedFolioForPrint, setSelectedFolioForPrint] = useState<DocumentFolio | null>(null);
  const [selectedPdfToView, setSelectedPdfToView] = useState<{ folio: string; name: string; url: string } | null>(null);
  const [folioToDelete, setFolioToDelete] = useState<DocumentFolio | null>(null);

  // Toast Flotante
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // New Folio Form
  const [prefijo, setPrefijo] = useState('FOL');
  const [customPrefijo, setCustomPrefijo] = useState('');
  const [folioNumber, setFolioNumber] = useState('');
  const [tipoDoc, setTipoDoc] = useState('Oficio');
  const [asunto, setAsunto] = useState('');
  const [remitente, setRemitente] = useState('');
  const [destinatario, setDestinatario] = useState('');
  const [prioridad, setPrioridad] = useState<'baja' | 'normal' | 'urgente' | 'muy_urgente'>('normal');
  const [notas, setNotas] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Colors / Theme ────────────────────────────────────────────────────────
  const cardBg = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const textTitle = isDark ? 'text-white' : 'text-slate-800';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark
    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-[#b39656]'
    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#6b1c35]';

  // ── Calculate Next Consecutive Folio ───────────────────────────────────────
  const generateNextFolioNumber = useCallback((selectedPref: string) => {
    const currentYear = new Date().getFullYear();
    const prefixStr = (selectedPref === 'CUSTOM' ? (customPrefijo.trim() || 'FOL') : selectedPref).toUpperCase();
    
    // Find highest consecutive number for this prefix and year
    let maxNum = 0;
    folios.forEach(f => {
      const regex = new RegExp(`^${prefixStr}-${currentYear}-(\\d+)$`, 'i');
      const match = f.folio.match(regex);
      if (match && match[1]) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    });

    const nextNum = String(maxNum + 1).padStart(4, '0');
    return `${prefixStr}-${currentYear}-${nextNum}`;
  }, [folios, customPrefijo]);

  // ── Load Folios (Supabase with LocalStorage fallback) ──────────────────────
  const loadFolios = useCallback(async () => {
    setLoading(true);
    let loadedFromDb = false;

    try {
      const { data, error } = await supabase
        .from('document_folios')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setFolios(data as DocumentFolio[]);
        setUsingSupabase(true);
        loadedFromDb = true;
      }
    } catch (err) {
      console.warn('Supabase document_folios not available yet, using local store', err);
    }

    if (!loadedFromDb) {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setFolios(parsed);
        } catch {
          setFolios([]);
        }
      } else {
        // Seed some sample administrative folios if completely empty
        const sampleYear = new Date().getFullYear();
        const initialSamples: DocumentFolio[] = [
          {
            id: 'folio-sample-1',
            folio: `FOL-${sampleYear}-0001`,
            tipo_documento: 'Oficio',
            asunto: 'Convocatoria a Sesión Ordinaria de Planeación Municipal',
            remitente: 'Secretaría General',
            destinatario: 'Direcciones y Coordinaciones Administrativas',
            fecha_documento: new Date().toISOString(),
            estatus: 'atendido',
            prioridad: 'urgente',
            archivo_nombre: 'Convocatoria_Sesion_Ordinaria.pdf',
            archivo_tamano: '245 KB',
            archivo_url: 'https://pdfobject.com/pdf/sample.pdf',
            foliado_digital: true,
            creador_email: userEmail || 'operador@pazsuma.gob.mx',
            created_at: new Date().toISOString()
          },
          {
            id: 'folio-sample-2',
            folio: `OFICIO-${sampleYear}-0002`,
            tipo_documento: 'Oficio',
            asunto: 'Remisión de Informe Trimestral de Avance Presupuestal PbR',
            remitente: 'Tesorería Municipal',
            destinatario: 'Órgano de Control Interno',
            fecha_documento: new Date(Date.now() - 86400000).toISOString(),
            estatus: 'en_tramite',
            prioridad: 'normal',
            archivo_nombre: 'Informe_Trimestral_PbR.pdf',
            archivo_tamano: '1.2 MB',
            foliado_digital: false,
            creador_email: userEmail || 'operador@pazsuma.gob.mx',
            created_at: new Date(Date.now() - 86400000).toISOString()
          }
        ];
        setFolios(initialSamples);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialSamples));
      }
    }

    setLoading(false);
  }, [supabase, userEmail]);

  useEffect(() => {
    loadFolios();
  }, [loadFolios]);

  // Update auto-calculated folio when opening modal or changing prefix
  useEffect(() => {
    if (isNewFolioModalOpen) {
      setFolioNumber(generateNextFolioNumber(prefijo));
    }
  }, [isNewFolioModalOpen, prefijo, generateNextFolioNumber]);

  // Sync to localStorage as continuous backup
  const persistFoliosLocally = (newList: DocumentFolio[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newList));
  };

  // ── Handle Create Folio ───────────────────────────────────────────────────
  const handleCreateFolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folioNumber.trim() || !asunto.trim() || !remitente.trim() || !destinatario.trim()) {
      alert('Por favor completa todos los campos obligatorios.');
      return;
    }

    // Check duplicate
    if (folios.some(f => f.folio.toLowerCase() === folioNumber.trim().toLowerCase())) {
      alert(`El folio ${folioNumber} ya existe. Por favor utiliza un consecutivo distinto.`);
      return;
    }

    setIsSubmitting(true);

    let uploadedUrl: string | null = null;

    // Subir documento al bucket 'documentos_folios' de Supabase
    if (attachedFile) {
      try {
        const cleanName = attachedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `${folioNumber.trim().toUpperCase()}_${Date.now()}_${cleanName}`;

        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('documentos_folios')
          .upload(storagePath, attachedFile, {
            contentType: attachedFile.type || 'application/pdf',
            upsert: true
          });

        if (!uploadError && uploadData) {
          const { data: publicUrlData } = supabase
            .storage
            .from('documentos_folios')
            .getPublicUrl(storagePath);

          uploadedUrl = publicUrlData?.publicUrl || null;
        } else {
          console.warn('Nota de Supabase Storage (se usará URL local):', uploadError?.message);
          uploadedUrl = URL.createObjectURL(attachedFile);
        }
      } catch (storageErr) {
        console.warn('Excepción al cargar a Supabase Storage:', storageErr);
        uploadedUrl = URL.createObjectURL(attachedFile);
      }
    }

    const newFolioItem: DocumentFolio = {
      id: crypto.randomUUID(),
      folio: folioNumber.trim().toUpperCase(),
      tipo_documento: tipoDoc,
      asunto: asunto.trim(),
      remitente: remitente.trim(),
      destinatario: destinatario.trim(),
      fecha_documento: new Date().toISOString(),
      estatus: 'registrado',
      prioridad,
      notas: notas.trim() || null,
      archivo_nombre: attachedFile ? attachedFile.name : null,
      archivo_tamano: attachedFile ? `${(attachedFile.size / 1024).toFixed(1)} KB` : null,
      archivo_url: uploadedUrl,
      foliado_digital: false,
      creador_email: userEmail || 'operador@pazsuma.gob.mx',
      created_at: new Date().toISOString()
    };

    // Guardar en Supabase
    if (usingSupabase) {
      try {
        const { error } = await supabase.from('document_folios').insert([{
          id: newFolioItem.id,
          folio: newFolioItem.folio,
          tipo_documento: newFolioItem.tipo_documento,
          asunto: newFolioItem.asunto,
          remitente: newFolioItem.remitente,
          destinatario: newFolioItem.destinatario,
          fecha_documento: newFolioItem.fecha_documento,
          estatus: newFolioItem.estatus,
          prioridad: newFolioItem.prioridad,
          archivo_nombre: newFolioItem.archivo_nombre,
          archivo_tamano: newFolioItem.archivo_tamano,
          archivo_url: newFolioItem.archivo_url,
          notas: newFolioItem.notas,
          foliado_digital: newFolioItem.foliado_digital,
          creador_email: newFolioItem.creador_email
        }]);

        if (error) {
          console.warn('Error al guardar en Supabase, persistiendo en copia local:', error);
        }
      } catch (err) {
        console.warn('Error de red con Supabase:', err);
      }
    }

    const updated = [newFolioItem, ...folios];
    setFolios(updated);
    persistFoliosLocally(updated);

    // If a PDF file was attached, activate estampador tab
    if (attachedFile && attachedFile.type === 'application/pdf') {
      setActiveTab('estampador');
    }

    setIsSubmitting(false);
    setIsNewFolioModalOpen(false);
    resetNewFolioForm();
  };

  const resetNewFolioForm = () => {
    setAsunto('');
    setRemitente('');
    setDestinatario('');
    setNotas('');
    setAttachedFile(null);
    setPrioridad('normal');
  };

  // ── Quick Update Estatus ──────────────────────────────────────────────────
  const handleUpdateEstatus = async (folioId: string, newEstatus: DocumentFolio['estatus']) => {
    const updated = folios.map(f => f.id === folioId ? { ...f, estatus: newEstatus } : f);
    setFolios(updated);
    persistFoliosLocally(updated);

    if (usingSupabase) {
      try {
        await supabase.from('document_folios').update({ estatus: newEstatus }).eq('id', folioId);
      } catch (err) {
        console.warn('Error al actualizar estatus en Supabase:', err);
      }
    }
  };

  // ── Delete Folio ──────────────────────────────────────────────────────────
  const handleDeleteFolio = async () => {
    if (!folioToDelete) return;

    const updated = folios.filter(f => f.id !== folioToDelete.id);
    setFolios(updated);
    persistFoliosLocally(updated);

    if (usingSupabase) {
      try {
        await supabase.from('document_folios').delete().eq('id', folioToDelete.id);
      } catch (err) {
        console.warn('Error al eliminar de Supabase:', err);
      }
    }

    setFolioToDelete(null);
  };

  // ── Filtered Folios ───────────────────────────────────────────────────────
  const filteredFolios = folios.filter(f => {
    const matchesSearch =
      f.folio.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.asunto.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.remitente.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.destinatario.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTipo = filterTipo === 'todos' || f.tipo_documento === filterTipo;
    const matchesEstatus = filterEstatus === 'todos' || f.estatus === filterEstatus;
    const matchesPrioridad = filterPrioridad === 'todos' || f.prioridad === filterPrioridad;

    return matchesSearch && matchesTipo && matchesEstatus && matchesPrioridad;
  });

  // ── Export CSV ────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (filteredFolios.length === 0) {
      alert('No hay folios para exportar.');
      return;
    }

    const headers = ['Folio', 'Tipo', 'Asunto', 'Remitente', 'Destinatario', 'Fecha', 'Estatus', 'Prioridad', 'Archivo', 'Foliado Digital'];
    const rows = filteredFolios.map(f => [
      `"${f.folio}"`,
      `"${f.tipo_documento}"`,
      `"${f.asunto.replace(/"/g, '""')}"`,
      `"${f.remitente.replace(/"/g, '""')}"`,
      `"${f.destinatario.replace(/"/g, '""')}"`,
      `"${new Date(f.fecha_documento).toLocaleDateString()}"`,
      `"${f.estatus}"`,
      `"${f.prioridad}"`,
      `"${f.archivo_nombre || ''}"`,
      `"${f.foliado_digital ? 'SI' : 'NO'}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Libro_de_Folios_PazSuma_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Open In Stamper ───────────────────────────────────────────────────────
  const handleOpenInStamper = (_folio: DocumentFolio) => {
    setActiveTab('estampador');
  };

  // ── Count Stats ───────────────────────────────────────────────────────────
  const totalFolios = folios.length;
  const foliosEnTramite = folios.filter(f => f.estatus === 'en_tramite').length;
  const foliosAtendidos = folios.filter(f => f.estatus === 'atendido').length;
  const foliosUrgentes = folios.filter(f => f.prioridad === 'urgente' || f.prioridad === 'muy_urgente').length;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in">

      {/* ── HEADER & NAVIGATION TABS ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4 border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#6b1c35] to-[#581c2f] text-white shadow-md shadow-[#6b1c35]/20">
              <Stamp size={24} />
            </div>
            <div>
              <h1 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-[#6b1c35]'}`}>
                Foliador de Documentos
              </h1>
              <p className={`text-xs font-semibold tracking-wider uppercase ${isDark ? 'text-[#b39656]' : 'text-[#b39656]'}`}>
                Control Oficial de Correspondencia y Estampado Digital
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Tab buttons */}
          <div className={`p-1 rounded-xl border flex items-center gap-1 ${cardBg}`}>
            <button
              onClick={() => setActiveTab('libro')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'libro'
                  ? 'bg-[#6b1c35] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText size={14} /> Libro de Folios
            </button>
            <button
              onClick={() => setActiveTab('estampador')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'estampador'
                  ? 'bg-[#581c2f] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Stamp size={14} /> Estampador
            </button>
          </div>

          {/* Indicador de conexión exitosa a Supabase (sin avisos de configuración) */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Supabase Conectado</span>
          </div>

          <button
            onClick={() => setIsNewFolioModalOpen(true)}
            className="bg-[#b39656] hover:bg-[#9c8247] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-[#b39656]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={16} /> Nuevo Folio
          </button>
        </div>
      </div>

      {/* ── STATS CARDS ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border ${cardBg} shadow-sm transition-all hover:shadow-md`}>
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total de Folios</span>
            <Layers size={16} className="text-[#b39656]" />
          </div>
          <p className={`text-2xl font-black ${textTitle}`}>{totalFolios}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Registrados en el sistema</span>
        </div>

        <div className={`p-4 rounded-2xl border ${cardBg} shadow-sm transition-all hover:shadow-md`}>
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">En Trámite</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600">{foliosEnTramite}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Pendientes de respuesta</span>
        </div>

        <div className={`p-4 rounded-2xl border ${cardBg} shadow-sm transition-all hover:shadow-md`}>
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Atendidos / Resueltos</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{foliosAtendidos}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Gestión concluida</span>
        </div>

        <div className={`p-4 rounded-2xl border ${cardBg} shadow-sm transition-all hover:shadow-md`}>
          <div className="flex justify-between items-center text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Urgentes</span>
            <AlertCircle size={16} className="text-red-500" />
          </div>
          <p className="text-2xl font-black text-red-600">{foliosUrgentes}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Atención prioritaria</span>
        </div>
      </div>

      {/* ── TAB 1: LIBRO DE FOLIOS ───────────────────────────────────────── */}
      {activeTab === 'libro' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className={`p-4 rounded-2xl border ${cardBg} shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center`}>
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por folio, asunto, remitente..."
                className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs font-medium border ${inputBg}`}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <select
                value={filterTipo}
                onChange={e => setFilterTipo(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border ${inputBg}`}
              >
                <option value="todos">Todos los Tipos</option>
                {TIPOS_DOCUMENTO.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <select
                value={filterEstatus}
                onChange={e => setFilterEstatus(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border ${inputBg}`}
              >
                <option value="todos">Todos los Estatus</option>
                <option value="registrado">Registrado</option>
                <option value="en_tramite">En Trámite</option>
                <option value="atendido">Atendido</option>
                <option value="archivado">Archivado</option>
                <option value="cancelado">Cancelado</option>
              </select>

              <select
                value={filterPrioridad}
                onChange={e => setFilterPrioridad(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border ${inputBg}`}
              >
                <option value="todos">Prioridad</option>
                <option value="normal">Normal</option>
                <option value="urgente">Urgente</option>
                <option value="muy_urgente">Muy Urgente</option>
                <option value="baja">Baja</option>
              </select>

              <button
                onClick={handleExportCSV}
                title="Exportar a CSV / Excel"
                className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors ${
                  isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Download size={14} />
                <span className="hidden sm:inline">CSV</span>
              </button>
            </div>
          </div>

          {/* Folios Table */}
          <div className={`rounded-2xl border ${cardBg} shadow-sm overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className={`border-b ${isDark ? 'border-slate-800 bg-slate-800/50' : 'border-slate-200 bg-[#f4f1ea]/60'}`}>
                  <tr>
                    <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Folio Oficial</th>
                    <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Tipo / Prioridad</th>
                    <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Asunto & Síntesis</th>
                    <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Remitente → Destinatario</th>
                    <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Fecha</th>
                    <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Estatus</th>
                    <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                  {filteredFolios.map(folio => {
                    const estatusInfo = ESTATUS_CONFIG[folio.estatus] || ESTATUS_CONFIG.registrado;
                    const prioridadInfo = PRIORIDAD_CONFIG[folio.prioridad] || PRIORIDAD_CONFIG.normal;

                    return (
                      <tr key={folio.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-[#f4f1ea]/40'}`}>
                        {/* Folio */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-[#6b1c35] dark:text-[#b39656] bg-[#6b1c35]/10 dark:bg-[#b39656]/15 px-2.5 py-1 rounded-lg border border-[#6b1c35]/20 dark:border-[#b39656]/30">
                              {folio.folio}
                            </span>
                            {folio.foliado_digital && (
                              <span title="Foliado digitalmente en PDF" className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                                <FileCheck size={13} />
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Tipo & Prioridad */}
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <span className="font-bold text-slate-700 dark:text-slate-200 block">{folio.tipo_documento}</span>
                            <span className={`text-[10px] block ${prioridadInfo.color}`}>
                              ● {prioridadInfo.label}
                            </span>
                          </div>
                        </td>

                        {/* Asunto */}
                        <td className="py-4 px-4 max-w-xs">
                          <p className={`font-semibold truncate ${textTitle}`} title={folio.asunto}>
                            {folio.asunto}
                          </p>
                          {folio.archivo_nombre && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                              <FileText size={11} /> {folio.archivo_nombre} ({folio.archivo_tamano || 'PDF'})
                            </span>
                          )}
                        </td>

                        {/* Remitente -> Destinatario */}
                        <td className="py-4 px-4">
                          <div className="space-y-0.5 text-[11px]">
                            <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                              <span className="text-slate-400 text-[10px]">De:</span> {folio.remitente}
                            </div>
                            <div className="flex items-center gap-1 text-slate-500 font-normal">
                              <span className="text-slate-400 text-[10px]">Para:</span> {folio.destinatario}
                            </div>
                          </div>
                        </td>

                        {/* Fecha */}
                        <td className="py-4 px-4 text-slate-500">
                          {new Date(folio.fecha_documento).toLocaleDateString('es-MX', {
                            day: '2-digit', month: 'short', year: 'numeric'
                          })}
                        </td>

                        {/* Estatus selector */}
                        <td className="py-4 px-4">
                          <select
                            value={folio.estatus}
                            onChange={e => handleUpdateEstatus(folio.id, e.target.value as any)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${estatusInfo.color}`}
                          >
                            <option value="registrado">Registrado</option>
                            <option value="en_tramite">En Trámite</option>
                            <option value="atendido">Atendido</option>
                            <option value="archivado">Archivado</option>
                            <option value="cancelado">Cancelado</option>
                          </select>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Ver / Previsualizar Documento Adjunto */}
                            <button
                              onClick={() => {
                                if (folio.archivo_url) {
                                  setSelectedPdfToView({
                                    folio: folio.folio,
                                    name: folio.archivo_nombre || 'documento_adjunto.pdf',
                                    url: folio.archivo_url
                                  });
                                } else {
                                  triggerToast(`Sin archivo adjunto para el folio ${folio.folio}`);
                                }
                              }}
                              title={folio.archivo_url ? "Ver / Descargar documento adjunto" : "Sin archivo adjunto"}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                folio.archivo_url
                                  ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                                  : 'text-slate-300 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                              }`}
                            >
                              <Eye size={15} />
                            </button>

                            {/* Estampar en PDF */}
                            <button
                              onClick={() => handleOpenInStamper(folio)}
                              title="Estampar este folio en un documento PDF"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#6b1c35] dark:hover:text-[#b39656] hover:bg-[#6b1c35]/10 transition-colors cursor-pointer"
                            >
                              <Stamp size={15} />
                            </button>

                            {/* Boleta Imprimible */}
                            <button
                              onClick={() => setSelectedFolioForPrint(folio)}
                              title="Generar boleta oficial de foliado / acuse"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <Printer size={15} />
                            </button>

                            {/* Eliminar */}
                            <button
                              onClick={() => setFolioToDelete(folio)}
                              title="Eliminar folio"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredFolios.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Stamp size={36} className="mx-auto mb-2 opacity-30 text-[#b39656]" />
                        <p className="font-bold text-sm">No se encontraron folios registrados</p>
                        <p className="text-xs mt-1">Haz clic en &quot;Nuevo Folio&quot; para registrar un documento oficial.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: ESTAMPADOR (EDITOR VISUAL MULTI-PDF Y DESCARGAS) ──────── */}
      {activeTab === 'estampador' && (
        <div className={`p-6 rounded-2xl border ${cardBg} shadow-sm`}>
          <FolioVisualEditor
            initialFolio={generateNextFolioNumber(prefijo)}
            availableFolios={folios.map(f => ({ id: f.id, folio: f.folio, tipo_documento: f.tipo_documento }))}
            isDark={isDark}
            onFolioSaved={(data) => {
              const folioItem: DocumentFolio = {
                id: `fol-${Date.now()}`,
                folio: data.folio,
                tipo_documento: 'Oficio',
                asunto: `Documento(s) sellado digitalmente con logotipo oficial (${data.archivos_procesados || 1} archivo(s))`,
                remitente: userName || 'Dirección PazSuma',
                destinatario: 'Padrón General',
                fecha_documento: new Date().toISOString(),
                estatus: 'registrado',
                prioridad: 'normal',
                archivo_nombre: data.archivo_nombre,
                foliado_digital: true,
                created_at: new Date().toISOString()
              };
              const updated = [folioItem, ...folios];
              setFolios(updated);
              persistFoliosLocally(updated);

              if (usingSupabase) {
                supabase.from('document_folios').insert([{
                  folio: folioItem.folio,
                  tipo_documento: folioItem.tipo_documento,
                  asunto: folioItem.asunto,
                  remitente: folioItem.remitente,
                  destinatario: folioItem.destinatario,
                  estatus: folioItem.estatus,
                  prioridad: folioItem.prioridad,
                  archivo_nombre: folioItem.archivo_nombre,
                  archivo_url: data.url || null,
                  foliado_digital: true,
                  creador_email: userEmail || 'operador@pazsuma.gob.mx'
                }]).then(({ error }) => {
                  if (error) console.warn('Supabase sync notice:', error.message);
                });
              }
            }}
          />
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: NUEVO FOLIO OFICIAL                                          */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {isNewFolioModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-xl rounded-3xl p-6 sm:p-8 shadow-2xl border ${cardBg} max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between items-center border-b pb-4 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#6b1c35] text-white">
                  <Stamp size={18} />
                </div>
                <div>
                  <h3 className={`text-lg font-black ${textTitle}`}>Registrar Nuevo Folio</h3>
                  <p className="text-xs text-slate-500">Asignación correlativa oficial de documento</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewFolioModalOpen(false)}
                className="text-slate-400 hover:text-red-500 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateFolio} className="space-y-4 mt-5">
              {/* Prefijo y Número de Folio */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-4">
                  <label className={`block text-xs font-bold uppercase mb-1 ${textMuted}`}>Prefijo:</label>
                  <select
                    value={prefijo}
                    onChange={e => {
                      setPrefijo(e.target.value);
                      setFolioNumber(generateNextFolioNumber(e.target.value));
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold border ${inputBg}`}
                  >
                    {PREFIJOS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                    <option value="CUSTOM">Personalizado...</option>
                  </select>
                </div>

                {prefijo === 'CUSTOM' && (
                  <div className="sm:col-span-3">
                    <label className={`block text-xs font-bold uppercase mb-1 ${textMuted}`}>Prefijo propio:</label>
                    <input
                      type="text"
                      value={customPrefijo}
                      onChange={e => setCustomPrefijo(e.target.value.toUpperCase())}
                      placeholder="MEMO"
                      className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold border ${inputBg}`}
                    />
                  </div>
                )}

                <div className={prefijo === 'CUSTOM' ? 'sm:col-span-5' : 'sm:col-span-8'}>
                  <label className={`block text-xs font-bold uppercase mb-1 ${textMuted}`}>Folio Oficial:</label>
                  <input
                    type="text"
                    value={folioNumber}
                    onChange={e => setFolioNumber(e.target.value.toUpperCase())}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-black text-[#6b1c35] dark:text-[#b39656] border ${inputBg}`}
                  />
                </div>
              </div>

              {/* Tipo y Prioridad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-bold uppercase mb-1 ${textMuted}`}>Tipo de Documento:</label>
                  <select
                    value={tipoDoc}
                    onChange={e => setTipoDoc(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-medium border ${inputBg}`}
                  >
                    {TIPOS_DOCUMENTO.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase mb-1 ${textMuted}`}>Nivel de Prioridad:</label>
                  <select
                    value={prioridad}
                    onChange={e => setPrioridad(e.target.value as any)}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-medium border ${inputBg}`}
                  >
                    <option value="normal">Normal</option>
                    <option value="urgente">Urgente</option>
                    <option value="muy_urgente">Muy Urgente</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>
              </div>

              {/* Asunto */}
              <div>
                <label className={`block text-xs font-bold uppercase mb-1 ${textMuted}`}>Asunto / Síntesis:</label>
                <input
                  type="text"
                  value={asunto}
                  onChange={e => setAsunto(e.target.value)}
                  placeholder="Ej. Solicitud de información presupuestal para el ejercicio 2026..."
                  required
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border ${inputBg}`}
                />
              </div>

              {/* Remitente y Destinatario */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-bold uppercase mb-1 ${textMuted}`}>Remitente / Área Emisora:</label>
                  <input
                    type="text"
                    value={remitente}
                    onChange={e => setRemitente(e.target.value)}
                    placeholder="Ej. Dirección de Obras Públicas"
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border ${inputBg}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase mb-1 ${textMuted}`}>Destinatario / Área Receptora:</label>
                  <input
                    type="text"
                    value={destinatario}
                    onChange={e => setDestinatario(e.target.value)}
                    placeholder="Ej. Secretaría de Finanzas"
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border ${inputBg}`}
                  />
                </div>
              </div>

              {/* Archivo Adjunto Opcional */}
              <div>
                <label className={`block text-xs font-bold uppercase mb-1 ${textMuted}`}>
                  Documento Adjunto (Opcional):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setAttachedFile(e.target.files[0]);
                      }
                    }}
                    className={`w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#6b1c35]/10 file:text-[#6b1c35] dark:file:bg-[#b39656]/20 dark:file:text-[#b39656] hover:file:bg-[#6b1c35]/20 cursor-pointer ${inputBg} p-1.5 rounded-xl border`}
                  />
                  {attachedFile && (
                    <button
                      type="button"
                      onClick={() => setAttachedFile(null)}
                      className="p-2 text-slate-400 hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className={`block text-xs font-bold uppercase mb-1 ${textMuted}`}>Notas / Observaciones:</label>
                <textarea
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  placeholder="Información adicional relevante..."
                  rows={2}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border ${inputBg}`}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewFolioModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#6b1c35] hover:bg-[#581c2f] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-[#6b1c35]/20 transition-all flex items-center gap-2"
                >
                  <Check size={16} /> Registrar Folio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: BOLETA OFICIAL IMPRIMIBLE / ACUSE DE RECIBO                    */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {selectedFolioForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-white text-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-200 max-h-[95vh] overflow-y-auto">
            {/* Header controls (hidden when printing) */}
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-slate-200 print:hidden">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <Printer size={16} className="text-[#6b1c35]" /> Vista Previa de Boleta Oficial
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-[#6b1c35] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow hover:bg-[#581c2f] transition-colors"
                >
                  <Printer size={14} /> Imprimir Acuse
                </button>
                <button
                  onClick={() => setSelectedFolioForPrint(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* PRINTABLE OFFICIAL SHEET */}
            <div id="boleta-impresion" className="space-y-6 border-2 border-slate-800 p-6 rounded-2xl bg-white font-sans text-xs">
              {/* Institution Title */}
              <div className="text-center border-b-2 border-slate-800 pb-4">
                <h2 className="text-xl font-black text-[#6b1c35] tracking-tight uppercase">
                  PazSuma — Sistema Institucional
                </h2>
                <p className="text-[10px] tracking-widest font-bold uppercase text-[#b39656] mt-0.5">
                  Control Oficial de Correspondencia y Gestión Documental
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  BOLETA Y CONSTANCIA DE FOLIADO OFICIAL
                </p>
              </div>

              {/* Big Folio Display */}
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Número de Folio:</span>
                  <span className="text-2xl font-mono font-black text-[#6b1c35]">
                    {selectedFolioForPrint.folio}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Fecha y Hora de Registro:</span>
                  <span className="font-bold text-slate-800">
                    {new Date(selectedFolioForPrint.fecha_documento).toLocaleString('es-MX')}
                  </span>
                </div>
              </div>

              {/* Detail fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Tipo de Documento:</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedFolioForPrint.tipo_documento}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Prioridad de Atención:</span>
                  <span className="font-bold text-slate-800 capitalize">{selectedFolioForPrint.prioridad}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Asunto / Síntesis:</span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedFolioForPrint.asunto}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Remitente / Área Emisora:</span>
                  <p className="font-bold text-slate-800">{selectedFolioForPrint.remitente}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Destinatario / Área Receptora:</span>
                  <p className="font-bold text-slate-800">{selectedFolioForPrint.destinatario}</p>
                </div>
              </div>

              {/* Simulated Barcode / QR */}
              <div className="border-t border-dashed border-slate-300 pt-4 flex justify-between items-center">
                <div>
                  <div className="h-9 w-48 bg-slate-900 flex items-center justify-center text-white font-mono text-[10px] tracking-[0.3em] font-bold">
                    ||| | || |||| | ||| ||
                  </div>
                  <span className="font-mono text-[9px] text-slate-400 mt-1 block">
                    {selectedFolioForPrint.folio} • ACUSE VALIDADOR
                  </span>
                </div>
                <div className="text-right text-[10px] text-slate-400">
                  <p>Operador: {userName || userEmail || 'Administrador'}</p>
                  <p>Registro Electrónico Oficial PazSuma</p>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-center text-[10px]">
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold uppercase text-slate-700">Firma y Sello de Quien Entrega</p>
                  <p className="text-slate-400 mt-0.5">{selectedFolioForPrint.remitente}</p>
                </div>
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold uppercase text-slate-700">Firma y Sello de Quien Recibe</p>
                  <p className="text-slate-400 mt-0.5">{selectedFolioForPrint.destinatario}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: VISOR DE DOCUMENTO PDF ADJUNTO EMBEBIDO                        */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {selectedPdfToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[88vh]">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-[#581c2f] text-white shrink-0">
                  <FileText size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="truncate max-w-xs sm:max-w-md">{selectedPdfToView.name}</span>
                    <span className="text-xs font-mono font-bold text-[#581c2f] dark:text-[#b39656] bg-[#581c2f]/10 dark:bg-[#b39656]/15 px-2 py-0.5 rounded-md shrink-0">
                      {selectedPdfToView.folio}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">Documento oficial adjunto almacenado en Supabase</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={selectedPdfToView.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition cursor-pointer"
                  title="Abrir en pestaña nueva del navegador"
                >
                  <ExternalLink size={14} />
                  <span className="hidden sm:inline">Pestaña nueva</span>
                </a>
                <a
                  href={selectedPdfToView.url}
                  download={selectedPdfToView.name}
                  className="px-3.5 py-1.5 rounded-xl bg-[#581c2f] text-white text-xs font-bold hover:bg-[#72223c] flex items-center gap-1.5 shadow transition cursor-pointer"
                  title="Descargar archivo PDF"
                >
                  <Download size={14} />
                  <span className="hidden sm:inline">Descargar</span>
                </a>
                <button
                  onClick={() => setSelectedPdfToView(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                  title="Cerrar visor"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 w-full rounded-2xl bg-slate-100 dark:bg-slate-950 overflow-hidden border border-slate-200 dark:border-slate-800">
              <iframe
                src={selectedPdfToView.url}
                title={selectedPdfToView.name}
                className="w-full h-full border-0 rounded-2xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TOAST FLOTANTE DE NOTIFICACIÓN                                        */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900 text-white px-4 py-3 text-xs font-semibold shadow-2xl animate-fade-in border border-slate-700">
          <AlertCircle size={16} className="text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 p-1 text-slate-400 hover:text-white rounded cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: CONFIRMAR ELIMINACIÓN                                         */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {folioToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl border ${cardBg} text-center space-y-4`}>
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 mx-auto flex items-center justify-center">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className={`text-base font-black ${textTitle}`}>¿Eliminar este folio?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Esta acción eliminará el folio <strong className="text-red-600">{folioToDelete.folio}</strong> del libro de folios.
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => setFolioToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteFolio}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors shadow cursor-pointer"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
