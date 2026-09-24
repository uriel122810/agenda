import { PDFDocument, rgb, degrees, StandardFonts, PDFPage } from 'pdf-lib';

export type FontChoice = 'Helvetica' | 'TimesRoman' | 'Courier';

export interface FolioConfig {
  formatPreset: '000000' | 'FOL-2026-000' | 'OFI-000/2026' | 'FOL-0000' | 'custom';
  prefix: string;
  suffix: string;
  startNumber: number;
  increment: number;
  padLength: number;
  fontChoice: FontChoice;
  isBold: boolean;
  fontSize: number;
  colorHex: string;
  opacity: number; // 0 to 100
  style: 'boxed' | 'line' | 'text-only';
  institutionHeader: string;
  showMetadata: boolean; // date and page number
  // Placement
  positionMatrix: 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br' | 'free';
  normX: number; // 0 to 1
  normY: number; // 0 to 1 (0 is top, 1 is bottom)
  offsetX: number; // manual offset in points
  offsetY: number; // manual offset in points
  enabled: boolean;
}

export interface OperadoStampConfig {
  enabled: boolean;
  institutionText: string;
  operadoWord: string;
  subText: string;
  stampDateIso: string; // YYYY-MM-DD
  colorHex: string; // Box and institution text color (burgundy, gold, blue, dark)
  dateColorHex: string; // MUST BE RED (#dc2626)
  opacity: number; // 10 to 100
  isUnderlay: boolean; // Background layer / watermark mode (low opacity, non-blocking)
  width: number; // in points
  height: number; // in points
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
 * Format date in official Mexican stamp format (e.g. "24 SEP. 2026")
 */
export function formatOfficialStampDate(isoDateStr: string): string {
  if (!isoDateStr) return '';
  const parts = isoDateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const months = ['ENE.', 'FEB.', 'MAR.', 'ABR.', 'MAY.', 'JUN.', 'JUL.', 'AGO.', 'SEP.', 'OCT.', 'NOV.', 'DIC.'];
    const monthStr = months[monthIndex] || 'ENE.';
    return `${String(day).padStart(2, '0')} ${monthStr} ${year}`;
  }
  return isoDateStr;
}

/**
 * Generates formatted folio string based on index and configuration
 */
export function generateFolioString(seqIndex: number, config: FolioConfig): string {
  const currentVal = config.startNumber + seqIndex * config.increment;
  const numFormatted = String(Math.max(0, currentVal)).padStart(config.padLength, '0');

  switch (config.formatPreset) {
    case '000000':
      return String(Math.max(0, currentVal)).padStart(Math.max(6, config.padLength), '0');
    case 'FOL-2026-000':
      return `FOL-2026-${String(Math.max(0, currentVal)).padStart(Math.max(3, config.padLength), '0')}`;
    case 'OFI-000/2026':
      return `OFI-${String(Math.max(0, currentVal)).padStart(Math.max(3, config.padLength), '0')}/2026`;
    case 'FOL-0000':
      return `FOL-${String(Math.max(0, currentVal)).padStart(Math.max(4, config.padLength), '0')}`;
    case 'custom':
    default:
      return `${config.prefix || ''}${numFormatted}${config.suffix || ''}`;
  }
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
function getStandardFontName(fontChoice: FontChoice, isBold: boolean): StandardFonts {
  if (fontChoice === 'Courier') {
    return isBold ? StandardFonts.CourierBold : StandardFonts.Courier;
  }
  if (fontChoice === 'TimesRoman') {
    return isBold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman;
  }
  return isBold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica;
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
  const targetIndices = resolveTargetPageIndices(totalPages, settings.pageRange);

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

  for (let t = 0; t < targetIndices.length; t++) {
    const pageIdx = targetIndices[t];
    const page = pdfDoc.getPage(pageIdx);
    const { width: pageW, height: pageH } = page.getSize();
    const pageNumber = pageIdx + 1;

    // Sequence index for numbering (per-page or per-document)
    const seqIndex = settings.numberingScope === 'per-page'
      ? initialGlobalPageIndex + pageCounter
      : docIndex;

    // ── 1. ESTAMPAR SELLO OFICIAL "OPERADO" ──────────────────────────────────
    if (settings.operado.enabled) {
      const stampW = settings.operado.width || 190;
      const stampH = settings.operado.height || 85;
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

      // Fondo del sello (semi-transparente para jamás bloquear texto original)
      page.drawRectangle({
        x: stampX,
        y: stampY,
        width: stampW,
        height: stampH,
        color: rgb(0.98, 0.98, 0.99),
        opacity: operadoAlpha * 0.45,
        borderWidth: 2,
        borderColor: operadoBorderColor,
        borderOpacity: operadoAlpha
      });

      // Recuadro interior punteado / doble recuadro oficial
      const innerInset = 3.5;
      page.drawRectangle({
        x: stampX + innerInset,
        y: stampY + innerInset,
        width: stampW - innerInset * 2,
        height: stampH - innerInset * 2,
        borderWidth: 0.8,
        borderColor: operadoBorderColor,
        borderOpacity: operadoAlpha * 0.8
      });

      // Encabezado institucional superior del sello
      const instText = (settings.operado.institutionText || 'PAZSUMA • GESTIÓN PÚBLICA').toUpperCase();
      const instFontSize = 7;
      const instTextW = helveticaBold.widthOfTextAtSize(instText, instFontSize);
      page.drawText(instText, {
        x: stampX + (stampW - instTextW) / 2,
        y: stampY + stampH - 14,
        size: instFontSize,
        font: helveticaBold,
        color: operadoBorderColor,
        opacity: operadoAlpha
      });

      // Línea divisoria superior fina
      page.drawLine({
        start: { x: stampX + 8, y: stampY + stampH - 18 },
        end: { x: stampX + stampW - 8, y: stampY + stampH - 18 },
        thickness: 0.6,
        color: operadoBorderColor,
        opacity: operadoAlpha * 0.5
      });

      // Gran palabra "OPERADO"
      const operadoWord = (settings.operado.operadoWord || 'OPERADO').toUpperCase();
      const operadoFontSize = 17;
      const operadoWordW = helveticaBold.widthOfTextAtSize(operadoWord, operadoFontSize);
      page.drawText(operadoWord, {
        x: stampX + (stampW - operadoWordW) / 2,
        y: stampY + stampH - 38,
        size: operadoFontSize,
        font: helveticaBold,
        color: operadoBorderColor,
        opacity: operadoAlpha
      });

      // Línea divisoria central
      page.drawLine({
        start: { x: stampX + 8, y: stampY + stampH - 43 },
        end: { x: stampX + stampW - 8, y: stampY + stampH - 43 },
        thickness: 0.6,
        color: operadoBorderColor,
        opacity: operadoAlpha * 0.5
      });

      // CAJA DE FECHA CON TINTA ROJA OFICIAL (Imitando el clásico fechador institucional)
      const officialDateStr = formatOfficialStampDate(settings.operado.stampDateIso);
      const dateFontSize = 10;
      const dateTextW = courierBold.widthOfTextAtSize(officialDateStr, dateFontSize);

      // Recuadro tenue para enmarcar la fecha
      const dateBoxW = Math.max(dateTextW + 14, 110);
      const dateBoxH = 14;
      page.drawRectangle({
        x: stampX + (stampW - dateBoxW) / 2,
        y: stampY + 18,
        width: dateBoxW,
        height: dateBoxH,
        color: rgb(1, 0.95, 0.95),
        opacity: operadoAlpha * 0.5,
        borderColor: operadoDateColor,
        borderWidth: 0.5,
        borderOpacity: operadoAlpha * 0.7
      });

      // FECHA RENDERIZADA EN COLOR ROJO VIBRANTE
      page.drawText(officialDateStr, {
        x: stampX + (stampW - dateTextW) / 2,
        y: stampY + 22,
        size: dateFontSize,
        font: courierBold,
        color: operadoDateColor,
        opacity: Math.min(1.0, operadoAlpha * 1.25)
      });

      // Subtexto inferior (ej: FONDO FISCAL / EJERCICIO 2026)
      const subText = (settings.operado.subText || 'COMPROBADO Y ARCHIVADO').toUpperCase();
      const subFontSize = 6;
      const subTextW = helveticaRegular.widthOfTextAtSize(subText, subFontSize);
      page.drawText(subText, {
        x: stampX + (stampW - subTextW) / 2,
        y: stampY + 8,
        size: subFontSize,
        font: helveticaRegular,
        color: operadoBorderColor,
        opacity: operadoAlpha * 0.9
      });
    }

    // ── 2. ESTAMPAR LOGOTIPO / IMAGEN PERSONALIZADA ─────────────────────────
    if (settings.logo.enabled && embeddedImage) {
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

    // ── 3. ESTAMPAR FOLIO DE TEXTO / NUMERACIÓN ──────────────────────────────
    if (settings.folio.enabled) {
      const folioStr = generateFolioString(seqIndex, settings.folio);
      const fontSize = settings.folio.fontSize || 10;
      const titleText = `FOLIO: ${folioStr}`;
      const headerText = (settings.folio.institutionHeader || 'PAZSUMA • FOLIO OFICIAL').slice(0, 36);
      const metaText = `FECHA: ${new Date().toLocaleDateString('es-MX')} • PÁG. ${pageNumber}/${totalPages}`;

      // Calculate approximate box size
      const maxTextW = Math.max(
        folioFont.widthOfTextAtSize(titleText, fontSize + 1),
        folioFontRegular.widthOfTextAtSize(headerText, fontSize - 2),
        folioFontRegular.widthOfTextAtSize(metaText, fontSize - 3)
      );

      const boxW = Math.max(160, maxTextW + 24);
      const boxH = settings.folio.showMetadata ? 52 : 36;

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

      if (settings.folio.style === 'boxed') {
        page.drawRectangle({
          x: fX,
          y: fY,
          width: boxW,
          height: boxH,
          color: rgb(0.99, 0.99, 0.99),
          opacity: folioAlpha * 0.85,
          borderColor: folioColor,
          borderWidth: 1.2,
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

      const textLeft = fX + 8;

      if (settings.folio.showMetadata) {
        // Encabezado
        page.drawText(headerText, {
          x: textLeft,
          y: fY + boxH - 12,
          size: Math.max(6, fontSize - 3),
          font: helveticaBold,
          color: folioColor,
          opacity: folioAlpha * 0.85
        });

        // Folio destacado
        page.drawText(titleText, {
          x: textLeft,
          y: fY + boxH - 26,
          size: fontSize + 1,
          font: folioFont,
          color: folioColor,
          opacity: folioAlpha
        });

        // Metadatos
        page.drawText(metaText, {
          x: textLeft,
          y: fY + 6,
          size: Math.max(6, fontSize - 3.5),
          font: folioFontRegular,
          color: folioColor,
          opacity: folioAlpha * 0.75
        });
      } else {
        // Solo el Folio centrado en la caja
        page.drawText(titleText, {
          x: textLeft,
          y: fY + (boxH - fontSize) / 2,
          size: fontSize + 2,
          font: folioFont,
          color: folioColor,
          opacity: folioAlpha
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
