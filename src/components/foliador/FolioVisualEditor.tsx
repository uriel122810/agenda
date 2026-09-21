'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  UploadCloud, Stamp, Download, Image as ImageIcon, Check,
  Sparkles, RefreshCw, Eye, Sliders, Palette, Calendar,
  FileText, ShieldCheck, CheckCircle2, AlertCircle, X, Trash2,
  Layers, FileCheck, Archive, Hash, FolderDown, Plus, Info,
  ChevronRight, ArrowRight, ExternalLink
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';

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

export default function FolioVisualEditor({
  initialFolio = 'FOL-2026-0001',
  availableFolios = [],
  onFolioSaved,
  onClose,
  isDark = false
}: FolioVisualEditorProps) {
  // ── 1. Múltiples Archivos PDF ──────────────────────────────────────────────
  const [pdfFiles, setPdfFiles] = useState<ProcessedPdfItem[]>([]);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── 2. Logotipo Personalizado PNG ──────────────────────────────────────────
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoBytes, setLogoBytes] = useState<ArrayBuffer | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // ── 3. Parámetros del Sello y Membrete ─────────────────────────────────────
  const [folioBase, setFolioBase] = useState(initialFolio);
  const [autoIncrementFolios, setAutoIncrementFolios] = useState(true);
  const [institutionText, setInstitutionText] = useState('PAZSUMA • GESTIÓN INSTITUCIONAL');
  const [dateText, setDateText] = useState(() => {
    return new Date().toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  });
  const [securityHash, setSecurityHash] = useState('PZ-SEC-99A1');

  // ── 4. Posicionamiento, Estilo y Color ─────────────────────────────────────
  const [position, setPosition] = useState<
    'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'watermark-center'
  >('top-right');
  const [stampColor, setStampColor] = useState<'guinda' | 'dorado' | 'negro' | 'azul'>('guinda');
  const [opacity, setOpacity] = useState<number>(100);
  const [fontSize, setFontSize] = useState<number>(9);
  const [stampStyle, setStampStyle] = useState<'boxed' | 'line' | 'watermark'>('boxed');

  // ── 5. Selección de Páginas Objetivo ───────────────────────────────────────
  const [pageSelectionMode, setPageSelectionMode] = useState<'all' | 'first' | 'custom'>('all');
  const [customPagesInput, setCustomPagesInput] = useState<string>('1');

  // ── 6. Estados de Procesamiento y Descarga ──────────────────────────────────
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [overallSuccessMessage, setOverallSuccessMessage] = useState<string>('');
  const [isZipping, setIsZipping] = useState(false);

  // Actualizar folio base si cambia initialFolio
  useEffect(() => {
    if (initialFolio && !folioBase) {
      setFolioBase(initialFolio);
    }
  }, [initialFolio, folioBase]);

  // Documento activo para la vista previa
  const activePreviewFile = pdfFiles[selectedPreviewIndex] || null;

  // ── Manejador de Carga de Múltiples PDFs ────────────────────────────────────
  const handleAddPdfFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validPdfFiles = fileArray.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));

    if (validPdfFiles.length === 0) {
      alert('Por favor selecciona archivos en formato PDF.');
      return;
    }

    const newItems: ProcessedPdfItem[] = [];

    for (const file of validPdfFiles) {
      // Evitar duplicados por nombre y tamaño exacto
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
      setPdfFiles(prev => {
        const updated = [...prev, ...newItems];
        return updated;
      });
      setOverallSuccessMessage('');
    }
  };

  // ── Eliminar un PDF individualmente ────────────────────────────────────────
  const handleRemovePdfFile = (idToRemove: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPdfFiles(prev => {
      const indexToRemove = prev.findIndex(f => f.id === idToRemove);
      const updated = prev.filter(f => f.id !== idToRemove);

      // Limpiar URL de descarga si existía para liberar memoria
      const target = prev[indexToRemove];
      if (target?.stampedDocUrl) {
        URL.revokeObjectURL(target.stampedDocUrl);
      }

      // Ajustar índice de vista previa si es necesario
      if (selectedPreviewIndex >= updated.length) {
        setSelectedPreviewIndex(Math.max(0, updated.length - 1));
      }

      return updated;
    });
  };

  // ── Limpiar todos los archivos cargados ─────────────────────────────────────
  const handleClearAllFiles = () => {
    pdfFiles.forEach(f => {
      if (f.stampedDocUrl) URL.revokeObjectURL(f.stampedDocUrl);
    });
    setPdfFiles([]);
    setSelectedPreviewIndex(0);
    setOverallSuccessMessage('');
  };

  // ── Manejador de subida de Logo PNG ─────────────────────────────────────────
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('png') && !file.type.includes('image/')) {
      alert('Se recomienda subir una imagen en formato PNG con fondo transparente.');
    }

    setLogoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setLogoPreviewUrl(previewUrl);

    const buffer = await file.arrayBuffer();
    setLogoBytes(buffer);
  };

  const handleRemoveLogo = () => {
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoFile(null);
    setLogoPreviewUrl(null);
    setLogoBytes(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  // ── Parser de Rango de Páginas ──────────────────────────────────────────────
  const parsePageIndices = (totalPages: number): number[] => {
    if (pageSelectionMode === 'all') {
      return Array.from({ length: totalPages }, (_, i) => i);
    }
    if (pageSelectionMode === 'first') {
      return [0];
    }

    // Modo custom (páginas específicas)
    const indices = new Set<number>();
    const tokens = customPagesInput.split(/[,;\s]+/).filter(Boolean);

    tokens.forEach(token => {
      if (token.includes('-')) {
        const [startStr, endStr] = token.split('-');
        const start = parseInt(startStr.trim(), 10);
        const end = parseInt(endStr.trim(), 10);
        if (!isNaN(start) && !isNaN(end)) {
          const from = Math.max(1, Math.min(start, end));
          const to = Math.min(totalPages, Math.max(start, end));
          for (let p = from; p <= to; p++) {
            indices.add(p - 1);
          }
        }
      } else {
        const p = parseInt(token.trim(), 10);
        if (!isNaN(p) && p >= 1 && p <= totalPages) {
          indices.add(p - 1);
        }
      }
    });

    if (indices.size === 0) {
      // Si el formato no coincidió con ninguna página válida, estampar la primera por seguridad
      return [0];
    }

    return Array.from(indices).sort((a, b) => a - b);
  };

  // ── Generador correlativo de folios consecutivos para lote ───────────────────
  const computeFolioForIndex = (index: number): string => {
    if (!autoIncrementFolios || index === 0) {
      return folioBase || 'FOL-2026-0001';
    }

    // Intentar buscar números al final del folio (ej: OFI-2026-0001 -> OFI-2026-0002)
    const match = folioBase.match(/^(.*?)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const numStr = match[2];
      const nextNum = parseInt(numStr, 10) + index;
      return `${prefix}${String(nextNum).padStart(numStr.length, '0')}`;
    }

    return `${folioBase}-${index + 1}`;
  };

  // ── PROCESO DE ESTAMPADO MULTI-PDF CON PDF-LIB ─────────────────────────────
  const handleProcessAllDocuments = async () => {
    if (pdfFiles.length === 0) {
      alert('Por favor añade al menos un archivo PDF para estampar.');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);
    setOverallSuccessMessage('');

    const updatedFiles: ProcessedPdfItem[] = [...pdfFiles];

    try {
      for (let i = 0; i < updatedFiles.length; i++) {
        const item = updatedFiles[i];
        item.status = 'procesando';
        setPdfFiles([...updatedFiles]);
        setProcessingProgress(Math.round(((i + 0.3) / updatedFiles.length) * 100));

        try {
          const currentFolio = computeFolioForIndex(i);
          const pdfDoc = await PDFDocument.load(item.bytes, { ignoreEncryption: true });

          const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
          const helveticaRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

          // Incrustar logotipo PNG si existe
          let embeddedLogo: any = null;
          if (logoBytes) {
            try {
              if (logoFile?.type.includes('png') || logoFile?.name.toLowerCase().endsWith('.png')) {
                embeddedLogo = await pdfDoc.embedPng(logoBytes);
              } else {
                embeddedLogo = await pdfDoc.embedJpg(logoBytes);
              }
            } catch (logoErr) {
              console.warn('Incrustando logo alternativo:', logoErr);
            }
          }

          // Colores institucionales PazSuma
          let textColor = rgb(0.34, 0.11, 0.18); // Guinda PazSuma #581c2f
          let borderColor = rgb(0.34, 0.11, 0.18);
          let bgColor = rgb(0.98, 0.95, 0.95);

          if (stampColor === 'dorado') {
            textColor = rgb(0.70, 0.59, 0.34); // Dorado #b39656
            borderColor = rgb(0.70, 0.59, 0.34);
            bgColor = rgb(0.98, 0.97, 0.92);
          } else if (stampColor === 'negro') {
            textColor = rgb(0.12, 0.15, 0.20);
            borderColor = rgb(0.20, 0.24, 0.30);
            bgColor = rgb(0.96, 0.96, 0.97);
          } else if (stampColor === 'azul') {
            textColor = rgb(0.12, 0.25, 0.56);
            borderColor = rgb(0.12, 0.25, 0.56);
            bgColor = rgb(0.94, 0.96, 1.0);
          }

          const totalPages = pdfDoc.getPageCount();
          const targetPageIndices = parsePageIndices(totalPages);
          const alphaValue = Math.max(0.15, opacity / 100);

          // Estampar en cada página objetivo
          for (const pageIdx of targetPageIndices) {
            const page = pdfDoc.getPage(pageIdx);
            const { width, height } = page.getSize();
            const pageNumber = pageIdx + 1;

            // Dimensiones del sello según posición y estilo
            let stampW = 185;
            let stampH = 58;
            let x = width - stampW - 32;
            let y = height - stampH - 32;

            if (position === 'top-left') {
              x = 32;
              y = height - stampH - 32;
            } else if (position === 'top-center') {
              x = (width - stampW) / 2;
              y = height - stampH - 32;
            } else if (position === 'bottom-right') {
              x = width - stampW - 32;
              y = 32;
            } else if (position === 'bottom-left') {
              x = 32;
              y = 32;
            } else if (position === 'watermark-center') {
              stampW = Math.min(360, width * 0.7);
              stampH = 110;
              x = (width - stampW) / 2;
              y = (height - stampH) / 2;
            }

            // 1. Fondo y Borde del Sello
            if (stampStyle === 'boxed' || position === 'watermark-center') {
              page.drawRectangle({
                x,
                y,
                width: stampW,
                height: stampH,
                borderColor: borderColor,
                borderWidth: position === 'watermark-center' ? 2 : 1.25,
                color: bgColor,
                opacity: alphaValue,
                borderOpacity: alphaValue
              });
            } else if (stampStyle === 'line') {
              page.drawLine({
                start: { x, y: y + stampH },
                end: { x: x + stampW, y: y + stampH },
                thickness: 1.5,
                color: borderColor,
                opacity: alphaValue
              });
              page.drawLine({
                start: { x, y },
                end: { x: x + stampW, y },
                thickness: 0.75,
                color: borderColor,
                opacity: alphaValue * 0.7
              });
            }

            // 2. Logotipo PNG incrustado
            let textLeft = x + 10;
            if (embeddedLogo) {
              const maxLogoSize = position === 'watermark-center' ? 44 : 32;
              const logoDims = embeddedLogo.scaleToFit(maxLogoSize, maxLogoSize);
              const logoY = y + (stampH - logoDims.height) / 2;
              page.drawImage(embeddedLogo, {
                x: x + 8,
                y: logoY,
                width: logoDims.width,
                height: logoDims.height,
                opacity: alphaValue
              });
              textLeft = x + logoDims.width + 16;
            }

            // 3. Textos del Folio
            const titleFontSize = position === 'watermark-center' ? fontSize + 4 : fontSize + 1;
            const subtitleFontSize = position === 'watermark-center' ? fontSize - 1 : fontSize - 2.5;

            // Encabezado institucional
            page.drawText(institutionText.slice(0, 32), {
              x: textLeft,
              y: y + stampH - 14,
              size: subtitleFontSize,
              font: helveticaBold,
              color: textColor,
              opacity: alphaValue
            });

            // Folio
            page.drawText(`FOLIO: ${currentFolio}`, {
              x: textLeft,
              y: y + stampH - 27,
              size: titleFontSize,
              font: helveticaBold,
              color: textColor,
              opacity: alphaValue
            });

            // Fecha y conteo de páginas
            const metaLine = `FECHA: ${dateText} • PÁG. ${pageNumber}/${totalPages}`;
            page.drawText(metaLine, {
              x: textLeft,
              y: y + stampH - 39,
              size: subtitleFontSize,
              font: helveticaRegular,
              color: textColor,
              opacity: alphaValue
            });

            // Hash de seguridad
            page.drawText(`SEGURIDAD: ${securityHash}`, {
              x: textLeft,
              y: y + stampH - 49,
              size: Math.max(6, subtitleFontSize - 1),
              font: helveticaRegular,
              color: textColor,
              opacity: alphaValue * 0.85
            });
          }

          const modifiedBytes = await pdfDoc.save();
          const stampedBlob = new Blob([new Uint8Array(modifiedBytes) as unknown as BlobPart], {
            type: 'application/pdf'
          });
          const stampedDocUrl = URL.createObjectURL(stampedBlob);
          const stampedFileName = `${currentFolio}_${item.name}`;

          item.status = 'completado';
          item.stampedBlob = stampedBlob;
          item.stampedDocUrl = stampedDocUrl;
          item.stampedFileName = stampedFileName;
        } catch (fileErr: any) {
          console.error(`Error al procesar ${item.name}:`, fileErr);
          item.status = 'error';
          item.errorMessage = fileErr.message || 'Error al estampar';
        }

        setPdfFiles([...updatedFiles]);
        setProcessingProgress(Math.round(((i + 1) / updatedFiles.length) * 100));
      }

      const completedCount = updatedFiles.filter(f => f.status === 'completado').length;
      setOverallSuccessMessage(`¡${completedCount} documento(s) estampados exitosamente con folio y logotipo!`);

      if (onFolioSaved && completedCount > 0) {
        const firstCompleted = updatedFiles.find(f => f.status === 'completado');
        onFolioSaved({
          folio: folioBase,
          fecha: dateText,
          archivo_nombre: firstCompleted?.stampedFileName || 'documentos_estampados.pdf',
          url: firstCompleted?.stampedDocUrl,
          archivos_procesados: completedCount
        });
      }
    } catch (err: any) {
      console.error('Error general durante el estampado:', err);
      alert('Ocurrió un problema durante el procesamiento: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── DESCARGAS: Descargar todos empaquetados en un archivo ZIP ───────────────
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

  // ── DESCARGAS: Descargar todos consecutivamente (uno por uno) ────────────────
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

  // ── Descargar un archivo individual ─────────────────────────────────────────
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
      {/* ── ENCABEZADO DEL ESTAMPADOR ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E2D9] pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#581c2f] text-white shadow-xs">
              <Stamp className="h-5 w-5 text-[#b39656]" />
            </div>
            <span>Estampador</span>
            <span className="rounded-full bg-[#FBF0F3] px-2.5 py-0.5 text-xs font-bold text-[#581c2f] border border-[#EED7DC]">
              Oficial PazSuma
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Carga uno o múltiples documentos PDF, personaliza la posición visual, estampa tu escudo o logotipo PNG y descarga en lote.
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
                Puedes descargar los archivos individualmente desde la lista o presionar "Descargar todos".
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

      {/* ── GRID PRINCIPAL: CONTROLES (IZQ) + VISTA PREVIA & ARCHIVOS (DER) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUMNA IZQUIERDA: CONFIGURACIONES (5 COLS) */}
        <div className="lg:col-span-5 space-y-4">
          {/* SECCIÓN 1: CARGA MÚLTIPLE DE ARCHIVOS PDF */}
          <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#581c2f] flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                <span>1. Documentos PDF (Carga Múltiple)</span>
              </h3>
              {pdfFiles.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllFiles}
                  className="text-[11px] text-red-600 hover:underline font-semibold cursor-pointer"
                >
                  Limpiar lista
                </button>
              )}
            </div>

            {/* Zona de Drop & Carga */}
            <div
              onDragOver={e => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files) {
                  handleAddPdfFiles(e.dataTransfer.files);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                isDragging
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
              <div className="h-10 w-10 rounded-xl bg-[#FBF0F3] text-[#581c2f] flex items-center justify-center">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Arrastra o selecciona uno o varios PDFs
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Soporta selección múltiple de archivos a la vez
                </p>
              </div>
            </div>

            {/* Subida de Logotipo PNG */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-[#b39656]" />
                  <span>Logotipo o Escudo Personalizado (PNG)</span>
                </span>
                {logoPreviewUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="text-[10px] text-red-600 hover:underline font-semibold cursor-pointer"
                  >
                    Quitar logo
                  </button>
                )}
              </label>

              <label className="flex items-center gap-2.5 rounded-xl border border-dashed border-[#E8E2D9] bg-[#FDFBF9] p-2.5 text-xs text-slate-600 cursor-pointer hover:border-[#581c2f] transition">
                {logoPreviewUrl ? (
                  <img
                    src={logoPreviewUrl}
                    alt="Logo"
                    className="h-8 w-8 object-contain rounded bg-white p-0.5 border border-slate-200"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-[#b39656]/10 text-[#b39656] flex items-center justify-center shrink-0">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                )}
                <div className="truncate flex-1">
                  <span className="font-semibold text-slate-800 text-xs">
                    {logoFile ? logoFile.name : 'Subir logotipo PNG transparente'}
                  </span>
                  <p className="text-[10px] text-slate-400">
                    Se estampará junto al folio en cada documento
                  </p>
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* SECCIÓN 2: SELECCIÓN DE PÁGINAS OBJETIVO */}
          <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#581c2f] flex items-center gap-1.5">
              <Layers className="h-4 w-4" />
              <span>2. Selección de Páginas Objetivo</span>
            </h3>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setPageSelectionMode('all')}
                className={`p-2 rounded-xl text-center text-xs font-bold border transition cursor-pointer ${
                  pageSelectionMode === 'all'
                    ? 'border-[#581c2f] bg-[#FBF0F3] text-[#581c2f]'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Todas las páginas
              </button>
              <button
                type="button"
                onClick={() => setPageSelectionMode('first')}
                className={`p-2 rounded-xl text-center text-xs font-bold border transition cursor-pointer ${
                  pageSelectionMode === 'first'
                    ? 'border-[#581c2f] bg-[#FBF0F3] text-[#581c2f]'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Solo 1ª página
              </button>
              <button
                type="button"
                onClick={() => setPageSelectionMode('custom')}
                className={`p-2 rounded-xl text-center text-xs font-bold border transition cursor-pointer ${
                  pageSelectionMode === 'custom'
                    ? 'border-[#581c2f] bg-[#FBF0F3] text-[#581c2f]'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Páginas específicas
              </button>
            </div>

            {pageSelectionMode === 'custom' && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700">
                    Número exacto de página o rango:
                  </label>
                  <span className="text-[10px] text-slate-400">Ej: 1, 1-3, 2, 4</span>
                </div>
                <input
                  type="text"
                  value={customPagesInput}
                  onChange={e => setCustomPagesInput(e.target.value)}
                  placeholder="Ej: 1-3, 5, 8"
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-mono font-bold text-slate-800 focus:border-[#581c2f] focus:outline-none"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['1', '1-2', '1-5', '2'].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCustomPagesInput(preset)}
                      className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-slate-600 hover:border-[#581c2f] hover:text-[#581c2f] cursor-pointer transition"
                    >
                      Pág. {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECCIÓN 3: PARÁMETROS DEL FOLIO Y LEYENDAS */}
          <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#581c2f] flex items-center gap-1.5">
                <Hash className="h-4 w-4" />
                <span>3. Parámetros del Sello</span>
              </h3>
              {availableFolios.length > 0 && (
                <select
                  onChange={e => {
                    if (e.target.value) setFolioBase(e.target.value);
                  }}
                  className="text-[10px] rounded-lg border border-slate-200 bg-[#FDFBF9] px-2 py-1 text-slate-700 focus:outline-none"
                >
                  <option value="">Cargar de registro...</option>
                  {availableFolios.slice(0, 10).map(f => (
                    <option key={f.id} value={f.folio}>
                      {f.folio} ({f.tipo_documento})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                  Folio Base *
                </label>
                <input
                  type="text"
                  value={folioBase}
                  onChange={e => setFolioBase(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-[#FDFBF9] p-2 text-xs font-mono font-bold text-[#581c2f] focus:border-[#581c2f] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                  Fecha de Sellado
                </label>
                <input
                  type="text"
                  value={dateText}
                  onChange={e => setDateText(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-[#FDFBF9] p-2 text-xs text-slate-800 focus:border-[#581c2f] focus:outline-none"
                />
              </div>
            </div>

            {/* Checkbox auto-incremento de folios si hay múltiples PDFs */}
            {pdfFiles.length > 1 && (
              <label className="flex items-center gap-2 p-2 rounded-xl bg-[#FDFBF9] border border-[#E8E2D9] text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoIncrementFolios}
                  onChange={e => setAutoIncrementFolios(e.target.checked)}
                  className="accent-[#581c2f] h-4 w-4 rounded"
                />
                <span>
                  Incrementar folio automáticamente por cada PDF (ej: {folioBase}, {computeFolioForIndex(1)}, etc.)
                </span>
              </label>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                Membrete Institucional
              </label>
              <input
                type="text"
                value={institutionText}
                onChange={e => setInstitutionText(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-[#FDFBF9] p-2 text-xs text-slate-800 focus:border-[#581c2f] focus:outline-none"
              />
            </div>
          </div>

          {/* SECCIÓN 4: POSICIÓN Y ESTILO VISUAL */}
          <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#581c2f] flex items-center gap-1.5">
              <Palette className="h-4 w-4" />
              <span>4. Ubicación y Estilo</span>
            </h3>

            {/* Selector de Posición */}
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1.5">
                Ubicación del Folio sobre la Hoja
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  { id: 'top-right', label: 'Superior Derecha (Oficio Estándar)' },
                  { id: 'top-left', label: 'Superior Izquierda' },
                  { id: 'top-center', label: 'Superior Centro' },
                  { id: 'bottom-right', label: 'Inferior Derecha' },
                  { id: 'bottom-left', label: 'Inferior Izquierda' },
                  { id: 'watermark-center', label: 'Gran Marca de Agua Central' }
                ].map(pos => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => setPosition(pos.id as any)}
                    className={`rounded-lg p-2 text-left text-[11px] font-semibold border transition cursor-pointer ${
                      position === pos.id
                        ? 'bg-[#FBF0F3] border-[#581c2f] text-[#581c2f]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Selector de Color y Opacidad */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                  Color de Tinta
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'guinda', label: 'Vino', color: 'bg-[#581c2f]' },
                    { id: 'dorado', label: 'Oro', color: 'bg-[#b39656]' },
                    { id: 'negro', label: 'Negro', color: 'bg-slate-900' },
                    { id: 'azul', label: 'Azul', color: 'bg-blue-800' }
                  ].map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setStampColor(c.id as any)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-semibold cursor-pointer transition ${
                        stampColor === c.id
                          ? 'border-[#581c2f] bg-[#FBF0F3] text-[#581c2f]'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${c.color}`} />
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 uppercase mb-1">
                  <span>Opacidad</span>
                  <span className="text-[#581c2f] font-mono">{opacity}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={opacity}
                  onChange={e => setOpacity(Number(e.target.value))}
                  className="w-full accent-[#581c2f] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* BOTÓN PRINCIPAL: ESTAMPAR DOCUMENTOS */}
          <button
            type="button"
            onClick={handleProcessAllDocuments}
            disabled={isProcessing || pdfFiles.length === 0}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#581c2f] py-4 px-4 text-sm font-bold text-white shadow-md hover:bg-[#72223c] active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin text-[#b39656]" />
                <span>Procesando ({processingProgress}%)...</span>
              </>
            ) : (
              <>
                <Stamp className="h-5 w-5 text-[#b39656]" />
                <span>
                  {pdfFiles.length === 0
                    ? 'Carga uno o más PDFs para comenzar'
                    : pdfFiles.length === 1
                    ? 'Estampar y Generar PDF Oficial'
                    : `Estampar Lote (${pdfFiles.length} PDFs)`}
                </span>
              </>
            )}
          </button>
        </div>

        {/* COLUMNA DERECHA: LISTA DE ARCHIVOS CARGADOS Y VISTA PREVIA (7 COLS) */}
        <div className="lg:col-span-7 space-y-4">
          {/* LISTA DE ARCHIVOS CARGADOS CON ELIMINACIÓN Y DESCARGA INDIVIDUAL */}
          <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-[#581c2f]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Cola de Archivos ({pdfFiles.length})
                </h3>
              </div>

              {completedCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleDownloadAllAsZip}
                    disabled={isZipping}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-white text-[11px] font-bold transition cursor-pointer"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    <span>Descargar todos (.ZIP)</span>
                  </button>
                </div>
              )}
            </div>

            {pdfFiles.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <UploadCloud className="h-8 w-8 mx-auto mb-2 opacity-40 text-slate-500" />
                <p className="font-semibold text-slate-600">No has subido ningún PDF aún</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Usa el recuadro de la izquierda para arrastrar o seleccionar tus archivos
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {pdfFiles.map((item, idx) => {
                  const isSelectedForPreview = idx === selectedPreviewIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedPreviewIndex(idx)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                        isSelectedForPreview
                          ? 'border-[#581c2f] bg-[#FBF0F3]/50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                            item.status === 'completado'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-[#581c2f]'
                          }`}
                        >
                          {item.status === 'completado' ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 truncate" title={item.name}>
                            {item.name}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span>{item.sizeFormatted}</span>
                            <span>•</span>
                            <span>{item.pageCount} {item.pageCount === 1 ? 'pág' : 'págs'}</span>
                            {item.status === 'procesando' && (
                              <span className="text-amber-600 font-semibold flex items-center gap-1">
                                <RefreshCw className="h-2.5 w-2.5 animate-spin" /> Procesando...
                              </span>
                            )}
                            {item.status === 'completado' && (
                              <span className="text-emerald-600 font-bold">✓ Estampado</span>
                            )}
                            {item.status === 'error' && (
                              <span className="text-red-600 font-bold">Error</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Botones de acción individual: Descargar y Eliminar */}
                      <div className="flex items-center gap-1.5 ml-2 shrink-0">
                        {item.status === 'completado' && item.stampedDocUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadSingle(item);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#581c2f] hover:bg-[#72223c] px-2.5 py-1 text-white text-[11px] font-bold transition cursor-pointer shadow-2xs"
                            title="Descargar este archivo PDF estampado"
                          >
                            <Download className="h-3 w-3" />
                            <span className="hidden sm:inline">Descargar</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleRemovePdfFile(item.id, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                          title="Eliminar este archivo de la lista"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* LIENZO DE VISTA PREVIA INTERACTIVA */}
          <div className="rounded-2xl border border-[#E8E2D9] bg-white p-4 shadow-2xs flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-[#581c2f]" />
                <span>
                  Vista Previa Interactiva: {activePreviewFile ? activePreviewFile.name : 'Hoja Membretada Oficial'}
                </span>
              </span>
              <span className="rounded-full bg-[#FBF0F3] px-2.5 py-0.5 text-[10px] font-bold text-[#581c2f]">
                {activePreviewFile ? `${activePreviewFile.pageCount} páginas` : 'Plantilla A4'}
              </span>
            </div>

            {/* Lienzo visual que simula la hoja A4 con el sello posicionado en tiempo real */}
            <div className="relative min-h-[460px] bg-slate-100/80 rounded-xl p-4 flex items-center justify-center overflow-hidden">
              <div className="relative w-full max-w-[390px] aspect-[1/1.38] bg-white rounded-lg shadow-md border border-slate-200 p-6 flex flex-col justify-between select-none">
                {/* Contenido simulado del documento */}
                <div className="space-y-3 opacity-30">
                  <div className="h-3 w-44 bg-slate-400 rounded" />
                  <div className="h-2 w-28 bg-slate-300 rounded" />
                  <div className="pt-6 space-y-2">
                    <div className="h-2 w-full bg-slate-300 rounded" />
                    <div className="h-2 w-full bg-slate-300 rounded" />
                    <div className="h-2 w-4/5 bg-slate-300 rounded" />
                    <div className="h-2 w-full bg-slate-300 rounded" />
                    <div className="h-2 w-3/4 bg-slate-300 rounded" />
                    <div className="h-2 w-full bg-slate-300 rounded" />
                  </div>
                </div>

                {/* Sello colocado según la posición seleccionada */}
                <div
                  className={`absolute rounded-lg p-2 transition-all duration-200 shadow-xs ${
                    stampStyle === 'boxed'
                      ? stampColor === 'guinda'
                        ? 'border-2 border-[#581c2f] bg-[#FBF0F3]/90 text-[#581c2f]'
                        : stampColor === 'dorado'
                        ? 'border-2 border-[#b39656] bg-[#F5EFDF]/90 text-[#b39656]'
                        : stampColor === 'azul'
                        ? 'border-2 border-blue-800 bg-blue-50/90 text-blue-900'
                        : 'border-2 border-slate-900 bg-slate-100/90 text-slate-900'
                      : stampColor === 'guinda'
                      ? 'border-y-2 border-[#581c2f] bg-[#FBF0F3]/50 text-[#581c2f]'
                      : 'border-y-2 border-slate-800 bg-slate-50 text-slate-800'
                  } ${
                    position === 'top-right'
                      ? 'top-4 right-4'
                      : position === 'top-left'
                      ? 'top-4 left-4'
                      : position === 'top-center'
                      ? 'top-4 left-1/2 -translate-x-1/2'
                      : position === 'bottom-right'
                      ? 'bottom-4 right-4'
                      : position === 'bottom-left'
                      ? 'bottom-4 left-4'
                      : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-110'
                  }`}
                  style={{ opacity: opacity / 100 }}
                >
                  <div className="flex items-center gap-2">
                    {logoPreviewUrl ? (
                      <img
                        src={logoPreviewUrl}
                        alt="Logo"
                        className="h-8 w-8 object-contain rounded shrink-0"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded bg-[#581c2f] text-white text-[10px] font-bold shrink-0">
                        P
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-[8px] font-bold uppercase tracking-tight truncate max-w-[140px]">
                        {institutionText}
                      </div>
                      <div className="font-mono text-xs font-extrabold tracking-wider">
                        {folioBase}
                      </div>
                      <div className="text-[8px] text-slate-500">
                        {dateText} • Pág. 1/{activePreviewFile?.pageCount || 1}
                      </div>
                      <div className="text-[7px] text-slate-400 font-mono">
                        {securityHash}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pie simulado */}
                <div className="pt-8 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 opacity-60">
                  <span>PazSuma Gestión Documental</span>
                  <span>Página 1 de {activePreviewFile?.pageCount || 1}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
