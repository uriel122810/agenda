'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud, Stamp, Download, Image as ImageIcon, Check,
  Sparkles, RefreshCw, Eye, Sliders, Palette, Calendar,
  FileText, ShieldCheck, CheckCircle2, AlertCircle, X, Trash2,
  Layers, FileCheck, Archive, Hash, FolderDown, Plus, Info,
  ChevronRight, ArrowRight, ExternalLink, RotateCw, Type,
  Bold, Lock, Unlock, Grid
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
  { id: 'guinda', label: 'Vino PazSuma', hex: '#581c2f' },
  { id: 'dorado', label: 'Dorado Oficial', hex: '#b39656' },
  { id: 'negro',  label: 'Negro Grafito', hex: '#0f172a' },
  { id: 'azul',   label: 'Azul Notarial', hex: '#1e40af' },
  { id: 'rojo',   label: 'Rojo Sello',    hex: '#dc2626' }
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
    formatPreset: 'FOL-2026-000',
    prefix: 'FOL-2026-',
    suffix: '',
    startNumber: 1,
    increment: 1,
    padLength: 3,
    fontChoice: 'Helvetica',
    isBold: true,
    fontSize: 10,
    colorHex: '#581c2f',
    opacity: 100,
    style: 'boxed',
    institutionHeader: 'PAZSUMA • GESTIÓN INSTITUCIONAL',
    showMetadata: true,
    positionMatrix: 'tr',
    normX: 0.95,
    normY: 0.05,
    offsetX: 0,
    offsetY: 0
  });

  // ── 2. CONFIGURACIÓN DEL SELLO OFICIAL "OPERADO" ─────────────────────────
  const [operadoConfig, setOperadoConfig] = useState<OperadoStampConfig>({
    enabled: false,
    institutionText: 'PAZSUMA • GESTIÓN PÚBLICA',
    operadoWord: 'OPERADO',
    subText: 'RECURSOS FISCALES 2026',
    stampDateIso: new Date().toISOString().slice(0, 10), // Fecha actual YYYY-MM-DD
    colorHex: '#581c2f', // Color del recuadro e institución
    dateColorHex: '#dc2626', // Rojo institucional para la fecha
    opacity: 30, // Default suave para capa de fondo
    isUnderlay: true, // Capa de Fondo (Bajo el texto / No bloqueante)
    width: 190,
    height: 85,
    positionMatrix: 'mc',
    normX: 0.50,
    normY: 0.50,
    offsetX: 0,
    offsetY: 0
  });

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

  // Sincronizar initialFolio si cambia
  useEffect(() => {
    if (initialFolio) {
      const match = initialFolio.match(/^(.*?)(\d+)$/);
      if (match) {
        const prefix = match[1];
        const num = parseInt(match[2], 10);
        setFolioConfig(prev => ({
          ...prev,
          prefix: prefix,
          startNumber: isNaN(num) ? 1 : num,
          padLength: match[2].length
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
          {/* BARRA DE PESTAÑAS DEL PANEL DE CONTROL */}
          <div className="bg-slate-100/80 p-1 rounded-2xl border border-slate-200 grid grid-cols-4 gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('folio');
                setActiveCanvasElement('folio');
              }}
              className={`py-2 px-2 rounded-xl text-center text-xs font-bold transition cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                activeTab === 'folio'
                  ? 'bg-white text-[#581c2f] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Hash className="h-3.5 w-3.5" />
              <span>Foleo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('operado');
                setActiveCanvasElement('operado');
              }}
              className={`py-2 px-2 rounded-xl text-center text-xs font-bold transition cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                activeTab === 'operado'
                  ? 'bg-white text-[#581c2f] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
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
                  ? 'bg-white text-[#581c2f] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
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
                  ? 'bg-white text-[#581c2f] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Páginas</span>
            </button>
          </div>

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* PESTAÑA 1: CONTROLES DE TEXTO / FOLEO                             */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeTab === 'folio' && (
            <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-2xs space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-[#581c2f]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Controles de Texto y Foleo
                  </h3>
                </div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={folioConfig.enabled}
                    onChange={e => setFolioConfig({ ...folioConfig, enabled: e.target.checked })}
                    className="accent-[#581c2f] h-4 w-4 rounded"
                  />
                  <span>Activar Folio</span>
                </label>
              </div>

              {/* Formato de Folio Presets y Máscara */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                  Formato de Folio
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: 'FOL-2026-000', label: 'FOL-2026-000' },
                    { id: '000000', label: '000000 (Numérico)' },
                    { id: 'OFI-000/2026', label: 'OFI-000/2026' },
                    { id: 'custom', label: 'Personalizado' }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFolioConfig({ ...folioConfig, formatPreset: f.id as any })}
                      className={`p-2 rounded-xl text-center text-xs font-mono font-bold border transition cursor-pointer ${
                        folioConfig.formatPreset === f.id
                          ? 'border-[#581c2f] bg-[#FBF0F3] text-[#581c2f]'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {folioConfig.formatPreset === 'custom' && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 mb-1">Prefijo</span>
                      <input
                        type="text"
                        value={folioConfig.prefix}
                        onChange={e => setFolioConfig({ ...folioConfig, prefix: e.target.value })}
                        placeholder="Ej: EXP-"
                        className="w-full p-1.5 rounded-lg border border-slate-300 bg-white font-mono font-bold"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 mb-1">Ceros Relleno</span>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={folioConfig.padLength}
                        onChange={e => setFolioConfig({ ...folioConfig, padLength: Number(e.target.value) })}
                        className="w-full p-1.5 rounded-lg border border-slate-300 bg-white font-mono font-bold"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 mb-1">Sufijo</span>
                      <input
                        type="text"
                        value={folioConfig.suffix}
                        onChange={e => setFolioConfig({ ...folioConfig, suffix: e.target.value })}
                        placeholder="Ej: /2026"
                        className="w-full p-1.5 rounded-lg border border-slate-300 bg-white font-mono font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Número Inicial e Incremento */}
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
                    className="w-full rounded-lg border border-slate-200 bg-[#FDFBF9] p-2 text-xs font-mono font-bold text-[#581c2f] focus:outline-none"
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
                    className="w-full rounded-lg border border-slate-200 bg-[#FDFBF9] p-2 text-xs font-mono font-bold text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* Selector de Fuente, Tamaño y Negrita */}
              <div className="grid grid-cols-12 gap-3 items-end">
                {/* Fuente */}
                <div className="col-span-5">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                    Tipografía
                  </label>
                  <select
                    value={folioConfig.fontChoice}
                    onChange={e => setFolioConfig({ ...folioConfig, fontChoice: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-200 bg-[#FDFBF9] p-2 text-xs font-semibold text-slate-800 focus:outline-none"
                  >
                    <option value="Helvetica">Helvetica (Moderna)</option>
                    <option value="TimesRoman">Times Roman (Notarial)</option>
                    <option value="Courier">Courier (Monospace)</option>
                  </select>
                </div>

                {/* Tamaño de Fuente */}
                <div className="col-span-4">
                  <div className="flex justify-between text-[10px] font-bold text-slate-700 uppercase mb-1">
                    <span>Tamaño</span>
                    <span className="text-[#581c2f]">{folioConfig.fontSize} pt</span>
                  </div>
                  <input
                    type="range"
                    min={6}
                    max={24}
                    value={folioConfig.fontSize}
                    onChange={e => setFolioConfig({ ...folioConfig, fontSize: Number(e.target.value) })}
                    className="w-full accent-[#581c2f] cursor-pointer"
                  />
                </div>

                {/* Negrita Toggle */}
                <div className="col-span-3">
                  <button
                    type="button"
                    onClick={() => setFolioConfig({ ...folioConfig, isBold: !folioConfig.isBold })}
                    className={`w-full p-2 rounded-lg border flex items-center justify-center gap-1 text-xs font-bold transition cursor-pointer ${
                      folioConfig.isBold
                        ? 'bg-[#581c2f] text-white border-[#581c2f]'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Bold className="h-3.5 w-3.5" />
                    <span>Negrita</span>
                  </button>
                </div>
              </div>

              {/* Selector de Color y Picker Libre */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1.5">
                  Color de Tinta del Folio
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PRESETS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setFolioConfig({ ...folioConfig, colorHex: c.hex })}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition ${
                        folioConfig.colorHex.toLowerCase() === c.hex.toLowerCase()
                          ? 'border-[#581c2f] bg-[#FBF0F3] text-[#581c2f]'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.hex }} />
                      <span>{c.label}</span>
                    </button>
                  ))}
                  <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1 bg-white">
                    <input
                      type="color"
                      value={folioConfig.colorHex}
                      onChange={e => setFolioConfig({ ...folioConfig, colorHex: e.target.value })}
                      className="h-6 w-6 rounded cursor-pointer border-0 p-0"
                    />
                    <span className="text-[10px] font-mono text-slate-500 uppercase">{folioConfig.colorHex}</span>
                  </div>
                </div>
              </div>

              {/* Cuadrícula 3x3 y Offsets Manuales */}
              <div className="pt-2 border-t border-slate-100">
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
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* PESTAÑA 2: SELLO OFICIAL "OPERADO" Y CAPA DE FONDO                */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeTab === 'operado' && (
            <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-2xs space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Stamp className="h-4 w-4 text-red-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Sello Oficial &quot;OPERADO&quot;
                  </h3>
                </div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={operadoConfig.enabled}
                    onChange={e => setOperadoConfig({ ...operadoConfig, enabled: e.target.checked })}
                    className="accent-red-600 h-4 w-4 rounded"
                  />
                  <span>Activar Sello OPERADO</span>
                </label>
              </div>

              {/* Selector de Fecha Dinámico (Renderizado en ROJO) */}
              <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-red-900 uppercase flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-red-600" />
                    <span>Fecha Dinámica del Sello (Tinta Roja Oficial)</span>
                  </label>
                  <span className="text-[10px] font-mono font-bold bg-white text-red-700 px-2 py-0.5 rounded border border-red-200">
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
                    {['Hoy', 'Ayer', '30 JUL. 2026'].map(preset => (
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
                          } else {
                            setOperadoConfig({ ...operadoConfig, stampDateIso: '2026-07-30' });
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

              {/* Capa de Fondo (Underlay) / Garantía de Legibilidad */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={operadoConfig.isUnderlay}
                    onChange={e => setOperadoConfig({
                      ...operadoConfig,
                      isUnderlay: e.target.checked,
                      opacity: e.target.checked ? 28 : operadoConfig.opacity
                    })}
                    className="accent-[#581c2f] h-4 w-4 rounded mt-0.5"
                  />
                  <div>
                    <span className="block text-xs font-bold text-slate-800">
                      Capa de Fondo (Bajo el texto / Marca de agua)
                    </span>
                    <span className="text-[10px] text-slate-500 leading-relaxed block mt-0.5">
                      Garantiza que el sello se estampe con opacidad calibrada para que NUNCA cubra ni tape el texto ni la información del documento original.
                    </span>
                  </div>
                </label>

                {/* Slider de Opacidad */}
                <div className="pt-2 border-t border-slate-200/80">
                  <div className="flex justify-between text-[10px] font-bold text-slate-700 uppercase mb-1">
                    <span>Opacidad del Sello</span>
                    <span className="text-[#581c2f] font-mono">{operadoConfig.opacity}%</span>
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={100}
                    value={operadoConfig.opacity}
                    onChange={e => setOperadoConfig({ ...operadoConfig, opacity: Number(e.target.value) })}
                    className="w-full accent-[#581c2f] cursor-pointer"
                  />
                </div>
              </div>

              {/* Textos Institucionales Editables */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                    Encabezado Institucional
                  </label>
                  <input
                    type="text"
                    value={operadoConfig.institutionText}
                    onChange={e => setOperadoConfig({ ...operadoConfig, institutionText: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-[#FDFBF9] p-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                    Subtexto / Fondo
                  </label>
                  <input
                    type="text"
                    value={operadoConfig.subText}
                    onChange={e => setOperadoConfig({ ...operadoConfig, subText: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-[#FDFBF9] p-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* Posicionamiento Independiente Sello OPERADO */}
              <div className="pt-2 border-t border-slate-100">
                <PositionMatrix3x3
                  label="Ubicación del Sello OPERADO (Matriz 3x3)"
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
