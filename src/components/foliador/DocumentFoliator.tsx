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

export default function DocumentFoliator({ userEmail, userName, isDark = false }: DocumentFoliatorProps) {
  const supabase = createSupabaseBrowserClient();

  // ── States ─────────────────────────────────────────────────────────────────
  const [folios, setFolios] = useState<DocumentFolio[]>([]);
  const [activeTab, setActiveTab] = useState<'libro' | 'estampador' | 'sql'>('libro');
  const [loading, setLoading] = useState(true);
  const [usingSupabase, setUsingSupabase] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTipo, setFilterTipo] = useState('todos');
  const [filterEstatus, setFilterEstatus] = useState('todos');
  const [filterPrioridad, setFilterPrioridad] = useState('todos');

  // Modals
  const [isNewFolioModalOpen, setIsNewFolioModalOpen] = useState(false);
  const [selectedFolioForPrint, setSelectedFolioForPrint] = useState<DocumentFolio | null>(null);
  const [folioToDelete, setFolioToDelete] = useState<DocumentFolio | null>(null);

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

  // PDF Stamper Tool States
  const [stamperFile, setStamperFile] = useState<File | null>(null);
  const [stamperFolio, setStamperFolio] = useState('');
  const [stamperPosition, setStamperPosition] = useState<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'>('top-right');
  const [stamperFormat, setStamperFormat] = useState<'boxed' | 'line' | 'simple'>('boxed');
  const [stamperColor, setStamperColor] = useState<'guinda' | 'dorado' | 'negro' | 'azul'>('guinda');
  const [stamperFontSize, setStamperFontSize] = useState<number>(9);
  const [stamperPageRange, setStamperPageRange] = useState<'all' | 'first' | 'custom'>('all');
  const [customPageRange, setCustomPageRange] = useState('');
  const [isStamping, setIsStamping] = useState(false);
  const [stampedSuccess, setStampedSuccess] = useState<string | null>(null);
  const [stampedPageCount, setStampedPageCount] = useState(0);

  const [copiedSql, setCopiedSql] = useState(false);

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
      foliado_digital: false,
      creador_email: userEmail || 'operador@pazsuma.gob.mx',
      created_at: new Date().toISOString()
    };

    // Try saving in Supabase
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

    // If a PDF file was attached, offer to jump directly to stamper
    if (attachedFile && attachedFile.type === 'application/pdf') {
      setStamperFile(attachedFile);
      setStamperFolio(newFolioItem.folio);
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
  const handleOpenInStamper = (folio: DocumentFolio) => {
    setStamperFolio(folio.folio);
    setActiveTab('estampador');
    setStampedSuccess(null);
  };

  // ── PDF STAMPING LOGIC (pdf-lib) ──────────────────────────────────────────
  const handleStampPDF = async () => {
    if (!stamperFile) {
      alert('Por favor selecciona un archivo PDF para foliar.');
      return;
    }
    if (!stamperFolio.trim()) {
      alert('Por favor especifica el número de folio a estampar.');
      return;
    }

    setIsStamping(true);
    setStampedSuccess(null);

    try {
      const fileBytes = await stamperFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBytes);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const helveticaRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const totalPages = pdfDoc.getPageCount();

      // Determine pages to stamp
      let pageIndicesToStamp: number[] = [];
      if (stamperPageRange === 'all') {
        pageIndicesToStamp = Array.from({ length: totalPages }, (_, i) => i);
      } else if (stamperPageRange === 'first') {
        pageIndicesToStamp = [0];
      } else if (stamperPageRange === 'custom') {
        const parts = customPageRange.split(',');
        parts.forEach(part => {
          if (part.includes('-')) {
            const [start, end] = part.split('-').map(p => parseInt(p.trim(), 10));
            if (!isNaN(start) && !isNaN(end)) {
              for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
                pageIndicesToStamp.push(i - 1);
              }
            }
          } else {
            const pageNum = parseInt(part.trim(), 10);
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
              pageIndicesToStamp.push(pageNum - 1);
            }
          }
        });
      }

      if (pageIndicesToStamp.length === 0) {
        pageIndicesToStamp = Array.from({ length: totalPages }, (_, i) => i);
      }

      // Color mapping
      let textColor = rgb(0.42, 0.11, 0.21); // Guinda institucional #6b1c35
      let borderColor = rgb(0.42, 0.11, 0.21);
      let bgColor = rgb(0.98, 0.96, 0.94);

      if (stamperColor === 'dorado') {
        textColor = rgb(0.70, 0.59, 0.34); // Dorado #b39656
        borderColor = rgb(0.70, 0.59, 0.34);
        bgColor = rgb(0.98, 0.97, 0.94);
      } else if (stamperColor === 'negro') {
        textColor = rgb(0.07, 0.09, 0.15); // Negro pizarra
        borderColor = rgb(0.2, 0.2, 0.2);
        bgColor = rgb(0.96, 0.96, 0.96);
      } else if (stamperColor === 'azul') {
        textColor = rgb(0.11, 0.31, 0.85); // Azul registro
        borderColor = rgb(0.11, 0.31, 0.85);
        bgColor = rgb(0.94, 0.96, 1.0);
      }

      const currentDateFormatted = new Date().toLocaleDateString('es-MX', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });

      // Stamp each target page
      for (const idx of pageIndicesToStamp) {
        const page = pdfDoc.getPage(idx);
        const { width, height } = page.getSize();
        const pageNum = idx + 1;

        if (stamperFormat === 'boxed') {
          // Complete Institutional Seal Box
          const boxWidth = 175;
          const boxHeight = 44;
          let x = width - boxWidth - 25;
          let y = height - boxHeight - 20;

          if (stamperPosition === 'top-left') {
            x = 25;
            y = height - boxHeight - 20;
          } else if (stamperPosition === 'top-center') {
            x = (width - boxWidth) / 2;
            y = height - boxHeight - 20;
          } else if (stamperPosition === 'bottom-right') {
            x = width - boxWidth - 25;
            y = 20;
          } else if (stamperPosition === 'bottom-left') {
            x = 25;
            y = 20;
          } else if (stamperPosition === 'bottom-center') {
            x = (width - boxWidth) / 2;
            y = 20;
          }

          // Draw Box
          page.drawRectangle({
            x,
            y,
            width: boxWidth,
            height: boxHeight,
            borderColor,
            borderWidth: 1.2,
            color: bgColor,
            opacity: 0.95
          });

          // Top label
          page.drawText('PAZSUMA — SISTEMA INSTITUCIONAL', {
            x: x + 8,
            y: y + boxHeight - 12,
            size: 6.5,
            font: helveticaBold,
            color: textColor
          });

          // Folio number
          page.drawText(`FOLIO: ${stamperFolio}`, {
            x: x + 8,
            y: y + boxHeight - 24,
            size: stamperFontSize,
            font: helveticaBold,
            color: textColor
          });

          // Date and Page count
          page.drawText(`FECHA: ${currentDateFormatted}  |  PÁG. ${pageNum}/${totalPages}`, {
            x: x + 8,
            y: y + 7,
            size: 6.5,
            font: helveticaRegular,
            color: rgb(0.3, 0.3, 0.3)
          });

        } else if (stamperFormat === 'line') {
          // Line format
          const lineText = `FOLIO: ${stamperFolio}  •  FECHA: ${currentDateFormatted}  •  PÁG. ${pageNum} DE ${totalPages}`;
          const textWidth = helveticaBold.widthOfTextAtSize(lineText, stamperFontSize);
          let x = width - textWidth - 30;
          let y = height - 28;

          if (stamperPosition === 'top-left') x = 30;
          if (stamperPosition === 'top-center') x = (width - textWidth) / 2;
          if (stamperPosition === 'bottom-right') { x = width - textWidth - 30; y = 25; }
          if (stamperPosition === 'bottom-left') { x = 30; y = 25; }
          if (stamperPosition === 'bottom-center') { x = (width - textWidth) / 2; y = 25; }

          page.drawText(lineText, {
            x,
            y,
            size: stamperFontSize,
            font: helveticaBold,
            color: textColor
          });

        } else {
          // Simple folio only
          const text = `${stamperFolio} (Pág. ${pageNum}/${totalPages})`;
          const textWidth = helveticaBold.widthOfTextAtSize(text, stamperFontSize);
          let x = width - textWidth - 30;
          let y = height - 28;

          if (stamperPosition === 'top-left') x = 30;
          if (stamperPosition === 'top-center') x = (width - textWidth) / 2;
          if (stamperPosition === 'bottom-right') { x = width - textWidth - 30; y = 25; }
          if (stamperPosition === 'bottom-left') { x = 30; y = 25; }
          if (stamperPosition === 'bottom-center') { x = (width - textWidth) / 2; y = 25; }

          page.drawText(text, {
            x,
            y,
            size: stamperFontSize,
            font: helveticaBold,
            color: textColor
          });
        }
      }

      // Save modified PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);

      // Trigger download
      const cleanFileName = stamperFile.name.replace(/\.pdf$/i, '');
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = `${stamperFolio}_FOLIADO_${cleanFileName}.pdf`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      // Update folio record if matching
      const targetFolio = folios.find(f => f.folio.toLowerCase() === stamperFolio.trim().toLowerCase());
      if (targetFolio) {
        const updated = folios.map(f => f.id === targetFolio.id ? { ...f, foliado_digital: true } : f);
        setFolios(updated);
        persistFoliosLocally(updated);

        if (usingSupabase) {
          try {
            await supabase.from('document_folios').update({ foliado_digital: true }).eq('id', targetFolio.id);
          } catch (err) {
            console.warn(err);
          }
        }
      }

      setStampedPageCount(pageIndicesToStamp.length);
      setStampedSuccess(`¡Documento foliado exitosamente! Se procesaron ${pageIndicesToStamp.length} página(s) y el archivo fue descargado.`);

    } catch (err: any) {
      console.error('Error al estampar PDF:', err);
      alert('Error al procesar el PDF: ' + err.message);
    } finally {
      setIsStamping(false);
    }
  };

  // ── SQL Script text for manual setup in Supabase ──────────────────────────
  const SQL_SCRIPT = `-- Pegar en el SQL Editor de tu Dashboard Supabase:
CREATE TABLE IF NOT EXISTS public.document_folios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  folio text NOT NULL UNIQUE,
  tipo_documento text NOT NULL DEFAULT 'Oficio',
  asunto text NOT NULL,
  remitente text NOT NULL,
  destinatario text NOT NULL,
  fecha_documento timestamp with time zone DEFAULT now(),
  estatus text NOT NULL DEFAULT 'registrado',
  prioridad text NOT NULL DEFAULT 'normal',
  archivo_nombre text,
  archivo_tamano text,
  notas text,
  foliado_digital boolean DEFAULT false,
  creador_email text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.document_folios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "folios_all" ON public.document_folios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "folios_anon_read" ON public.document_folios FOR SELECT TO anon USING (true);`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(SQL_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
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

        <div className="flex items-center gap-2">
          {/* Tab buttons */}
          <div className={`p-1 rounded-xl border flex items-center gap-1 ${cardBg}`}>
            <button
              onClick={() => setActiveTab('libro')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'libro'
                  ? 'bg-[#6b1c35] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText size={14} /> Libro de Folios
            </button>
            <button
              onClick={() => setActiveTab('estampador')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'estampador'
                  ? 'bg-[#6b1c35] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Stamp size={14} /> Estampador PDF
            </button>
            <button
              onClick={() => setActiveTab('sql')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'sql'
                  ? 'bg-[#6b1c35] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FolderLock size={14} /> Base de Datos
            </button>
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
                            {/* Estampar en PDF */}
                            <button
                              onClick={() => handleOpenInStamper(folio)}
                              title="Estampar este folio en un documento PDF"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#6b1c35] dark:hover:text-[#b39656] hover:bg-[#6b1c35]/10 transition-colors"
                            >
                              <Stamp size={15} />
                            </button>

                            {/* Boleta Imprimible */}
                            <button
                              onClick={() => setSelectedFolioForPrint(folio)}
                              title="Generar boleta oficial de foliado / acuse"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Printer size={15} />
                            </button>

                            {/* Eliminar */}
                            <button
                              onClick={() => setFolioToDelete(folio)}
                              title="Eliminar folio"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
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

      {/* ── TAB 2: ESTAMPADOR DIGITAL DE PDF ─────────────────────────────── */}
      {activeTab === 'estampador' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Form */}
          <div className={`lg:col-span-7 p-6 rounded-2xl border ${cardBg} shadow-sm space-y-5`}>
            <div className="border-b pb-3 border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className={`text-base font-extrabold ${textTitle}`}>
                  Estampado y Foliado Digital de PDF
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inserta de forma indeleble el número de folio, fecha y membrete oficial en cada página.
                </p>
              </div>
              <Stamp size={20} className="text-[#6b1c35] dark:text-[#b39656]" />
            </div>

            {/* 1. Upload PDF */}
            <div>
              <label className={`block text-xs font-bold uppercase mb-2 ${textMuted}`}>
                1. Selecciona el archivo PDF a foliar:
              </label>
              <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-[#6b1c35] dark:hover:border-[#b39656] transition-colors bg-slate-50/50 dark:bg-slate-800/30">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setStamperFile(e.target.files[0]);
                      setStampedSuccess(null);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload size={32} className="mx-auto mb-2 text-slate-400" />
                {stamperFile ? (
                  <div>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      ✓ {stamperFile.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {(stamperFile.size / 1024 / 1024).toFixed(2)} MB • Haz clic para cambiar de archivo
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Arrastra tu PDF aquí o haz clic para seleccionarlo
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Formatos soportados: Documentos PDF (sin límite de páginas)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Folio To Stamp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-bold uppercase mb-1.5 ${textMuted}`}>
                  2. Número de Folio a Estampar:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={stamperFolio}
                    onChange={e => setStamperFolio(e.target.value.toUpperCase())}
                    placeholder="Ej. FOL-2026-0001"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold border ${inputBg}`}
                  />
                  {/* Shortcut to select from existing */}
                  {folios.length > 0 && (
                    <select
                      onChange={e => {
                        if (e.target.value) setStamperFolio(e.target.value);
                      }}
                      className={`px-2 py-2 rounded-xl text-xs border ${inputBg}`}
                      title="Seleccionar de los folios registrados"
                    >
                      <option value="">Cargar...</option>
                      {folios.slice(0, 10).map(f => (
                        <option key={f.id} value={f.folio}>{f.folio} ({f.tipo_documento})</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Position */}
              <div>
                <label className={`block text-xs font-bold uppercase mb-1.5 ${textMuted}`}>
                  3. Posición del Sello:
                </label>
                <select
                  value={stamperPosition}
                  onChange={e => setStamperPosition(e.target.value as any)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border ${inputBg}`}
                >
                  <option value="top-right">Superior Derecha (Estándar de Oficios)</option>
                  <option value="top-left">Superior Izquierda</option>
                  <option value="top-center">Encabezado Central</option>
                  <option value="bottom-right">Inferior Derecha</option>
                  <option value="bottom-left">Inferior Izquierda</option>
                  <option value="bottom-center">Pie de Página Central</option>
                </select>
              </div>
            </div>

            {/* 3. Style Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={`block text-xs font-bold uppercase mb-1.5 ${textMuted}`}>
                  Formato de Sello:
                </label>
                <select
                  value={stamperFormat}
                  onChange={e => setStamperFormat(e.target.value as any)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-medium border ${inputBg}`}
                >
                  <option value="boxed">Sello Institucional Completo</option>
                  <option value="line">Línea Ejecutiva de Folio</option>
                  <option value="simple">Folio Simple</option>
                </select>
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase mb-1.5 ${textMuted}`}>
                  Color de Tinta:
                </label>
                <select
                  value={stamperColor}
                  onChange={e => setStamperColor(e.target.value as any)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-medium border ${inputBg}`}
                >
                  <option value="guinda">Guinda Institucional</option>
                  <option value="dorado">Dorado Oficial</option>
                  <option value="negro">Negro Documental</option>
                  <option value="azul">Azul Registro</option>
                </select>
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase mb-1.5 ${textMuted}`}>
                  Páginas a Foliar:
                </label>
                <select
                  value={stamperPageRange}
                  onChange={e => setStamperPageRange(e.target.value as any)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-medium border ${inputBg}`}
                >
                  <option value="all">Todas las páginas</option>
                  <option value="first">Solo la primera página</option>
                  <option value="custom">Rango específico...</option>
                </select>
              </div>
            </div>

            {stamperPageRange === 'custom' && (
              <div className="animate-fade-in">
                <label className={`block text-xs font-bold uppercase mb-1 ${textMuted}`}>
                  Especifica las páginas (ej. 1-3, 5):
                </label>
                <input
                  type="text"
                  value={customPageRange}
                  onChange={e => setCustomPageRange(e.target.value)}
                  placeholder="1-3, 5, 8"
                  className={`w-full px-3 py-2 rounded-xl text-xs border ${inputBg}`}
                />
              </div>
            )}

            {/* Action button */}
            <div className="pt-2">
              <button
                onClick={handleStampPDF}
                disabled={!stamperFile || !stamperFolio.trim() || isStamping}
                className="w-full bg-gradient-to-r from-[#6b1c35] to-[#581c2f] hover:from-[#581c2f] hover:to-[#401321] text-white py-3.5 px-6 rounded-xl font-bold text-sm shadow-lg shadow-[#6b1c35]/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isStamping ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" /> Procesando y Estampando PDF...
                  </>
                ) : (
                  <>
                    <Stamp size={18} /> Estampar Folio y Descargar PDF Foliado
                  </>
                )}
              </button>
            </div>

            {stampedSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-start gap-2.5 animate-fade-in">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">¡Foliado Exitoso!</p>
                  <p className="mt-0.5">{stampedSuccess}</p>
                </div>
              </div>
            )}
          </div>

          {/* Preview Explanation Card */}
          <div className={`lg:col-span-5 p-6 rounded-2xl border ${cardBg} shadow-sm space-y-4`}>
            <h4 className={`text-sm font-black uppercase tracking-wider ${textTitle}`}>
              Muestra Visual del Sello
            </h4>
            <p className="text-xs text-slate-500">
              Así es como se estampará el sello en el encabezado de tu documento:
            </p>

            {/* Visual simulation of the seal */}
            <div className="p-6 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center min-h-[180px]">
              {stamperFormat === 'boxed' ? (
                <div
                  className={`p-3.5 rounded-lg border text-left shadow-sm max-w-xs ${
                    stamperColor === 'guinda'
                      ? 'border-[#6b1c35] bg-[#6b1c35]/5 text-[#6b1c35]'
                      : stamperColor === 'dorado'
                      ? 'border-[#b39656] bg-[#b39656]/5 text-[#b39656]'
                      : stamperColor === 'azul'
                      ? 'border-blue-600 bg-blue-50 text-blue-800'
                      : 'border-slate-900 bg-slate-100 text-slate-900 dark:border-white dark:bg-slate-800 dark:text-white'
                  }`}
                >
                  <p className="text-[9px] font-black uppercase tracking-wider">
                    PAZSUMA — SISTEMA INSTITUCIONAL
                  </p>
                  <p className="text-sm font-mono font-black mt-1">
                    FOLIO: {stamperFolio || 'FOL-2026-0001'}
                  </p>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-1">
                    FECHA: {new Date().toLocaleDateString('es-MX')} | PÁG. 1 DE N
                  </p>
                </div>
              ) : (
                <div className="text-center font-mono font-bold text-xs p-3 rounded bg-white dark:bg-slate-800 border">
                  FOLIO: {stamperFolio || 'FOL-2026-0001'} • PÁG. 1 DE N
                </div>
              )}
            </div>

            <div className="space-y-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-500" />
                <span>100% procesado en el navegador (seguro y confidencial).</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-500" />
                <span>No altera el contenido original ni los textos del documento.</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-emerald-500" />
                <span>Conteo exacto y dinámico de páginas ("Pág. 1 de 5", etc.).</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: BASE DE DATOS Y SINCRONIZACIÓN ─────────────────────────── */}
      {activeTab === 'sql' && (
        <div className={`p-6 rounded-2xl border ${cardBg} shadow-sm space-y-6`}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className={`text-lg font-black ${textTitle}`}>
                Estado de la Base de Datos y Supabase
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                El foliador cuenta con respaldo local continuo en el navegador y sincronización nativa en Supabase Cloud.
              </p>
            </div>
            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
              usingSupabase
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
            }`}>
              <div className={`w-2 h-2 rounded-full ${usingSupabase ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {usingSupabase ? 'Conectado a Supabase Cloud' : 'Almacenamiento Local Activo (Fallback)'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              ¿Cómo activar la persistencia en la nube en Supabase?
            </h4>
            <p className="text-xs text-slate-500">
              Si la tabla <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[11px]">public.document_folios</code> aún no está creada en tu proyecto de Supabase, copia el siguiente script SQL y ejecútalo en el <strong>SQL Editor</strong> de tu panel de Supabase:
            </p>
          </div>

          <div className="relative">
            <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto border border-slate-800 max-h-72">
              {SQL_SCRIPT}
            </pre>
            <button
              onClick={copySqlToClipboard}
              className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              {copiedSql ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              {copiedSql ? 'Copiado' : 'Copiar SQL'}
            </button>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={loadFolios}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              <RefreshCw size={14} /> Reintentar Conexión con Supabase
            </button>
            <p className="text-[11px] text-slate-400">
              Archivo guardado en: <span className="font-mono">supabase/foliador_schema.sql</span>
            </p>
          </div>
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
            <div className="space-y-6 border-2 border-slate-800 p-6 rounded-2xl bg-white font-sans text-xs">
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
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteFolio}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors shadow"
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
