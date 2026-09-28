'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud, Stamp, Download, Image as ImageIcon, Check,
  Sparkles, RefreshCw, Eye, Sliders, Palette, Calendar,
  FileText, ShieldCheck, CheckCircle2, AlertCircle, X, Trash2,
  Layers, FileCheck, Archive, Hash, FolderDown, Plus, Info,
  ChevronRight, ArrowRight, ExternalLink, RotateCw, Type,
  Bold, Lock, Unlock, Grid, Square
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import PositionMatrix3x3, { MatrixPosition } from './PositionMatrix3x3';
import FolioPreviewCanvas, { ActiveElement } from './FolioPreviewCanvas';
import {
  FolioConfig,
  OperadoStampConfig,
  LogoStampConfig,
  PageRangeConfig,
  DocumentStampSettings,
  stampSinglePdf,
  uploadStampedPdfToSupabase,
  formatOfficialStampDate,
  generateFolioString
} from './stampEngine';

export interface ProcessedPdfItem {
  id: string;
  file: File;
  name: string;
  sizeFormatted: string;
  bytes: ArrayBuffer;
  pageCount: number;
  status: 'listo' | 'procesando' | 'completado' | 'error';
  errorMessage?: string;
  stampedBlob?: Blob;
  stampedDocUrl?: string;
  stampedFileName?: string;
  supabasePublicUrl?: string | null;
}

interface FolioVisualEditorProps {
  initialFolio?: string;
  availableFolios?: Array<{ id: string; folio: string; tipo_documento: string }>;
  onFolioSaved?: (folioData: {
    folio: string;
    fecha: string;
    archivo_nombre: string;
    url?: string;
    archivos_procesados?: number;
  }) => void;
  onClose?: () => void;
  isDark?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const COLOR_PRESETS = [
  { id: 'negro',  label: 'Negro Tinta',        hex: '#111827' },
  { id: 'rojo',   label: 'Rojo Tinta',         hex: '#dc2626' },
  { id: 'azul',   label: 'Azul Institucional',  hex: '#003399' },
  { id: 'guinda', label: 'Vino PazSuma',       hex: '#581c2f' },
  { id: 'dorado', label: 'Dorado Oficial',      hex: '#b39656' }
];

export default function FolioVisualEditor({
  initialFolio = 'FOL-2026-0001',
  availableFolios = [],
  onFolioSaved,
  onClose,
  isDark = false
}: FolioVisualEditorProps) {
  const supabase = createSupabaseBrowserClient();

  // ── ESTADOS DE ARCHIVOS ──────────────────────────────────────────────────
  const [pdfFiles, setPdfFiles] = useState<ProcessedPdfItem[]>([]);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number>(0);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── PESTAÑA ACTIVA EN PANEL DE PARÁMETROS ────────────────────────────────
  const [activeTab, setActiveTab] = useState<'folio' | 'operado' | 'logo' | 'paginas'>('folio');
  const [activeCanvasElement, setActiveCanvasElement] = useState<ActiveElement>('folio');

  // ── ORIENTACIÓN DE LIENZO ────────────────────────────────────────────────
  const [canvasOrientation, setCanvasOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // ── 1. CONFIGURACIÓN DE TEXTO / FOLIO ─────────────────────────────────────
  const [folioConfig, setFolioConfig] = useState<FolioConfig>({
    enabled: true,
    formatPreset: 'numeric',
    prefix: '',
    suffix: '',
    startNumber: 1,
    increment: 1,
    padLength: 3,
    fontChoice: 'Helvetica',
    isBold: false,
    fontSize: 14,
    colorHex: '#111827',
    opacity: 100,
    style: 'text-only',
    showBorder: false,
    institutionHeader: 'PAZSUMA • GESTIÓN INSTITUCIONAL',
    showMetadata: false,
    positionMatrix: 'tr',
    normX: 0.95,
    normY: 0.05,
    offsetX: 0,
    offsetY: 0,
    pageScope: 'all',
    rangeFrom: 1,
    rangeTo: 1,
    customPages: ''
  });

  // ── 2. CONFIGURACIÓN DEL SELLO OFICIAL "OPERADO" DE TRES NIVELES ─────────
  const [operadoConfig, setOperadoConfig] = useState<OperadoStampConfig>({
    enabled: true,
    showBorder: true,
    operadoWord: 'OPERADO',
    institutionLine1: 'H. AYUNTAMIENTO',
    institutionLine2: 'DE LA PAZ',
    institutionLine3: '2024 - 2027',
    shieldImageUrl: null,
    shieldBytes: null,
    stampDateIso: new Date().toISOString().slice(0, 10), // Fecha actual YYYY-MM-DD
    colorHex: '#003399', // Azul marino/tinta estilo sello físico
    dateColorHex: '#E62B4A', // Rojo tinta claro/vivo estilo fechador manual
    opacity: 88, // Efecto tinta físicamente realista (aprox. 85%-90%)
    isUnderlay: false, // Capa semi-translúcida no bloqueante
    width: 210,
    height: 105,
    positionMatrix: 'mc',
    normX: 0.50,
    normY: 0.50,
    offsetX: 0,
    offsetY: 0
  });
  const shieldInputRef = useRef<HTMLInputElement>(null);

  // ── 3. CONFIGURACIÓN DE IMAGEN / LOGOTIPO PNG ────────────────────────────
  const [logoConfig, setLogoConfig] = useState<LogoStampConfig>({
    enabled: false,
    fileBytes: null,
    fileType: 'image/png',
    width: 60,
    height: 60,
    rotationAngle: 0,
    opacity: 90,
    positionMatrix: 'tl',
    normX: 0.05,
    normY: 0.05,
    offsetX: 0,
    offsetY: 0
  });
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [aspectRatioLocked, setAspectRatioLocked] = useState(true);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // ── 4. RANGO DE PÁGINAS Y NÚMERO ASCENDENTE ──────────────────────────────
  const [pageRangeConfig, setPageRangeConfig] = useState<PageRangeConfig>({
    mode: 'all',
    rangeFrom: 1,
    rangeTo: 10,
    customPages: '1'
  });
  const [numberingScope, setNumberingScope] = useState<'per-document' | 'per-page'>('per-document');

  // ── 5. ESTADOS DE PROCESAMIENTO Y PERSISTENCIA ───────────────────────────
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatusText, setProcessingStatusText] = useState('');
  const [overallSuccessMessage, setOverallSuccessMessage] = useState<string>('');
  const [isZipping, setIsZipping] = useState(false);

  // Sincronizar initialFolio si cambia (extrayendo únicamente el número para foleo numérico puro)
  useEffect(() => {
    if (initialFolio) {
      const match = initialFolio.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        setFolioConfig(prev => ({
          ...prev,
          prefix: '',
          suffix: '',
          startNumber: isNaN(num) ? 1 : num,
          padLength: match[1].length
        }));
      }
    }
  }, [initialFolio]);

  // Documento activo para la vista previa
  const activePreviewFile = pdfFiles[selectedPreviewIndex] || null;

  // Detección automática de orientación cuando se carga un PDF
  useEffect(() => {
    if (activePreviewFile) {
      PDFDocument.load(activePreviewFile.bytes, { ignoreEncryption: true })
        .then(doc => {
          if (doc.getPageCount() > 0) {
            const page = doc.getPage(0);
            const { width, height } = page.getSize();
            setCanvasOrientation(width > height ? 'landscape' : 'portrait');
            setPageRangeConfig(prev => ({
              ...prev,
              rangeTo: Math.max(prev.rangeTo, doc.getPageCount())
            }));
          }
        })
        .catch(err => console.warn('No se pudo verificar orientación:', err));
    }
  }, [activePreviewFile]);

  // Sincronizar selección de canvas con pestaña del panel
  const handleSelectElementOnCanvas = (elem: ActiveElement) => {
    setActiveCanvasElement(elem);
    setActiveTab(elem === 'folio' ? 'folio' : elem === 'operado' ? 'operado' : 'logo');
  };

  // ── CARGA DE ARCHIVOS PDF ────────────────────────────────────────────────
  const handleAddPdfFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validPdfFiles = fileArray.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));

    if (validPdfFiles.length === 0) {
      alert('Por favor selecciona archivos en formato PDF.');
      return;
    }

    const newItems: ProcessedPdfItem[] = [];

    for (const file of validPdfFiles) {
      const isDuplicate = pdfFiles.some(existing => existing.name === file.name && existing.file.size === file.size);
      if (isDuplicate) continue;

      try {
        const buffer = await file.arrayBuffer();
        let pageCount = 1;
        try {
          const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
          pageCount = doc.getPageCount();
        } catch (err) {
          console.warn(`No se pudo leer el conteo de páginas de ${file.name}:`, err);
        }

        newItems.push({
          id: `pdf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          file,
          name: file.name,
          sizeFormatted: formatBytes(file.size),
          bytes: buffer,
          pageCount,
          status: 'listo'
        });
      } catch (err) {
        console.error(`Error al cargar el archivo ${file.name}:`, err);
      }
    }

    if (newItems.length > 0) {
      setPdfFiles(prev => [...prev, ...newItems]);
      setOverallSuccessMessage('');
    }
  };

  const handleRemovePdfFile = (idToRemove: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPdfFiles(prev => {
      const indexToRemove = prev.findIndex(f => f.id === idToRemove);
      const updated = prev.filter(f => f.id !== idToRemove);
      const target = prev[indexToRemove];
      if (target?.stampedDocUrl) {
        URL.revokeObjectURL(target.stampedDocUrl);
      }
      if (selectedPreviewIndex >= updated.length) {
        setSelectedPreviewIndex(Math.max(0, updated.length - 1));
      }
      return updated;
    });
  };

  const handleClearAllFiles = () => {
    pdfFiles.forEach(f => {
      if (f.stampedDocUrl) URL.revokeObjectURL(f.stampedDocUrl);
    });
    setPdfFiles([]);
    setSelectedPreviewIndex(0);
    setOverallSuccessMessage('');
  };

  // ── SUBIDA DE LOGOTIPO PNG ────────────────────────────────────────────────
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('png') && !file.type.includes('image/')) {
      alert('Se recomienda subir una imagen en formato PNG con fondo transparente.');
    }

    const previewUrl = URL.createObjectURL(file);
    setLogoPreviewUrl(previewUrl);

    const buffer = await file.arrayBuffer();
    setLogoConfig(prev => ({
      ...prev,
      enabled: true,
      fileBytes: buffer,
      fileType: file.type
    }));
  };

  const handleRemoveLogo = () => {
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoPreviewUrl(null);
    setLogoConfig(prev => ({
      ...prev,
      enabled: false,
      fileBytes: null
    }));
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  // ── SUBIDA DE ESCUDO INSTITUCIONAL (PNG TRANSPARENTE) PARA SELLO OPERADO ──
  const handleShieldUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    const buffer = await file.arrayBuffer();
    setOperadoConfig(prev => ({
      ...prev,
      shieldBytes: buffer,
      shieldImageUrl: previewUrl
    }));
  };

  const handleRemoveShield = () => {
    if (operadoConfig.shieldImageUrl) URL.revokeObjectURL(operadoConfig.shieldImageUrl);
    setOperadoConfig(prev => ({
      ...prev,
      shieldBytes: null,
      shieldImageUrl: null
    }));
    if (shieldInputRef.current) shieldInputRef.current.value = '';
  };

  // ── PROCESAMIENTO GENERAL DE ESTAMPADO CON PERSISTENCIA ────────────────────
  const handleProcessAllDocuments = async () => {
    if (pdfFiles.length === 0) {
      alert('Por favor añade al menos un archivo PDF para estampar.');
      return;
    }

    if (!folioConfig.enabled && !operadoConfig.enabled && !logoConfig.enabled) {
      alert('Por favor activa al menos uno de los sellos (Folio de Texto, Sello OPERADO o Logotipo).');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingStatusText('Preparando documentos...');
    setOverallSuccessMessage('');

    const updatedFiles: ProcessedPdfItem[] = [...pdfFiles];
    let cumulativePageCount = 0;

    const stampSettings: DocumentStampSettings = {
      folio: folioConfig,
      operado: operadoConfig,
      logo: logoConfig,
      pageRange: pageRangeConfig,
      numberingScope
    };

    try {
      for (let i = 0; i < updatedFiles.length; i++) {
        const item = updatedFiles[i];
        item.status = 'procesando';
        setPdfFiles([...updatedFiles]);
        setProcessingProgress(Math.round(((i + 0.2) / updatedFiles.length) * 100));
        setProcessingStatusText(`Estampando documento ${i + 1} de ${updatedFiles.length}: ${item.name}...`);

        try {
          const currentFolioStr = generateFolioString(
            numberingScope === 'per-page' ? cumulativePageCount : i,
            folioConfig
          );

          // 1. Estampar con pdf-lib usando el motor avanzado
          const { modifiedBytes, pagesStamped } = await stampSinglePdf(
            item.bytes,
            stampSettings,
            i,
            cumulativePageCount
          );

          cumulativePageCount += pagesStamped;

          const stampedBlob = new Blob([modifiedBytes as unknown as BlobPart], {
            type: 'application/pdf'
          });
          const stampedDocUrl = URL.createObjectURL(stampedBlob);
          const stampedFileName = `${currentFolioStr}_${item.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

          // 2. Subir resultado a Supabase Storage (bucket 'documentos_folios')
          setProcessingStatusText(`Subiendo a Supabase Storage (${item.name})...`);
          const { publicUrl } = await uploadStampedPdfToSupabase(
            modifiedBytes,
            stampedFileName,
            currentFolioStr,
            supabase
          );

          item.status = 'completado';
          item.stampedBlob = stampedBlob;
          item.stampedDocUrl = stampedDocUrl;
          item.stampedFileName = stampedFileName;
          item.supabasePublicUrl = publicUrl;
        } catch (fileErr: any) {
          console.error(`Error al procesar ${item.name}:`, fileErr);
          item.status = 'error';
          item.errorMessage = fileErr.message || 'Error al estampar';
        }

        setPdfFiles([...updatedFiles]);
        setProcessingProgress(Math.round(((i + 1) / updatedFiles.length) * 100));
      }

      const completedCount = updatedFiles.filter(f => f.status === 'completado').length;
      setOverallSuccessMessage(
        `¡${completedCount} documento(s) estampados exitosamente y sincronizados con Supabase Storage!`
      );

      // Notificar al componente padre para registrar en el Libro de Folios
      if (onFolioSaved && completedCount > 0) {
        const firstCompleted = updatedFiles.find(f => f.status === 'completado');
        const firstFolioStr = generateFolioString(0, folioConfig);
        onFolioSaved({
          folio: firstFolioStr,
          fecha: formatOfficialStampDate(operadoConfig.stampDateIso) || new Date().toISOString(),
          archivo_nombre: firstCompleted?.stampedFileName || 'documentos_estampados.pdf',
          url: firstCompleted?.supabasePublicUrl || firstCompleted?.stampedDocUrl,
          archivos_procesados: completedCount
        });
      }
    } catch (err: any) {
      console.error('Error general durante el estampado:', err);
      alert('Ocurrió un problema durante el procesamiento: ' + err.message);
    } finally {
      setIsProcessing(false);
      setProcessingStatusText('');
    }
  };

  // ── DESCARGA DE TODOS EN ZIP ─────────────────────────────────────────────
  const handleDownloadAllAsZip = async () => {
    const completed = pdfFiles.filter(f => f.status === 'completado' && f.stampedBlob);
    if (completed.length === 0) {
      alert('No hay documentos procesados disponibles para descargar.');
      return;
    }

    setIsZipping(true);
    try {
      const zip = new JSZip();
      completed.forEach((item, index) => {
        const fileName = item.stampedFileName || `documento_estampado_${index + 1}.pdf`;
        if (item.stampedBlob) {
          zip.file(fileName, item.stampedBlob);
        }
      });

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      const zipUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = `Documentos_Estampados_PazSuma_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(zipUrl);
    } catch (zipErr) {
      console.error('Error al empaquetar ZIP:', zipErr);
      alert('No se pudo generar el archivo ZIP. Descarga los archivos individualmente.');
    } finally {
      setIsZipping(false);
    }
  };

  // ── DESCARGA CONSECUTIVA ─────────────────────────────────────────────────
  const handleDownloadAllSequentially = () => {
    const completed = pdfFiles.filter(f => f.status === 'completado' && f.stampedDocUrl);
    if (completed.length === 0) {
      alert('No hay documentos procesados disponibles para descargar.');
      return;
    }

    completed.forEach((item, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = item.stampedDocUrl!;
        link.download = item.stampedFileName || `documento_estampado_${index + 1}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 350);
    });
  };

  // ── DESCARGA INDIVIDUAL ──────────────────────────────────────────────────
  const handleDownloadSingle = (item: ProcessedPdfItem) => {
    if (!item.stampedDocUrl) return;
    const link = document.createElement('a');
    link.href = item.stampedDocUrl;
    link.download = item.stampedFileName || `estampado_${item.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const completedCount = pdfFiles.filter(f => f.status === 'completado').length;

  return (
    <div className="space-y-6">
      {/* ── ENCABEZADO OFICIAL DE PAZSUMA ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E2D9] pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#581c2f] text-white shadow-xs">
              <Stamp className="h-5 w-5 text-[#b39656]" />
            </div>
            <span>Estampador y Foliador Digital</span>
            <span className="rounded-full bg-[#FBF0F3] px-2.5 py-0.5 text-xs font-bold text-[#581c2f] border border-[#EED7DC]">
              Oficial PazSuma
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Foliado de texto correlativo, sello institucional &quot;OPERADO&quot; con fecha roja bajo el texto, y logotipo PNG transparente con persistencia en Supabase Storage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pdfFiles.length > 0 && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
              {pdfFiles.length} {pdfFiles.length === 1 ? 'archivo cargado' : 'archivos cargados'}
            </span>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Cerrar vista"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* ── BANNER DE ÉXITO GENERAL CON DESCARGAS ────────────────────────── */}
      {overallSuccessMessage && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-medium text-emerald-900 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in shadow-xs">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-sm text-emerald-900">{overallSuccessMessage}</p>
              <p className="text-[11px] text-emerald-700">
                Los archivos se han guardado en el bucket <span className="font-mono font-bold">documentos_folios</span> de Supabase y están disponibles para descarga inmediata.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownloadAllAsZip}
              disabled={isZipping}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-3.5 py-2 text-white font-bold transition shadow-xs cursor-pointer text-xs disabled:opacity-50"
            >
              <Archive className="h-4 w-4" />
              <span>{isZipping ? 'Empaquetando ZIP...' : 'Descargar Todos (.ZIP)'}</span>
            </button>
            <button
              onClick={handleDownloadAllSequentially}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-100/50 px-3 py-2 text-emerald-800 font-semibold transition cursor-pointer text-xs"
              title="Descargar cada PDF de forma consecutiva"
            >
              <FolderDown className="h-4 w-4" />
              <span>Descargar Consecutivos</span>
            </button>
          </div>
        </div>
      )}

      {/* ── GRID PRINCIPAL: PANEL DE CONTROL AVANZADO (5 COLS) + VISTA PREVIA Y ARCHIVOS (7 COLS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUMNA IZQUIERDA: PANEL DE PARÁMETROS AVANZADO */}
        <div className="lg:col-span-5 space-y-4">
          {/* ── SELECTOR PRINCIPAL DE MODALIDAD DE ESTAMPADO ── */}
          <div className="bg-[#fbf0f3]/70 rounded-2xl border border-[#eed7dc] p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-[#581c2f] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Sparkles className="h-3.5 w-3.5 text-[#b39656]" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#581c2f]">
                    Modalidad de Estampado
                  </span>
                  <p className="text-[10px] text-slate-500">Selecciona los elementos a estampar en el documento</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-[#581c2f] bg-white px-2.5 py-1 rounded-full border border-[#eed7dc] shadow-2xs">
                {operadoConfig.enabled && folioConfig.enabled
                  ? 'Sello + Folio Activos'
                  : operadoConfig.enabled
                  ? 'Solo Sello Activo'
                  : folioConfig.enabled
                  ? 'Solo Folio Activo'
                  : 'Ninguno seleccionado'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Opción 1: Solo Sello Operado */}
              <button
                type="button"
                onClick={() => {
                  setOperadoConfig(prev => ({ ...prev, enabled: true }));
                  setFolioConfig(prev => ({ ...prev, enabled: false }));
                  setActiveTab('operado');
                  setActiveCanvasElement('operado');
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition cursor-pointer ${
                  operadoConfig.enabled && !folioConfig.enabled
                    ? 'bg-[#581c2f] text-white border-[#581c2f] shadow-sm scale-[1.02]'
                    : 'bg-white hover:bg-[#fbf0f3] text-slate-700 border-[#eed7dc] hover:border-[#581c2f]'
                }`}
              >
                <Stamp className={`h-4 w-4 mb-1 ${operadoConfig.enabled && !folioConfig.enabled ? 'text-[#b39656]' : 'text-[#581c2f]'}`} />
                <span className="text-xs font-bold leading-tight">Solo Sello</span>
                <span className="text-[9px] opacity-75 mt-0.5">OPERADO 3 niveles</span>
              </button>

              {/* Opción 2: Solo Folio Numérico */}
              <button
                type="button"
                onClick={() => {
                  setFolioConfig(prev => ({ ...prev, enabled: true, style: 'text-only', showMetadata: false }));
                  setOperadoConfig(prev => ({ ...prev, enabled: false }));
                  setActiveTab('folio');
                  setActiveCanvasElement('folio');
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition cursor-pointer ${
                  !operadoConfig.enabled && folioConfig.enabled
                    ? 'bg-[#581c2f] text-white border-[#581c2f] shadow-sm scale-[1.02]'
                    : 'bg-white hover:bg-[#fbf0f3] text-slate-700 border-[#eed7dc] hover:border-[#581c2f]'
                }`}
              >
                <Hash className={`h-4 w-4 mb-1 ${!operadoConfig.enabled && folioConfig.enabled ? 'text-[#b39656]' : 'text-[#581c2f]'}`} />
                <span className="text-xs font-bold leading-tight">Solo Folio</span>
                <span className="text-[9px] opacity-75 mt-0.5">Numérico simple</span>
              </button>

              {/* Opción 3: Ambos a la vez */}
              <button
                type="button"
                onClick={() => {
                  setOperadoConfig(prev => ({ ...prev, enabled: true }));
                  setFolioConfig(prev => ({ ...prev, enabled: true }));
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition cursor-pointer ${
                  operadoConfig.enabled && folioConfig.enabled
                    ? 'bg-[#581c2f] text-white border-[#581c2f] shadow-sm scale-[1.02]'
                    : 'bg-white hover:bg-[#fbf0f3] text-slate-700 border-[#eed7dc] hover:border-[#581c2f]'
                }`}
              >
                <Layers className={`h-4 w-4 mb-1 ${operadoConfig.enabled && folioConfig.enabled ? 'text-[#b39656]' : 'text-[#581c2f]'}`} />
                <span className="text-xs font-bold leading-tight">Ambos a la vez</span>
                <span className="text-[9px] opacity-75 mt-0.5">Sello + Folio</span>
              </button>
            </div>
          </div>

          {/* BARRA DE PESTAÑAS DEL PANEL DE CONTROL */}
          <div className="bg-[#fbf0f3] p-1 rounded-2xl border border-[#eed7dc] grid grid-cols-4 gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('folio');
                setActiveCanvasElement('folio');
              }}
              className={`py-2 px-2 rounded-xl text-center text-xs font-bold transition cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                activeTab === 'folio'
                  ? 'bg-white text-[#581c2f] shadow-xs border border-[#eed7dc]'
                  : 'text-slate-600 hover:text-[#581c2f] hover:bg-white/60'
              }`}
            >
              <Hash className="h-3.5 w-3.5" />
              <span>Folio</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('operado');
                setActiveCanvasElement('operado');
              }}
              className={`py-2 px-2 rounded-xl text-center text-xs font-bold transition cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                activeTab === 'operado'
                  ? 'bg-white text-[#581c2f] shadow-xs border border-[#eed7dc]'
                  : 'text-slate-600 hover:text-[#581c2f] hover:bg-white/60'
              }`}
            >
              <Stamp className="h-3.5 w-3.5" />
              <span>OPERADO</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('logo');
                setActiveCanvasElement('logo');
              }}
              className={`py-2 px-2 rounded-xl text-center text-xs font-bold transition cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                activeTab === 'logo'
                  ? 'bg-white text-[#581c2f] shadow-xs border border-[#eed7dc]'
                  : 'text-slate-600 hover:text-[#581c2f] hover:bg-white/60'
              }`}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              <span>Logotipo</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('paginas')}
              className={`py-2 px-2 rounded-xl text-center text-xs font-bold transition cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                activeTab === 'paginas'
                  ? 'bg-white text-[#581c2f] shadow-xs border border-[#eed7dc]'
                  : 'text-slate-600 hover:text-[#581c2f] hover:bg-white/60'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Páginas</span>
            </button>
          </div>

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* PESTAÑA 1: CONTROLES DE FOLIO NUMÉRICO CONFIGURABLE               */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeTab === 'folio' && (
            <div className="rounded-2xl border border-[#eed7dc] bg-white p-4 shadow-2xs space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[#eed7dc]/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-[#581c2f] text-white flex items-center justify-center shrink-0">
                    <Hash className="h-3.5 w-3.5 text-[#b39656]" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Foleo Numérico Simple
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Numeración consecutiva pura sin prefijos ni sufijos
                    </p>
                  </div>
                </div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-[#581c2f] bg-[#fbf0f3] border border-[#eed7dc] px-2.5 py-1 rounded-xl cursor-pointer hover:bg-[#eed7dc]/40 transition">
                  <input
                    type="checkbox"
                    checked={folioConfig.enabled}
                    onChange={e => setFolioConfig({ ...folioConfig, enabled: e.target.checked })}
                    className="accent-[#581c2f] h-4 w-4 rounded"
                  />
                  <span>Activar Folio</span>
                </label>
              </div>

              {/* Relleno con Ceros a la Izquierda (Dígitos / Padding) */}
              <div className="p-3 bg-[#fbf0f3]/40 rounded-xl border border-[#eed7dc] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                      Formato Numérico y Ceros a la Izquierda
                    </span>
                    <span className="block text-[10px] text-slate-500">
                      El foleo es exclusivamente numérico (ej. 136, 008, 000009)
                    </span>
                  </div>

                  {/* Muestra viva del número resultante */}
                  <div className="flex items-center gap-1.5 bg-white border border-[#eed7dc] px-3 py-1 rounded-xl shadow-2xs">
                    <span className="text-[10px] text-slate-500 font-medium">Ejemplo:</span>
                    <span className="font-mono font-bold text-sm text-[#581c2f]">
                      {generateFolioString(0, folioConfig)}
                    </span>
                  </div>
                </div>

                {/* Presets Rápidos de Cantidad de Dígitos */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    { pad: 1, label: '1 dígito (136)', desc: 'Sin ceros a la izquierda' },
                    { pad: 2, label: '2 dígitos (08)', desc: '08, 09, 10' },
                    { pad: 3, label: '3 dígitos (008)', desc: '008, 009, 010' },
                    { pad: 4, label: '4 dígitos (0008)', desc: '0008, 0009' },
                    { pad: 6, label: '6 dígitos (000008)', desc: 'Estándar institucional' },
                    { pad: 8, label: '8 dígitos (00000008)', desc: 'Secuencia extendida' }
                  ].map(preset => {
                    const isSelected = folioConfig.padLength === preset.pad;
                    return (
                      <button
                        key={preset.pad}
                        type="button"
                        onClick={() => setFolioConfig({ ...folioConfig, padLength: preset.pad, formatPreset: 'numeric' })}
                        className={`p-2 rounded-xl text-left transition cursor-pointer border ${
                          isSelected
                            ? 'bg-[#581c2f] text-white border-[#581c2f] shadow-2xs'
                            : 'bg-white border-[#eed7dc] text-slate-700 hover:bg-[#fbf0f3] hover:text-[#581c2f]'
                        }`}
                      >
                        <span className="block text-xs font-mono font-bold">{preset.label}</span>
                        <span className={`block text-[9px] ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                          {preset.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Selector numérico manual de longitud de dígitos */}
                <div className="flex items-center justify-between pt-2 border-t border-[#eed7dc]/60 text-xs">
                  <span className="text-[10px] font-bold text-slate-600 uppercase">Longitud exacta de dígitos:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={folioConfig.padLength}
                      onChange={e => setFolioConfig({ ...folioConfig, padLength: Math.max(1, Math.min(10, Number(e.target.value))) })}
                      className="w-14 p-1.5 rounded-lg border border-[#eed7dc] bg-white font-mono font-bold text-[#581c2f] text-xs text-center focus:outline-none focus:ring-2 focus:ring-[#581c2f]/20"
                    />
                    <span className="text-slate-500 font-mono text-[11px]">dígitos</span>
                  </div>
                </div>
              </div>

              {/* Número Inicial y Paso de Incremento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                    Número Inicial
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={folioConfig.startNumber}
                    onChange={e => setFolioConfig({ ...folioConfig, startNumber: Number(e.target.value) })}
                    className="w-full rounded-xl border border-[#eed7dc] bg-white p-2 text-xs font-mono font-bold text-[#581c2f] focus:outline-none focus:ring-2 focus:ring-[#581c2f]/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                    Paso de Incremento
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={folioConfig.increment}
                    onChange={e => setFolioConfig({ ...folioConfig, increment: Number(e.target.value) })}
                    className="w-full rounded-xl border border-[#eed7dc] bg-white p-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#581c2f]/20"
                  />
                </div>
              </div>

              {/* 1. SELECCIÓN DE TIPO DE FUENTE (TYPOGRAPHY) Y 2. TAMAÑO */}
              <div className="rounded-xl border border-[#eed7dc] bg-[#fbf0f3]/30 p-3 space-y-3">
                <div className="grid grid-cols-12 gap-3 items-end">
                  {/* Tipografía StandardFonts */}
                  <div className="col-span-7">
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      Tipografía Estándar PDF
                    </label>
                    <select
                      value={folioConfig.fontChoice}
                      onChange={e => setFolioConfig({ ...folioConfig, fontChoice: e.target.value as any })}
                      className="w-full rounded-xl border border-[#eed7dc] bg-white p-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#581c2f] focus:ring-2 focus:ring-[#581c2f]/20 cursor-pointer"
                    >
                      <option value="Helvetica">Helvetica (Moderna Sans)</option>
                      <option value="Helvetica-Bold">Helvetica-Bold (Negrita Sans)</option>
                      <option value="Times-Roman">Times-Roman (Clásica Serif)</option>
                      <option value="Courier">Courier (Monospace Máquina de Escribir)</option>
                    </select>
                  </div>

                  {/* Negrita Toggle */}
                  <div className="col-span-5">
                    <button
                      type="button"
                      onClick={() => setFolioConfig({ ...folioConfig, isBold: !folioConfig.isBold })}
                      className={`w-full p-2 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition cursor-pointer ${
                        folioConfig.isBold || folioConfig.fontChoice.includes('Bold')
                          ? 'bg-[#581c2f] text-white border-[#581c2f] shadow-2xs'
                          : 'bg-white border-[#eed7dc] text-slate-700 hover:bg-[#fbf0f3] hover:text-[#581c2f]'
                      }`}
                    >
                      <Bold className="h-3.5 w-3.5" />
                      <span>{folioConfig.isBold || folioConfig.fontChoice.includes('Bold') ? 'Negrita Activa' : 'Aplicar Negrita'}</span>
                    </button>
                  </div>
                </div>

                {/* Tamaño de Fuente (Slider + Control Numérico + Pills) */}
                <div className="space-y-1.5 pt-2 border-t border-[#eed7dc]/60">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-700 uppercase">
                    <span>Tamaño de Letra (Font Size)</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={8}
                        max={48}
                        value={folioConfig.fontSize}
                        onChange={e => setFolioConfig({ ...folioConfig, fontSize: Math.max(8, Math.min(48, Number(e.target.value))) })}
                        className="w-12 text-center py-0.5 rounded-lg border border-[#eed7dc] font-bold text-[#581c2f] bg-white text-xs focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                      />
                      <span className="text-slate-500 font-mono">pt</span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={10}
                    max={36}
                    value={folioConfig.fontSize}
                    onChange={e => setFolioConfig({ ...folioConfig, fontSize: Number(e.target.value) })}
                    className="w-full accent-[#581c2f] cursor-pointer"
                  />

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-500 font-medium">Puntaje rápido:</span>
                    {[10, 12, 14, 18, 24, 36].map(sz => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setFolioConfig({ ...folioConfig, fontSize: sz })}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border font-mono font-bold cursor-pointer transition ${
                          folioConfig.fontSize === sz
                            ? 'bg-[#581c2f] text-white border-[#581c2f] shadow-2xs'
                            : 'bg-white text-slate-600 border-[#eed7dc] hover:bg-[#fbf0f3] hover:text-[#581c2f]'
                        }`}
                      >
                        {sz}pt
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Selector de Color de Fuente */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1.5">
                  Color de Fuente (Tinta)
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PRESETS.map(c => {
                    const isSelected = folioConfig.colorHex.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setFolioConfig({ ...folioConfig, colorHex: c.hex })}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                          isSelected
                            ? 'border-[#581c2f] bg-[#fbf0f3] text-[#581c2f] font-bold shadow-2xs ring-1 ring-[#581c2f]'
                            : 'border-[#eed7dc] bg-white text-slate-700 hover:bg-[#fbf0f3] hover:text-[#581c2f]'
                        }`}
                      >
                        <span className="h-3.5 w-3.5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: c.hex }} />
                        <span>{c.label}</span>
                      </button>
                    );
                  })}
                  <div className="flex items-center gap-1.5 border border-[#eed7dc] rounded-xl px-2 py-1 bg-white">
                    <input
                      type="color"
                      value={folioConfig.colorHex}
                      onChange={e => setFolioConfig({ ...folioConfig, colorHex: e.target.value })}
                      className="h-5 w-5 rounded cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={folioConfig.colorHex}
                      onChange={e => setFolioConfig({ ...folioConfig, colorHex: e.target.value })}
                      className="w-16 text-[10px] font-mono text-slate-700 uppercase border-0 p-0 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Opción para Mostrar / Quitar Marco en Número de Folio (Border Toggle) */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#fbf0f3]/60 border border-[#eed7dc] transition">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-[#581c2f]/10 text-[#581c2f] flex items-center justify-center shrink-0">
                    <Square className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        Mostrar Marco en Número de Folio
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider transition ${
                          folioConfig.showBorder
                            ? 'bg-[#581c2f] text-white shadow-2xs'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {folioConfig.showBorder ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {folioConfig.showBorder
                        ? 'Dibuja un recuadro limpio con borde delgado alrededor del número'
                        : 'Imprime únicamente el número puro (ej. 136, 008) sobre el papel sin ningún recuadro'}
                    </p>
                  </div>
                </div>

                {/* Switch Toggle */}
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={Boolean(folioConfig.showBorder)}
                    onChange={e => {
                      const checked = e.target.checked;
                      setFolioConfig({
                        ...folioConfig,
                        showBorder: checked,
                        style: checked ? 'boxed' : (folioConfig.style === 'line' ? 'line' : 'text-only')
                      });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#581c2f]"></div>
                </label>
              </div>

              {/* Estilo Visual de Presentación del Folio */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1.5">
                  Estilo de Presentación del Folio
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'text-only', label: 'Texto Limpio / Simple', desc: 'Directo sin recuadro' },
                    { id: 'boxed', label: 'Enmarcado', desc: 'Recuadro sutil blanco' },
                    { id: 'line', label: 'Líneas Notariales', desc: 'Bordes sup. e inf.' }
                  ].map(st => {
                    const isSelected = st.id === 'boxed'
                      ? folioConfig.showBorder
                      : st.id === 'text-only'
                      ? (!folioConfig.showBorder && folioConfig.style !== 'line')
                      : (folioConfig.style === 'line');
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() =>
                          setFolioConfig({
                            ...folioConfig,
                            style: st.id as any,
                            showBorder: st.id === 'boxed'
                          })
                        }
                        className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                          isSelected
                            ? 'border-[#581c2f] bg-[#fbf0f3] text-[#581c2f] font-bold shadow-2xs ring-1 ring-[#581c2f]'
                            : 'border-[#eed7dc] bg-white text-slate-700 hover:bg-[#fbf0f3] text-xs font-semibold'
                        }`}
                      >
                        <span className="block text-xs">{st.label}</span>
                        <span className="block text-[9px] opacity-75">{st.desc}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2.5 flex items-center justify-between p-2.5 rounded-xl bg-[#fbf0f3]/30 border border-[#eed7dc]">
                  <div>
                    <span className="block text-xs font-bold text-slate-800">Membrete y Fecha de Estampado</span>
                    <span className="block text-[10px] text-slate-500">Opcional para acompañar el número en actas formales</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={folioConfig.showMetadata}
                    onChange={e => setFolioConfig({ ...folioConfig, showMetadata: e.target.checked })}
                    className="accent-[#581c2f] h-4 w-4 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* REPLICACIÓN EN PÁGINAS DEL FOLIO (OPCIÓN INDEPENDIENTE) */}
              <div className="rounded-xl border border-[#eed7dc] bg-[#fbf0f3]/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-[#581c2f]" />
                    <span>Replicación del Folio en Páginas</span>
                  </label>
                  <span className="text-[10px] font-bold text-[#581c2f] uppercase">
                    {folioConfig.pageScope === 'all'
                      ? 'Todas las páginas'
                      : folioConfig.pageScope === 'first'
                      ? 'Solo pág. 1'
                      : folioConfig.pageScope === 'range'
                      ? `Pág. ${folioConfig.rangeFrom || 1} a ${folioConfig.rangeTo || 1}`
                      : 'Páginas específicas'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: 'all', label: 'Todas las páginas' },
                    { id: 'first', label: 'Solo 1ª página' },
                    { id: 'range', label: 'Rango de págs' },
                    { id: 'custom', label: 'Págs específicas' }
                  ].map(pMode => (
                    <button
                      key={pMode.id}
                      type="button"
                      onClick={() => setFolioConfig({ ...folioConfig, pageScope: pMode.id as any })}
                      className={`p-1.5 rounded-lg border text-center text-xs font-semibold transition cursor-pointer ${
                        (folioConfig.pageScope || 'all') === pMode.id
                          ? 'bg-[#581c2f] text-white border-[#581c2f] font-bold shadow-2xs'
                          : 'bg-white border-[#eed7dc] text-slate-700 hover:bg-[#fbf0f3]'
                      }`}
                    >
                      {pMode.label}
                    </button>
                  ))}
                </div>

                {folioConfig.pageScope === 'range' && (
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div>
                      <span className="block text-[10px] text-slate-600 font-bold mb-1">Desde Página</span>
                      <input
                        type="number"
                        min={1}
                        value={folioConfig.rangeFrom || 1}
                        onChange={e => setFolioConfig({ ...folioConfig, rangeFrom: Math.max(1, Number(e.target.value)) })}
                        className="w-full p-1.5 rounded-lg border border-[#eed7dc] bg-white font-mono font-bold text-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-600 font-bold mb-1">Hasta Página</span>
                      <input
                        type="number"
                        min={folioConfig.rangeFrom || 1}
                        value={folioConfig.rangeTo || 1}
                        onChange={e => setFolioConfig({ ...folioConfig, rangeTo: Math.max(1, Number(e.target.value)) })}
                        className="w-full p-1.5 rounded-lg border border-[#eed7dc] bg-white font-mono font-bold text-[#581c2f] focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                      />
                    </div>
                  </div>
                )}

                {folioConfig.pageScope === 'custom' && (
                  <div className="pt-1 text-xs">
                    <span className="block text-[10px] text-slate-600 font-bold mb-1">Páginas o rangos separados por coma</span>
                    <input
                      type="text"
                      value={folioConfig.customPages || ''}
                      onChange={e => setFolioConfig({ ...folioConfig, customPages: e.target.value })}
                      placeholder="Ej: 1, 3, 5-8"
                      className="w-full p-1.5 rounded-lg border border-[#eed7dc] bg-white font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#581c2f]"
                    />
                  </div>
                )}
              </div>

              {/* Cuadrícula 3x3 y Offsets Manuales */}
              <div className="pt-2 border-t border-[#eed7dc]/60">
                <PositionMatrix3x3
                  label="Ubicación del Folio (Matriz 3x3 y Desplazamiento)"
                  currentMatrix={folioConfig.positionMatrix}
                  normX={folioConfig.normX}
                  normY={folioConfig.normY}
                  offsetX={folioConfig.offsetX}
                  offsetY={folioConfig.offsetY}
                  onMatrixSelect={(mat, nx, ny) => {
                    setFolioConfig({
                      ...folioConfig,
                      positionMatrix: mat,
                      normX: nx,
                      normY: ny
                    });
                  }}
                  onOffsetChange={(ox, oy) => {
                    setFolioConfig({
                      ...folioConfig,
                      offsetX: ox,
                      offsetY: oy
                    });
                  }}
                />
                <p className="text-[10px] text-slate-400 mt-2 text-center">
                  💡 También puedes hacer clic y arrastrar el folio directamente sobre la hoja en la vista previa.
                </p>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* PESTAÑA 2: SELLO OFICIAL DE TRES NIVELES (OPERADO)                */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeTab === 'operado' && (
            <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-2xs space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Stamp className="h-4 w-4 text-[#003399]" />
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Sello Oficial de 3 Niveles
                    </h3>
                    <p className="text-[10px] text-slate-400">Réplica exacta del sello municipal H. Ayuntamiento</p>
                  </div>
                </div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-[#003399] bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={operadoConfig.enabled}
                    onChange={e => setOperadoConfig({ ...operadoConfig, enabled: e.target.checked })}
                    className="accent-[#003399] h-4 w-4 rounded"
                  />
                  <span>Activar Sello</span>
                </label>
              </div>

              {/* Opción para Mostrar / Quitar Marco en Sello Operado (Border Toggle) */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/60 border border-blue-200 transition">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-[#003399]/10 text-[#003399] flex items-center justify-center shrink-0">
                    <Square className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        Mostrar Marco en Sello Operado
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider transition ${
                          operadoConfig.showBorder !== false
                            ? 'bg-[#003399] text-white shadow-2xs'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {operadoConfig.showBorder !== false ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {operadoConfig.showBorder !== false
                        ? 'Dibuja el recuadro delimitador con el estilo de borde de sello físico'
                        : 'Renderiza limpio únicamente texto "OPERADO", fecha roja y logotipo, sin marco exterior'}
                    </p>
                  </div>
                </div>

                {/* Switch Toggle */}
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={operadoConfig.showBorder !== false}
                    onChange={e =>
                      setOperadoConfig({
                        ...operadoConfig,
                        showBorder: e.target.checked
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#003399]"></div>
                </label>
              </div>

              {/* Input oculto para carga de PNG transparente del escudo/leyenda institucional */}
              <input
                ref={shieldInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleShieldUpload}
                className="hidden"
              />

              {/* ── 1. PARTE SUPERIOR (Texto Azul: OPERADO) ── */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-[#003399] uppercase flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#003399]" />
                    <span>1. Parte Superior (Texto Azul)</span>
                  </label>
                  <span className="text-[10px] font-mono font-bold text-[#003399] bg-white px-2 py-0.5 rounded border border-blue-200">
                    {operadoConfig.colorHex}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={operadoConfig.operadoWord}
                      onChange={e => setOperadoConfig({ ...operadoConfig, operadoWord: e.target.value.toUpperCase() })}
                      placeholder="OPERADO"
                      className="w-full rounded-lg border border-blue-200 bg-white p-2 text-xs font-black uppercase text-[#003399] tracking-widest focus:outline-none focus:ring-1 focus:ring-[#003399]"
                    />
                  </div>
                  <div>
                    <input
                      type="color"
                      value={operadoConfig.colorHex}
                      onChange={e => setOperadoConfig({ ...operadoConfig, colorHex: e.target.value })}
                      className="w-full h-8 rounded-lg border border-blue-200 cursor-pointer p-0.5 bg-white"
                      title="Color azul tinta estilo sello físico"
                    />
                  </div>
                </div>
              </div>

              {/* ── 2. PARTE CENTRAL (Fecha Dinámica en Rojo: DD MMM. YYYY) ── */}
              <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-red-900 uppercase flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[#E62B4A]" />
                    <span>2. Parte Central (Fecha Dinámica en Rojo)</span>
                  </label>
                  <span className="text-[10px] font-mono font-black bg-white text-[#E62B4A] px-2 py-0.5 rounded border border-red-200">
                    {formatOfficialStampDate(operadoConfig.stampDateIso)}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={operadoConfig.stampDateIso}
                    onChange={e => setOperadoConfig({ ...operadoConfig, stampDateIso: e.target.value })}
                    className="w-full rounded-lg border border-red-300 bg-white p-2 text-xs font-mono font-bold text-red-800 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <div className="flex items-center gap-1">
                    {['Hoy', 'Ayer', '30 JUL. 2026', '30 AGO. 2026'].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          if (preset === 'Hoy') {
                            setOperadoConfig({ ...operadoConfig, stampDateIso: new Date().toISOString().slice(0, 10) });
                          } else if (preset === 'Ayer') {
                            const d = new Date();
                            d.setDate(d.getDate() - 1);
                            setOperadoConfig({ ...operadoConfig, stampDateIso: d.toISOString().slice(0, 10) });
                          } else if (preset === '30 JUL. 2026') {
                            setOperadoConfig({ ...operadoConfig, stampDateIso: '2026-07-30' });
                          } else {
                            setOperadoConfig({ ...operadoConfig, stampDateIso: '2026-08-30' });
                          }
                        }}
                        className="px-2 py-1.5 rounded-lg bg-white border border-red-200 text-[10px] font-bold text-red-700 hover:bg-red-100 transition cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── 3. PARTE INFERIOR (Logotipo Institucional en Azul) ── */}
              <div className="rounded-xl border border-blue-200 bg-slate-50/70 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-[#003399] uppercase flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#003399]" />
                    <span>3. Parte Inferior (Logotipo Institucional)</span>
                  </label>
                  <span className="text-[9px] font-bold text-slate-500">
                    {operadoConfig.shieldImageUrl ? 'PNG Personalizado' : 'Escudo Vectorial La Paz'}
                  </span>
                </div>

                {/* Subida o selección de escudo */}
                <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                  <div className="h-8 w-8 rounded bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {operadoConfig.shieldImageUrl ? (
                      <img src={operadoConfig.shieldImageUrl} alt="Escudo" className="h-full w-full object-contain" />
                    ) : (
                      <ShieldCheck className="h-5 w-5 text-[#003399]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-[11px]">
                    <p className="font-semibold text-slate-800 truncate">
                      {operadoConfig.shieldImageUrl ? 'Escudo PNG Personalizado' : 'Escudo Oficial La Paz (Vectorial SVG)'}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {operadoConfig.shieldImageUrl ? 'Transparente cargado' : 'Renderizado nítido alta fidelidad'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => shieldInputRef.current?.click()}
                      className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-[#003399] border border-blue-200 text-[10px] font-bold transition cursor-pointer"
                    >
                      Subir PNG
                    </button>
                    {operadoConfig.shieldImageUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveShield}
                        className="p-1 rounded text-red-500 hover:bg-red-50 transition cursor-pointer"
                        title="Restablecer a escudo vectorial oficial"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Líneas Institucionales Editables */}
                <div className="space-y-1.5 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                      Línea 1 (Superior)
                    </label>
                    <input
                      type="text"
                      value={operadoConfig.institutionLine1 || 'H. AYUNTAMIENTO'}
                      onChange={e => setOperadoConfig({ ...operadoConfig, institutionLine1: e.target.value.toUpperCase() })}
                      className="w-full rounded-lg border border-slate-200 bg-white p-1.5 text-xs text-slate-800 font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                      Línea 2 (Central - En Negrita)
                    </label>
                    <input
                      type="text"
                      value={operadoConfig.institutionLine2 || 'DE LA PAZ'}
                      onChange={e => setOperadoConfig({ ...operadoConfig, institutionLine2: e.target.value.toUpperCase() })}
                      className="w-full rounded-lg border border-slate-200 bg-white p-1.5 text-xs text-[#003399] font-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                      Línea 3 (Periodo de Gobierno)
                    </label>
                    <input
                      type="text"
                      value={operadoConfig.institutionLine3 || '2024 - 2027'}
                      onChange={e => setOperadoConfig({ ...operadoConfig, institutionLine3: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white p-1.5 text-xs text-slate-700 font-semibold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* ── 4. DIMENSIONES Y EFECTO TINTA REALISTA (85%-90%) ── */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-slate-800 uppercase">
                    Dimensiones y Efecto Tinta Físicamente Realista
                  </label>
                  <span className="text-[10px] font-mono font-bold text-[#003399] bg-white px-2 py-0.5 rounded border border-slate-200">
                    {operadoConfig.width || 210} × {operadoConfig.height || 105} pt
                  </span>
                </div>

                {/* Presets Rápidos de Tamaño */}
                <div className="grid grid-cols-3 gap-1.5 text-[10px] font-bold">
                  {[
                    { label: 'Compacto', w: 170, h: 85 },
                    { label: 'Estándar Oficial', w: 210, h: 105 },
                    { label: 'Amplio', w: 250, h: 125 }
                  ].map(sz => (
                    <button
                      key={sz.label}
                      type="button"
                      onClick={() => setOperadoConfig({ ...operadoConfig, width: sz.w, height: sz.h })}
                      className={`p-1.5 rounded-lg border text-center transition cursor-pointer ${
                        operadoConfig.width === sz.w
                          ? 'bg-[#003399] text-white border-[#003399]'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {sz.label}
                    </button>
                  ))}
                </div>

                {/* Slider de Opacidad Realista (85% a 90%) */}
                <div className="pt-2 border-t border-slate-200/80">
                  <div className="flex justify-between text-[10px] font-bold text-slate-700 uppercase mb-1">
                    <span>Opacidad / Textura de Tinta Real</span>
                    <span className="text-[#003399] font-mono font-bold">{operadoConfig.opacity}%</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={100}
                    value={operadoConfig.opacity}
                    onChange={e => setOperadoConfig({ ...operadoConfig, opacity: Number(e.target.value) })}
                    className="w-full accent-[#003399] cursor-pointer"
                  />
                  <p className="text-[9.5px] text-slate-400 mt-1 leading-tight">
                    Calibrada a ~88% para emular el estampado de tinta líquida sin tapar de forma opaca el texto del documento original.
                  </p>
                </div>
              </div>

              {/* Posicionamiento Independiente Sello OPERADO */}
              <div className="pt-2 border-t border-slate-100">
                <PositionMatrix3x3
                  label="Ubicación del Sello Oficial (Matriz 3x3)"
                  currentMatrix={operadoConfig.positionMatrix}
                  normX={operadoConfig.normX}
                  normY={operadoConfig.normY}
                  offsetX={operadoConfig.offsetX}
                  offsetY={operadoConfig.offsetY}
                  onMatrixSelect={(mat, nx, ny) => {
                    setOperadoConfig({
                      ...operadoConfig,
                      positionMatrix: mat,
                      normX: nx,
                      normY: ny
                    });
                  }}
                  onOffsetChange={(ox, oy) => {
                    setOperadoConfig({
                      ...operadoConfig,
                      offsetX: ox,
                      offsetY: oy
                    });
                  }}
                />
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* PESTAÑA 3: CONTROLES DE IMAGEN / SELLO PERSONALIZADO              */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeTab === 'logo' && (
            <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-2xs space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-[#b39656]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Imagen y Logotipo PNG
                  </h3>
                </div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={logoConfig.enabled}
                    onChange={e => setLogoConfig({ ...logoConfig, enabled: e.target.checked })}
                    className="accent-[#581c2f] h-4 w-4 rounded"
                  />
                  <span>Activar Logo</span>
                </label>
              </div>

              {/* Zona Estándar: "Inserte Imagen / Logotipo PNG" */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Espacio Estándar para Escudo o Logo Institucional</span>
                  {logoPreviewUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="text-[10px] text-red-600 hover:underline font-bold cursor-pointer"
                    >
                      Quitar imagen
                    </button>
                  )}
                </label>

                <div
                  onClick={() => logoInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                    logoPreviewUrl
                      ? 'border-[#b39656] bg-[#F5EFDF]/40'
                      : 'border-[#E8E2D9] bg-[#FDFBF9] hover:border-[#581c2f]'
                  }`}
                >
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  {logoPreviewUrl ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={logoPreviewUrl}
                        alt="Logo"
                        className="h-12 w-12 object-contain rounded bg-white p-1 border border-slate-200 shadow-2xs"
                      />
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-800">Logotipo cargado exitosamente</p>
                        <p className="text-[10px] text-slate-500">Haz clic para cambiar de archivo</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="h-10 w-10 rounded-xl bg-[#b39656]/10 text-[#b39656] flex items-center justify-center">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Inserte Imagen / Logotipo PNG
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Soporta PNG transparente de alta resolución
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Propiedades Visibles: Ancho px, Alto px */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                    Ancho (px/pt)
                  </label>
                  <input
                    type="number"
                    min={20}
                    max={250}
                    value={logoConfig.width}
                    onChange={e => {
                      const newW = Number(e.target.value);
                      setLogoConfig({
                        ...logoConfig,
                        width: newW,
                        height: aspectRatioLocked ? newW : logoConfig.height
                      });
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-[#FDFBF9] p-2 text-xs font-mono font-bold text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 uppercase mb-1">
                    <span>Alto (px/pt)</span>
                    <button
                      type="button"
                      onClick={() => setAspectRatioLocked(!aspectRatioLocked)}
                      className="text-[#b39656] hover:underline flex items-center gap-0.5"
                    >
                      {aspectRatioLocked ? <Lock className="h-2.5 w-2.5" /> : <Unlock className="h-2.5 w-2.5" />}
                      <span>{aspectRatioLocked ? '1:1' : 'Libre'}</span>
                    </button>
                  </div>
                  <input
                    type="number"
                    min={20}
                    max={250}
                    value={logoConfig.height}
                    onChange={e => {
                      const newH = Number(e.target.value);
                      setLogoConfig({
                        ...logoConfig,
                        height: newH,
                        width: aspectRatioLocked ? newH : logoConfig.width
                      });
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-[#FDFBF9] p-2 text-xs font-mono font-bold text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* Controles de Rotación: Slider 0° a 360° y Giro Rápido */}
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 uppercase">
                  <span className="flex items-center gap-1">
                    <RotateCw className="h-3 w-3 text-[#b39656]" />
                    <span>Rotación del Logotipo</span>
                  </span>
                  <span className="font-mono text-[#581c2f] font-extrabold bg-white px-2 py-0.5 rounded border border-slate-200">
                    {logoConfig.rotationAngle}°
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={logoConfig.rotationAngle}
                  onChange={e => setLogoConfig({ ...logoConfig, rotationAngle: Number(e.target.value) })}
                  className="w-full accent-[#581c2f] cursor-pointer"
                />
                <div className="flex justify-between gap-1 pt-1">
                  {[0, 45, 90, 180, 270].map(deg => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => setLogoConfig({ ...logoConfig, rotationAngle: deg })}
                      className="px-2 py-1 rounded bg-white border border-slate-200 text-[10px] font-semibold text-slate-600 hover:border-[#581c2f] hover:text-[#581c2f] cursor-pointer transition"
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>

              {/* Posicionamiento Independiente del Logo */}
              <div className="pt-2 border-t border-slate-100">
                <PositionMatrix3x3
                  label="Ubicación del Logotipo (Matriz 3x3)"
                  currentMatrix={logoConfig.positionMatrix}
                  normX={logoConfig.normX}
                  normY={logoConfig.normY}
                  offsetX={logoConfig.offsetX}
                  offsetY={logoConfig.offsetY}
                  onMatrixSelect={(mat, nx, ny) => {
                    setLogoConfig({
                      ...logoConfig,
                      positionMatrix: mat,
                      normX: nx,
                      normY: ny
                    });
                  }}
                  onOffsetChange={(ox, oy) => {
                    setLogoConfig({
                      ...logoConfig,
                      offsetX: ox,
                      offsetY: oy
                    });
                  }}
                />
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* PESTAÑA 4: RANGO DE PÁGINAS Y LOTE                                */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeTab === 'paginas' && (
            <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-2xs space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <Layers className="h-4 w-4 text-[#581c2f]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Rango de Páginas a Folear
                </h3>
              </div>

              {/* Modos de Selección */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: 'all', label: 'Todas' },
                  { id: 'first', label: 'Solo 1ª Pág' },
                  { id: 'range', label: 'De X a Y' },
                  { id: 'custom', label: 'Específicas' }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPageRangeConfig({ ...pageRangeConfig, mode: m.id as any })}
                    className={`p-2 rounded-xl text-center text-xs font-bold border transition cursor-pointer ${
                      pageRangeConfig.mode === m.id
                        ? 'border-[#581c2f] bg-[#FBF0F3] text-[#581c2f]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Campos Requeridos: "De Página X a Página Y" */}
              {pageRangeConfig.mode === 'range' && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    Definir Rango Numérico de Hojas:
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        De Página (Desde):
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={pageRangeConfig.rangeFrom}
                        onChange={e => setPageRangeConfig({ ...pageRangeConfig, rangeFrom: Number(e.target.value) })}
                        className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-mono font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        A Página (Hasta):
                      </label>
                      <input
                        type="number"
                        min={pageRangeConfig.rangeFrom}
                        value={pageRangeConfig.rangeTo}
                        onChange={e => setPageRangeConfig({ ...pageRangeConfig, rangeTo: Number(e.target.value) })}
                        className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-mono font-bold text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              )}

              {pageRangeConfig.mode === 'custom' && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-700">
                    <span>Páginas específicas:</span>
                    <span className="text-[10px] text-slate-400">Ej: 1, 3, 5-8</span>
                  </div>
                  <input
                    type="text"
                    value={pageRangeConfig.customPages}
                    onChange={e => setPageRangeConfig({ ...pageRangeConfig, customPages: e.target.value })}
                    placeholder="Ej: 1-3, 5, 8"
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-mono font-bold text-slate-800 focus:outline-none"
                  />
                </div>
              )}

              {/* Numeración Ascendente: Por documento o Por página */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="block text-[10px] font-bold text-slate-700 uppercase">
                  Regla de Numeración Ascendente
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setNumberingScope('per-document')}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      numberingScope === 'per-document'
                        ? 'border-[#581c2f] bg-[#FBF0F3] text-[#581c2f]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-bold block">Por Documento</span>
                    <span className="text-[10px] opacity-75">Un folio único consecutivo por cada PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNumberingScope('per-page')}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      numberingScope === 'per-page'
                        ? 'border-[#581c2f] bg-[#FBF0F3] text-[#581c2f]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-bold block">Por Hoja / Página</span>
                    <span className="text-[10px] opacity-75">Incrementa el folio en cada página consecutiva</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* BOTÓN PRINCIPAL: ESTAMPAR Y PERSISTIR */}
          <button
            type="button"
            onClick={handleProcessAllDocuments}
            disabled={isProcessing || pdfFiles.length === 0}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#581c2f] py-4 px-4 text-sm font-bold text-white shadow-md hover:bg-[#72223c] active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin text-[#b39656]" />
                <span>{processingStatusText || `Procesando (${processingProgress}%)...`}</span>
              </>
            ) : (
              <>
                <Stamp className="h-5 w-5 text-[#b39656]" />
                <span>
                  {pdfFiles.length === 0
                    ? 'Carga uno o más PDFs para comenzar'
                    : pdfFiles.length === 1
                    ? 'Estampar y Guardar en Supabase Storage'
                    : `Estampar Lote (${pdfFiles.length} PDFs) y Guardar`}
                </span>
              </>
            )}
          </button>
        </div>

        {/* COLUMNA DERECHA: COLA DE ARCHIVOS Y VISTA PREVIA INTERACTIVA */}
        <div className="lg:col-span-7 space-y-4">
          {/* SECCIÓN DE CARGA Y COLA DE ARCHIVOS PDF */}
          <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-[#581c2f]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Cola de Documentos ({pdfFiles.length})
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {pdfFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllFiles}
                    className="text-[11px] text-red-600 hover:underline font-semibold cursor-pointer"
                  >
                    Limpiar lista
                  </button>
                )}
                {completedCount > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadAllAsZip}
                    disabled={isZipping}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-white text-[11px] font-bold transition cursor-pointer"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    <span>Descargar todos (.ZIP)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Zona de Drop para Carga de Múltiples Archivos */}
            <div
              onDragOver={e => {
                e.preventDefault();
                setIsDraggingFile(true);
              }}
              onDragLeave={() => setIsDraggingFile(false)}
              onDrop={e => {
                e.preventDefault();
                setIsDraggingFile(false);
                if (e.dataTransfer.files) {
                  handleAddPdfFiles(e.dataTransfer.files);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 ${
                isDraggingFile
                  ? 'border-[#581c2f] bg-[#FBF0F3]'
                  : 'border-[#E8E2D9] bg-[#FDFBF9] hover:border-[#581c2f]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="application/pdf"
                onChange={e => {
                  if (e.target.files) handleAddPdfFiles(e.target.files);
                  e.target.value = '';
                }}
                className="hidden"
              />
              <div className="h-8 w-8 rounded-lg bg-[#FBF0F3] text-[#581c2f] flex items-center justify-center">
                <UploadCloud className="h-4 w-4" />
              </div>
              <p className="text-xs font-bold text-slate-800">
                Arrastra o selecciona uno o varios documentos PDF
              </p>
              <p className="text-[10px] text-slate-400">
                Soporta archivos individuales y foleo en lote
              </p>
            </div>

            {/* Lista de Archivos */}
            {pdfFiles.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {pdfFiles.map((item, idx) => {
                  const isSelectedForPreview = idx === selectedPreviewIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedPreviewIndex(idx)}
                      className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer ${
                        isSelectedForPreview
                          ? 'border-[#581c2f] bg-[#FBF0F3]/50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                            item.status === 'completado'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-[#581c2f]'
                          }`}
                        >
                          {item.status === 'completado' ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <FileText className="h-3.5 w-3.5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 truncate" title={item.name}>
                            {item.name}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span>{item.sizeFormatted}</span>
                            <span>•</span>
                            <span>{item.pageCount} pág{item.pageCount > 1 ? 's' : ''}</span>
                            {item.status === 'completado' && (
                              <span className="text-emerald-600 font-bold">✓ Estampado & Subido</span>
                            )}
                            {item.status === 'procesando' && (
                              <span className="text-amber-600 font-semibold flex items-center gap-1">
                                <RefreshCw className="h-2 w-2 animate-spin" /> Procesando...
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Botones de Descarga y Supabase URL */}
                      <div className="flex items-center gap-1.5 ml-2 shrink-0">
                        {item.supabasePublicUrl && (
                          <a
                            href={item.supabasePublicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="p-1 rounded-md text-blue-600 hover:bg-blue-50 transition"
                            title="Ver en Supabase Storage"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}

                        {item.stampedDocUrl && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleDownloadSingle(item);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#581c2f] hover:bg-[#72223c] px-2 py-0.5 text-white text-[10px] font-bold transition cursor-pointer"
                          >
                            <Download className="h-3 w-3" />
                            <span>Descargar</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={e => handleRemovePdfFile(item.id, e)}
                          className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* LIENZO DE VISTA PREVIA INTERACTIVO CON DRAG & DROP */}
          <FolioPreviewCanvas
            orientation={canvasOrientation}
            onOrientationToggle={() => setCanvasOrientation(prev => prev === 'portrait' ? 'landscape' : 'portrait')}
            activeElement={activeCanvasElement}
            onSelectElement={handleSelectElementOnCanvas}
            folioConfig={folioConfig}
            operadoConfig={operadoConfig}
            logoConfig={logoConfig}
            logoPreviewUrl={logoPreviewUrl}
            onUpdateFolioPosition={(nx, ny) => {
              setFolioConfig(prev => ({
                ...prev,
                positionMatrix: 'free',
                normX: nx,
                normY: ny
              }));
            }}
            onUpdateOperadoPosition={(nx, ny) => {
              setOperadoConfig(prev => ({
                ...prev,
                positionMatrix: 'free',
                normX: nx,
                normY: ny
              }));
            }}
            onUpdateOperadoSize={(w, h) => {
              setOperadoConfig(prev => ({
                ...prev,
                width: w,
                height: h
              }));
            }}
            onUpdateLogoPosition={(nx, ny) => {
              setLogoConfig(prev => ({
                ...prev,
                positionMatrix: 'free',
                normX: nx,
                normY: ny
              }));
            }}
            activeDocumentName={activePreviewFile?.name}
            totalPages={activePreviewFile?.pageCount || 1}
          />
        </div>
      </div>
    </div>
  );
}
