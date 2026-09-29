import { PDFDocument, rgb, degrees, StandardFonts, PDFPage } from 'pdf-lib';
import { drawOfficialStampOnPdf, formatOfficialStampDate as formatOfficialStampDateFromStamp } from './OfficialStamp';

export type FontChoice =
  | 'Helvetica'
  | 'Helvetica-Bold'
  | 'Times-Roman'
  | 'Courier'
  | 'Courier-Bold'
  | 'TimesRoman';

export interface FolioConfig {
  formatPreset?: string;
  prefix?: string;
  suffix?: string;
  startNumber: number;
  increment: number;
  padLength: number;
  fontChoice: FontChoice;
  isBold: boolean;
  fontSize: number;
  colorHex: string;
  opacity: number; // 0 to 100
  style: 'boxed' | 'line' | 'text-only';
  showBorder?: boolean;
  institutionHeader?: string;
  showMetadata?: boolean; // date and page number
  // Placement
  positionMatrix: 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br' | 'free';
  normX: number; // 0 to 1
  normY: number; // 0 to 1 (0 is top, 1 is bottom)
  offsetX: number; // manual offset in points
  offsetY: number; // manual offset in points
  enabled: boolean;
  // Replicación de Páginas Independiente
  pageScope?: 'all' | 'first' | 'range' | 'custom';
  rangeFrom?: number;
  rangeTo?: number;
  customPages?: string;
}

export interface OperadoStampConfig {
  enabled: boolean;
  showBorder?: boolean;
  showHeader?: boolean;
  headerText?: string;
  institutionText?: string;
  institutionLine1?: string;
  institutionLine2?: string;
  institutionLine3?: string;
  operadoWord: string;
  subText?: string;
  shieldImageUrl?: string | null;
  shieldBytes?: ArrayBuffer | null;
  stampDateIso: string; // YYYY-MM-DD
  colorHex: string; // Official blue ink: #003399
  dateColorHex: string; // Official red ink: #E62B4A
  opacity: number; // 10 to 100 (default: 88, simulating real rubber stamp ink)
  isUnderlay: boolean; // Background layer / watermark mode (low opacity, non-blocking)
  width: number; // in points (default: 210)
  height: number; // in points (default: 105, or 130 with header)
  // Placement
  positionMatrix: 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br' | 'free';
  normX: number;
  normY: number;
  offsetX: number;
  offsetY: number;
}

export interface LogoStampConfig {
  enabled: boolean;
  fileBytes: ArrayBuffer | null;
  fileType: string; // 'image/png' | 'image/jpeg'
  width: number; // in points
  height: number; // in points
  rotationAngle: number; // 0 to 360 degrees
  opacity: number; // 10 to 100
  positionMatrix: 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br' | 'free';
  normX: number;
  normY: number;
  offsetX: number;
  offsetY: number;
}

export interface PageRangeConfig {
  mode: 'all' | 'first' | 'range' | 'custom';
  rangeFrom: number;
  rangeTo: number;
  customPages: string; // e.g. "1, 3, 5-7"
}

export interface DocumentStampSettings {
  folio: FolioConfig;
  operado: OperadoStampConfig;
  logo: LogoStampConfig;
  pageRange: PageRangeConfig;
  numberingScope: 'per-document' | 'per-page';
}

/**
 * Format date in official Mexican stamp format (e.g. "30 JUL. 2026")
 */
export function formatOfficialStampDate(isoDateStr: string): string {
  return formatOfficialStampDateFromStamp(isoDateStr);
}

/**
 * Generates formatted folio string based on index and configuration.
 * Consists strictly of the consecutive number formatted with zero-padding (e.g. 136, 008, 000009).
 * Prefixes and suffixes are completely eliminated.
 */
export function generateFolioString(seqIndex: number, config: FolioConfig): string {
  const currentVal = config.startNumber + seqIndex * config.increment;
  const padLength = Math.max(1, config.padLength || 1);
  return String(Math.max(0, currentVal)).padStart(padLength, '0');
}

/**
 * Converts Hex color string (#rrggbb) to pdf-lib rgb values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length !== 6) {
    return { r: 0.2, g: 0.2, b: 0.2 };
  }
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return { r, g, b };
}

/**
 * Resolves which 0-based page indices should be stamped
 */
export function resolveTargetPageIndices(totalPages: number, config: PageRangeConfig): number[] {
  if (config.mode === 'all') {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  if (config.mode === 'first') {
    return [0];
  }
  if (config.mode === 'range') {
    const from = Math.max(1, Math.min(config.rangeFrom || 1, totalPages));
    const to = Math.min(totalPages, Math.max(from, config.rangeTo || totalPages));
    const indices: number[] = [];
    for (let p = from; p <= to; p++) {
      indices.push(p - 1);
    }
    return indices;
  }
  if (config.mode === 'custom') {
    const set = new Set<number>();
    const tokens = (config.customPages || '').split(/[,;\s]+/).filter(Boolean);
    tokens.forEach(tok => {
      if (tok.includes('-')) {
        const [a, b] = tok.split('-');
        const start = parseInt(a.trim(), 10);
        const end = parseInt(b.trim(), 10);
        if (!isNaN(start) && !isNaN(end)) {
          const from = Math.max(1, Math.min(start, end));
          const to = Math.min(totalPages, Math.max(start, end));
          for (let p = from; p <= to; p++) {
            set.add(p - 1);
          }
        }
      } else {
        const p = parseInt(tok.trim(), 10);
        if (!isNaN(p) && p >= 1 && p <= totalPages) {
          set.add(p - 1);
        }
      }
    });
    const result = Array.from(set).sort((a, b) => a - b);
    return result.length > 0 ? result : [0];
  }
  return [0];
}

/**
 * Calculates absolute coordinates on PDF page from normalized coordinates (0 to 1)
 * Takes element dimensions into account.
 * Note: PDF Y=0 is bottom, DOM Y=0 is top.
 */
export function calculatePdfPlacement(
  normX: number,
  normY: number,
  elemW: number,
  elemH: number,
  pageW: number,
  pageH: number,
  offsetX: number = 0,
  offsetY: number = 0
): { x: number; y: number } {
  // Horizontal: normX = 0 -> left edge (0), normX = 1 -> right edge (pageW - elemW)
  const baseX = normX * Math.max(0, pageW - elemW);
  // Vertical: normY = 0 -> top edge (pageH - elemH), normY = 1 -> bottom edge (0)
  const baseY = (1 - normY) * Math.max(0, pageH - elemH);

  // Apply manual offsets (offsetX increases rightward, offsetY in PDF points: positive moves up)
  const x = Math.max(0, Math.min(pageW - elemW, baseX + offsetX));
  const y = Math.max(0, Math.min(pageH - elemH, baseY + offsetY));

  return { x, y };
}

/**
 * Selects standard font from pdf-lib
 */
export function getStandardFontName(fontChoice: FontChoice, isBold: boolean = false): StandardFonts {
  switch (fontChoice) {
    case 'Helvetica-Bold':
      return StandardFonts.HelveticaBold;
    case 'Helvetica':
      return isBold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica;
    case 'Times-Roman':
    case 'TimesRoman':
      return isBold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman;
    case 'Courier-Bold':
      return StandardFonts.CourierBold;
    case 'Courier':
      return isBold ? StandardFonts.CourierBold : StandardFonts.Courier;
    default:
      return isBold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica;
  }
}

/**
 * Core function to stamp a single PDF with all configured elements:
 * - Folio text
 * - Official "OPERADO" stamp with red date
 * - Custom logo image (scaled, rotated)
 */
export async function stampSinglePdf(
  sourceBytes: ArrayBuffer,
  settings: DocumentStampSettings,
  docIndex: number = 0,
  initialGlobalPageIndex: number = 0
): Promise<{ modifiedBytes: Uint8Array; pageCount: number; pagesStamped: number }> {
  const pdfDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
  const totalPages = pdfDoc.getPageCount();

  // Resolve target indices for each element independently
  const operadoIndices = settings.operado.enabled
    ? resolveTargetPageIndices(totalPages, settings.pageRange)
    : [];

  const folioRangeConfig: PageRangeConfig = settings.folio.pageScope
    ? {
        mode: settings.folio.pageScope,
        rangeFrom: settings.folio.rangeFrom || 1,
        rangeTo: settings.folio.rangeTo || totalPages,
        customPages: settings.folio.customPages || ''
      }
    : settings.pageRange;

  const folioIndices = settings.folio.enabled
    ? resolveTargetPageIndices(totalPages, folioRangeConfig)
    : [];

  const logoIndices = settings.logo.enabled
    ? resolveTargetPageIndices(totalPages, settings.pageRange)
    : [];

  // Union of all target page indices
  const allTargetIndices = Array.from(
    new Set([...operadoIndices, ...folioIndices, ...logoIndices])
  ).sort((a, b) => a - b);

  // Embed Fonts
  const folioFont = await pdfDoc.embedFont(getStandardFontName(settings.folio.fontChoice, settings.folio.isBold));
  const folioFontRegular = await pdfDoc.embedFont(getStandardFontName(settings.folio.fontChoice, false));
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const courierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  // Embed Logo Image if provided
  let embeddedImage: any = null;
  if (settings.logo.enabled && settings.logo.fileBytes) {
    try {
      if (settings.logo.fileType?.includes('png') || settings.logo.fileType === 'png') {
        embeddedImage = await pdfDoc.embedPng(settings.logo.fileBytes);
      } else {
        embeddedImage = await pdfDoc.embedJpg(settings.logo.fileBytes);
      }
    } catch (imgErr) {
      console.warn('No se pudo incrustar la imagen PNG/JPG en pdf-lib:', imgErr);
    }
  }

  // Pre-calculate colors
  const folioRgb = hexToRgb(settings.folio.colorHex);
  const folioColor = rgb(folioRgb.r, folioRgb.g, folioRgb.b);
  const folioAlpha = Math.max(0.1, settings.folio.opacity / 100);

  const operadoBorderRgb = hexToRgb(settings.operado.colorHex);
  const operadoBorderColor = rgb(operadoBorderRgb.r, operadoBorderRgb.g, operadoBorderRgb.b);
  // Red color for the stamp date as strictly required
  const operadoDateRgb = hexToRgb(settings.operado.dateColorHex || '#dc2626');
  const operadoDateColor = rgb(operadoDateRgb.r, operadoDateRgb.g, operadoDateRgb.b);

  // Underlay / Background layer opacity: if isUnderlay is active, ensure opacity is non-blocking (e.g. 0.25 - 0.35)
  const operadoAlpha = settings.operado.isUnderlay
    ? Math.min(0.35, Math.max(0.15, settings.operado.opacity / 100))
    : Math.max(0.15, settings.operado.opacity / 100);

  const logoAlpha = Math.max(0.1, settings.logo.opacity / 100);

  let pageCounter = 0;

  for (let t = 0; t < allTargetIndices.length; t++) {
    const pageIdx = allTargetIndices[t];
    const page = pdfDoc.getPage(pageIdx);
    const { width: pageW, height: pageH } = page.getSize();
    const pageNumber = pageIdx + 1;

    // Sequence index for numbering (per-page or per-document)
    const seqIndex = settings.numberingScope === 'per-page'
      ? initialGlobalPageIndex + pageCounter
      : docIndex;

    const shouldStampOperado = settings.operado.enabled && operadoIndices.includes(pageIdx);
    const shouldStampLogo = settings.logo.enabled && logoIndices.includes(pageIdx);
    const shouldStampFolio = settings.folio.enabled && folioIndices.includes(pageIdx);

    // ── 1. ESTAMPAR SELLO OFICIAL DE TRES/CUATRO NIVELES ("OPERADO") ─────────────
    if (shouldStampOperado) {
      const defaultStampH = settings.operado.showHeader ? 130 : 105;
      const stampW = settings.operado.width || 210;
      const stampH = settings.operado.height || defaultStampH;
      const { x: stampX, y: stampY } = calculatePdfPlacement(
        settings.operado.normX,
        settings.operado.normY,
        stampW,
        stampH,
        pageW,
        pageH,
        settings.operado.offsetX,
        settings.operado.offsetY
      );

      // Extraer bytes de escudo personalizado si existen
      const shieldBytes: ArrayBuffer | null = settings.operado.shieldBytes || null;

      await drawOfficialStampOnPdf(page, pdfDoc, {
        x: stampX,
        y: stampY,
        width: stampW,
        height: stampH,
        opacity: operadoAlpha,
        inkBlue: settings.operado.colorHex || '#003399',
        inkRed: settings.operado.dateColorHex || '#E62B4A',
        date: settings.operado.stampDateIso,
        operadoText: settings.operado.operadoWord || 'OPERADO',
        institutionLine1: settings.operado.institutionLine1 || settings.operado.institutionText || 'H. AYUNTAMIENTO',
        institutionLine2: settings.operado.institutionLine2 || 'DE LA PAZ',
        institutionLine3: settings.operado.institutionLine3 || '2024 - 2027',
        shieldImageUrl: settings.operado.shieldImageUrl || null,
        shieldImageBytes: shieldBytes,
        showBorder: settings.operado.showBorder !== false,
        showHeader: Boolean(settings.operado.showHeader),
        headerText: settings.operado.headerText || 'DIRECCIÓN DE EGRESOS'
      });
    }

    // ── 2. ESTAMPAR LOGOTIPO / IMAGEN PERSONALIZADA ─────────────────────────
    if (shouldStampLogo && embeddedImage) {
      const logoW = settings.logo.width || 60;
      const logoH = settings.logo.height || 60;
      const { x: logoX, y: logoY } = calculatePdfPlacement(
        settings.logo.normX,
        settings.logo.normY,
        logoW,
        logoH,
        pageW,
        pageH,
        settings.logo.offsetX,
        settings.logo.offsetY
      );

      page.drawImage(embeddedImage, {
        x: logoX,
        y: logoY,
        width: logoW,
        height: logoH,
        opacity: logoAlpha,
        rotate: degrees(settings.logo.rotationAngle || 0)
      });
    }

    // ── 3. ESTAMPAR FOLIO NUMÉRICO / TEXTO ────────────────────────────────────
    if (shouldStampFolio) {
      const folioFont = await pdfDoc.embedFont(getStandardFontName(settings.folio.fontChoice, settings.folio.isBold));
      const folioFontRegular = await pdfDoc.embedFont(getStandardFontName(settings.folio.fontChoice, false));
      const folioStr = generateFolioString(seqIndex, settings.folio);
      const fontSize = settings.folio.fontSize || 14;
      const showBorder = settings.folio.showBorder ?? (settings.folio.style === 'boxed');

      if (!settings.folio.showMetadata) {
        // Modo Folio Numérico Puro
        const textW = folioFont.widthOfTextAtSize(folioStr, fontSize);
        const textH = fontSize;

        if (showBorder) {
          // Con Marco: Dibuja un recuadro limpio con borde delgado alrededor del número
          const padX = 8;
          const padY = 5;
          const boxW = Math.max(36, textW + padX * 2);
          const boxH = fontSize + padY * 2;

          const { x: fX, y: fY } = calculatePdfPlacement(
            settings.folio.normX,
            settings.folio.normY,
            boxW,
            boxH,
            pageW,
            pageH,
            settings.folio.offsetX,
            settings.folio.offsetY
          );

          page.drawRectangle({
            x: fX,
            y: fY,
            width: boxW,
            height: boxH,
            color: rgb(0.99, 0.99, 0.99),
            opacity: folioAlpha * 0.85,
            borderColor: folioColor,
            borderWidth: 1.0,
            borderOpacity: folioAlpha
          });

          page.drawText(folioStr, {
            x: fX + padX,
            y: fY + padY + 1,
            size: fontSize,
            font: folioFont,
            color: folioColor,
            opacity: folioAlpha
          });
        } else {
          // Sin Marco: Se imprimirá únicamente el número puro sobre el papel sin ningún recuadro alrededor
          const { x: fX, y: fY } = calculatePdfPlacement(
            settings.folio.normX,
            settings.folio.normY,
            textW,
            textH,
            pageW,
            pageH,
            settings.folio.offsetX,
            settings.folio.offsetY
          );

          page.drawText(folioStr, {
            x: fX,
            y: Math.max(4, Math.min(pageH - fontSize - 4, fY)),
            size: fontSize,
            font: folioFont,
            color: folioColor,
            opacity: folioAlpha
          });
        }
      } else {
        // Modo Enmarcado o con Metadatos
        const headerText = (settings.folio.institutionHeader || 'PAZSUMA • FOLIO OFICIAL').slice(0, 36);
        const metaText = `FECHA: ${new Date().toLocaleDateString('es-MX')} • PÁG. ${pageNumber}/${totalPages}`;

        const maxTextW = Math.max(
          folioFont.widthOfTextAtSize(folioStr, fontSize),
          settings.folio.showMetadata ? folioFontRegular.widthOfTextAtSize(headerText, Math.max(6, fontSize - 4)) : 0,
          settings.folio.showMetadata ? folioFontRegular.widthOfTextAtSize(metaText, Math.max(6, fontSize - 5)) : 0
        );

        const boxW = Math.max(80, maxTextW + 18);
        const boxH = Math.max(48, fontSize * 2.8);

        const { x: fX, y: fY } = calculatePdfPlacement(
          settings.folio.normX,
          settings.folio.normY,
          boxW,
          boxH,
          pageW,
          pageH,
          settings.folio.offsetX,
          settings.folio.offsetY
        );

        if (showBorder) {
          page.drawRectangle({
            x: fX,
            y: fY,
            width: boxW,
            height: boxH,
            color: rgb(0.99, 0.99, 0.99),
            opacity: folioAlpha * 0.85,
            borderColor: folioColor,
            borderWidth: 1.0,
            borderOpacity: folioAlpha
          });
        } else if (settings.folio.style === 'line') {
          page.drawLine({
            start: { x: fX, y: fY + boxH },
            end: { x: fX + boxW, y: fY + boxH },
            thickness: 1.5,
            color: folioColor,
            opacity: folioAlpha
          });
          page.drawLine({
            start: { x: fX, y: fY },
            end: { x: fX + boxW, y: fY },
            thickness: 0.75,
            color: folioColor,
            opacity: folioAlpha * 0.7
          });
        }

        const textLeft = fX + 9;

        // Encabezado
        page.drawText(headerText, {
          x: textLeft,
          y: fY + boxH - 12,
          size: Math.max(6, fontSize - 4),
          font: helveticaBold,
          color: folioColor,
          opacity: folioAlpha * 0.85
        });

        // Folio destacado
        page.drawText(folioStr, {
          x: textLeft,
          y: fY + boxH - 26,
          size: fontSize,
          font: folioFont,
          color: folioColor,
          opacity: folioAlpha
        });

        // Metadatos
        page.drawText(metaText, {
          x: textLeft,
          y: fY + 6,
          size: Math.max(6, fontSize - 5),
          font: folioFontRegular,
          color: folioColor,
          opacity: folioAlpha * 0.75
        });
      }
    }

    pageCounter++;
  }

  const modifiedBytes = await pdfDoc.save();
  return {
    modifiedBytes,
    pageCount: totalPages,
    pagesStamped: pageCounter
  };
}

/**
 * Uploads stamped PDF bytes to Supabase Storage bucket 'documentos_folios'
 */
export async function uploadStampedPdfToSupabase(
  pdfBytes: Uint8Array,
  fileName: string,
  folioNumber: string,
  supabaseClient: any
): Promise<{ publicUrl: string | null; storagePath: string }> {
  const cleanName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const cleanFolio = folioNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  const storagePath = `${cleanFolio}_${Date.now()}_${cleanName}`;

  try {
    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from('documentos_folios')
      .upload(storagePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.warn('Nota al subir a Supabase Storage:', uploadError.message);
      return { publicUrl: null, storagePath };
    }

    const { data: publicUrlData } = supabaseClient
      .storage
      .from('documentos_folios')
      .getPublicUrl(storagePath);

    return {
      publicUrl: publicUrlData?.publicUrl || null,
      storagePath
    };
  } catch (err: any) {
    console.warn('Excepción en uploadStampedPdfToSupabase:', err.message);
    return { publicUrl: null, storagePath };
  }
}
