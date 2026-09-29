import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { stampSinglePdf, generateStampsOnlyPdf, DocumentStampSettings } from '../stampEngine';

async function runStampsOnlyValidationTests() {
  console.log('🧪 Starting Parallel Stamps-Only Document ("_SOLO_SELLOS.pdf") Tests...\n');

  // ── Step 1: Create a 5-page source PDF with different page dimensions ──
  const baseDoc = await PDFDocument.create();
  const font = await baseDoc.embedFont(StandardFonts.Helvetica);

  // Page 1: Letter Portrait (612 x 792)
  const p1 = baseDoc.addPage([612, 792]);
  p1.drawText('Original Content Page 1', { x: 50, y: 700, size: 12, font, color: rgb(0, 0, 0) });

  // Page 2: A4 Portrait (595 x 842)
  const p2 = baseDoc.addPage([595, 842]);
  p2.drawText('Original Content Page 2', { x: 50, y: 750, size: 12, font, color: rgb(0, 0, 0) });

  // Page 3: Legal Portrait (612 x 1008)
  const p3 = baseDoc.addPage([612, 1008]);
  p3.drawText('Original Content Page 3', { x: 50, y: 900, size: 12, font, color: rgb(0, 0, 0) });

  // Page 4: Letter Landscape (792 x 612)
  const p4 = baseDoc.addPage([792, 612]);
  p4.drawText('Original Content Page 4', { x: 50, y: 500, size: 12, font, color: rgb(0, 0, 0) });

  // Page 5: Letter Portrait (612 x 792)
  const p5 = baseDoc.addPage([612, 792]);
  p5.drawText('Original Content Page 5', { x: 50, y: 700, size: 12, font, color: rgb(0, 0, 0) });

  const baseBytes = (await baseDoc.save()).buffer as ArrayBuffer;

  // ── Step 2: Configure Settings selecting ONLY pages 1 and 3 ──
  const settings: DocumentStampSettings = {
    folio: {
      enabled: true,
      showBorder: false,
      startNumber: 42,
      increment: 1,
      padLength: 4,
      fontChoice: 'Helvetica',
      isBold: true,
      fontSize: 14,
      colorHex: '#1e293b',
      opacity: 95,
      style: 'text-only',
      showMetadata: false,
      positionMatrix: 'tr',
      normX: 0.9,
      normY: 0.08,
      offsetX: 0,
      offsetY: 0
    },
    operado: {
      enabled: true,
      showBorder: false,
      showHeader: true,
      headerText: 'DIRECCIÓN DE EGRESOS',
      operadoWord: 'OPERADO',
      institutionLine1: 'H. AYUNTAMIENTO',
      institutionLine2: 'DE LA PAZ',
      institutionLine3: '2024 - 2027',
      stampDateIso: '2026-09-29',
      colorHex: '#003399',
      dateColorHex: '#E62B4A',
      opacity: 90,
      isUnderlay: false,
      width: 210,
      height: 130,
      positionMatrix: 'bc',
      normX: 0.5,
      normY: 0.9,
      offsetX: 0,
      offsetY: 0
    },
    logo: {
      enabled: false,
      fileBytes: null,
      fileType: 'image/png',
      width: 60,
      height: 60,
      rotationAngle: 0,
      opacity: 100,
      positionMatrix: 'tl',
      normX: 0.05,
      normY: 0.05,
      offsetX: 0,
      offsetY: 0
    },
    pageRange: {
      mode: 'custom',
      rangeFrom: 1,
      rangeTo: 5,
      customPages: '1, 3' // Only pages 1 and 3!
    },
    numberingScope: 'per-page'
  };

  // ── TEST 1: stampSinglePdf with generateStampsOnly: true ──
  console.log('Test 1: stampSinglePdf generating both primary and stamps-only PDF');
  const result = await stampSinglePdf(baseBytes, settings, 0, 0, { generateStampsOnly: true });

  if (!result.modifiedBytes || result.modifiedBytes.byteLength === 0) {
    throw new Error('Primary modifiedBytes is missing or empty');
  }
  if (!result.stampsOnlyBytes || result.stampsOnlyBytes.byteLength === 0) {
    throw new Error('Secondary stampsOnlyBytes is missing or empty');
  }

  console.log(`  ✓ Primary PDF generated: ${result.modifiedBytes.byteLength} bytes`);
  console.log(`  ✓ Stamps-Only PDF generated: ${result.stampsOnlyBytes.byteLength} bytes`);
  console.log(`  ✓ Stamped pages count: ${result.pagesStamped} (expected 2 pages: 1 and 3)`);

  if (result.pagesStamped !== 2) {
    throw new Error(`Expected exactly 2 pages stamped, got ${result.pagesStamped}`);
  }

  // ── TEST 2: Verify page count and exact dimensions in Stamps-Only PDF ──
  console.log('\nTest 2: Dimension matching on each page of Stamps-Only PDF');
  const stampsDoc = await PDFDocument.load(result.stampsOnlyBytes);
  const totalStampsPages = stampsDoc.getPageCount();

  if (totalStampsPages !== 5) {
    throw new Error(`Expected exactly 5 pages in stamps-only document, got ${totalStampsPages}`);
  }
  console.log(`  ✓ Total page count matches original: ${totalStampsPages} pages`);

  const expectedDimensions = [
    { w: 612, h: 792, name: 'Page 1 (Letter)' },
    { w: 595, h: 842, name: 'Page 2 (A4)' },
    { w: 612, h: 1008, name: 'Page 3 (Legal)' },
    { w: 792, h: 612, name: 'Page 4 (Landscape)' },
    { w: 612, h: 792, name: 'Page 5 (Letter)' }
  ];

  for (let i = 0; i < 5; i++) {
    const page = stampsDoc.getPage(i);
    const size = page.getSize();
    const expected = expectedDimensions[i];
    console.log(`  ✓ ${expected.name}: ${size.width}x${size.height} (expected ${expected.w}x${expected.h})`);
    if (Math.abs(size.width - expected.w) > 0.01 || Math.abs(size.height - expected.h) > 0.01) {
      throw new Error(`Dimension mismatch on page ${i + 1}: got ${size.width}x${size.height}, expected ${expected.w}x${expected.h}`);
    }
  }

  // ── TEST 3: Verify unselected pages (2, 4, 5) remain blank ──
  console.log('\nTest 3: Unselected pages isolation (pages 2, 4, 5 must be blank)');
  // A completely blank page in pdf-lib has no Content stream or empty contents
  for (const emptyIdx of [1, 3, 4]) {
    const emptyPage = stampsDoc.getPage(emptyIdx);
    const contentsRef = (emptyPage.node as any).Contents();
    const isBlank = !contentsRef || (contentsRef.asArray ? contentsRef.asArray().length === 0 : false);
    console.log(`  ✓ Page ${emptyIdx + 1} blank check: ${isBlank ? 'BLANK (No stamps drawn)' : 'Contents present'}`);
    if (!isBlank) {
      throw new Error(`Page ${emptyIdx + 1} should be completely blank, but content was found!`);
    }
  }

  // ── TEST 4: Verify selected pages (1 and 3) have stamped contents ──
  console.log('\nTest 4: Selected pages (1 and 3) contain stamps');
  for (const stampedIdx of [0, 2]) {
    const stampedPage = stampsDoc.getPage(stampedIdx);
    const contentsRef = (stampedPage.node as any).Contents();
    const hasContent = contentsRef && (contentsRef.asArray ? contentsRef.asArray().length > 0 : true);
    console.log(`  ✓ Page ${stampedIdx + 1} stamped check: ${hasContent ? 'STAMPS PRESENT' : 'EMPTY'}`);
    if (!hasContent) {
      throw new Error(`Page ${stampedIdx + 1} should have stamps, but was blank!`);
    }
  }

  // ── TEST 5: Standalone generateStampsOnlyPdf function ──
  console.log('\nTest 5: Standalone generateStampsOnlyPdf function validation');
  const standaloneResult = await generateStampsOnlyPdf(baseBytes, settings);
  const standaloneDoc = await PDFDocument.load(standaloneResult.modifiedBytes);
  if (standaloneDoc.getPageCount() !== 5) {
    throw new Error(`Expected 5 pages from generateStampsOnlyPdf, got ${standaloneDoc.getPageCount()}`);
  }
  console.log(`  ✓ Standalone generateStampsOnlyPdf produced valid 5-page PDF (${standaloneResult.modifiedBytes.byteLength} bytes)`);

  console.log('\n🎉 ALL STAMPS-ONLY PARALLEL GENERATION TESTS PASSED!');
}

runStampsOnlyValidationTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
