import { PDFDocument } from 'pdf-lib';
import { stampSinglePdf, DocumentStampSettings } from '../stampEngine';
import { drawOfficialStampOnPdf, generateOfficialStampSvgString } from '../OfficialStamp';

async function runHeaderValidationTests() {
  console.log('🧪 Starting Stamp Header ("DIRECCIÓN DE EGRESOS") Tests...\n');

  // Base 1-page PDF
  const baseDoc = await PDFDocument.create();
  baseDoc.addPage([612, 792]);
  const baseBytes = (await baseDoc.save()).buffer as ArrayBuffer;

  // ── TEST 1: Direct Vector calls for showHeader: true + showBorder: true ──
  console.log('Test 1: showHeader: true + showBorder: true (4 tiers with 3 divider lines)');
  {
    const doc = await PDFDocument.create();
    const page = doc.addPage([612, 792]);
    let rectCalls = 0;
    let lineCalls = 0;
    let drawnTexts: string[] = [];

    const origRect = page.drawRectangle.bind(page);
    page.drawRectangle = (opts: any) => {
      rectCalls++;
      return origRect(opts);
    };

    const origLine = page.drawLine.bind(page);
    page.drawLine = (opts: any) => {
      lineCalls++;
      return origLine(opts);
    };

    const origText = page.drawText.bind(page);
    page.drawText = (text: string, opts: any) => {
      drawnTexts.push(text);
      return origText(text, opts);
    };

    await drawOfficialStampOnPdf(page, doc, {
      x: 100,
      y: 100,
      width: 210,
      height: 130,
      showHeader: true,
      headerText: 'DIRECCIÓN DE EGRESOS',
      showBorder: true
    });

    console.log(`  ✓ Rectangles drawn: ${rectCalls} (expected 2: outer + inner border)`);
    console.log(`  ✓ Lines drawn: ${lineCalls} (expected 3: header line, operado line, fecha line)`);
    console.log(`  ✓ Texts drawn:`, drawnTexts);

    if (rectCalls !== 2) {
      throw new Error(`Expected exactly 2 border rectangles, got ${rectCalls}`);
    }
    if (lineCalls !== 3) {
      throw new Error(`Expected exactly 3 dividing lines, got ${lineCalls}`);
    }
    if (!drawnTexts.some(t => t.includes('DIRECCIÓN DE EGRESOS'))) {
      throw new Error('Header text "DIRECCIÓN DE EGRESOS" was not drawn');
    }
    if (!drawnTexts.some(t => t.includes('OPERADO'))) {
      throw new Error('Word "OPERADO" was not drawn');
    }
  }

  // ── TEST 2: Direct Vector calls for showHeader: true + showBorder: false (clean mode) ──
  console.log('\nTest 2: showHeader: true + showBorder: false (clean stamp: 0 borders, 0 lines)');
  {
    const doc = await PDFDocument.create();
    const page = doc.addPage([612, 792]);
    let rectCalls = 0;
    let lineCalls = 0;
    let drawnTexts: string[] = [];

    const origRect = page.drawRectangle.bind(page);
    page.drawRectangle = (opts: any) => {
      rectCalls++;
      return origRect(opts);
    };

    const origLine = page.drawLine.bind(page);
    page.drawLine = (opts: any) => {
      lineCalls++;
      return origLine(opts);
    };

    const origText = page.drawText.bind(page);
    page.drawText = (text: string, opts: any) => {
      drawnTexts.push(text);
      return origText(text, opts);
    };

    await drawOfficialStampOnPdf(page, doc, {
      x: 100,
      y: 100,
      width: 210,
      height: 130,
      showHeader: true,
      headerText: 'DIRECCIÓN DE EGRESOS',
      showBorder: false
    });

    console.log(`  ✓ Rectangles drawn: ${rectCalls} (expected 0)`);
    console.log(`  ✓ Lines drawn: ${lineCalls} (expected 0)`);
    console.log(`  ✓ Texts drawn:`, drawnTexts);

    if (rectCalls !== 0) {
      throw new Error(`Expected 0 border rectangles in clean mode, got ${rectCalls}`);
    }
    if (lineCalls !== 0) {
      throw new Error(`Expected 0 dividing lines in clean mode, got ${lineCalls}`);
    }
    if (!drawnTexts.some(t => t.includes('DIRECCIÓN DE EGRESOS'))) {
      throw new Error('Header text "DIRECCIÓN DE EGRESOS" was not drawn in clean mode');
    }
  }

  // ── TEST 3: SVG string generation with and without showHeader ──
  console.log('\nTest 3: SVG string output viewBox and content validation');
  {
    const svgWithHeader = generateOfficialStampSvgString({
      showHeader: true,
      headerText: 'TESORERÍA MUNICIPAL',
      showBorder: true
    });
    if (!svgWithHeader.includes('viewBox="0 0 210 130"')) {
      throw new Error(`Expected viewBox="0 0 210 130" in SVG with header, got:\n${svgWithHeader.slice(0, 100)}`);
    }
    if (!svgWithHeader.includes('TESORERÍA MUNICIPAL')) {
      throw new Error('Expected "TESORERÍA MUNICIPAL" in SVG');
    }
    console.log('  ✓ SVG with header has viewBox="0 0 210 130" and contains header text');

    const svgWithoutHeader = generateOfficialStampSvgString({
      showHeader: false,
      showBorder: true
    });
    if (!svgWithoutHeader.includes('viewBox="0 0 210 105"')) {
      throw new Error(`Expected viewBox="0 0 210 105" in SVG without header, got:\n${svgWithoutHeader.slice(0, 100)}`);
    }
    console.log('  ✓ SVG without header has viewBox="0 0 210 105"');
  }

  // ── TEST 4: stampSinglePdf integration with all header variants ──
  console.log('\nTest 4: stampSinglePdf integration test with different department headers');
  const testDepartments = [
    'DIRECCIÓN DE EGRESOS',
    'DIRECCIÓN DE INGRESOS',
    'TESORERÍA MUNICIPAL',
    'OFICIALÍA MAYOR'
  ];

  for (const dept of testDepartments) {
    const settings: DocumentStampSettings = {
      folio: {
        enabled: false,
        showBorder: false,
        startNumber: 1,
        increment: 1,
        padLength: 3,
        fontChoice: 'Helvetica',
        isBold: false,
        fontSize: 14,
        colorHex: '#000000',
        opacity: 100,
        style: 'text-only',
        showMetadata: false,
        positionMatrix: 'tr',
        normX: 0.9,
        normY: 0.1,
        offsetX: 0,
        offsetY: 0
      },
      operado: {
        enabled: true,
        showBorder: true,
        showHeader: true,
        headerText: dept,
        operadoWord: 'OPERADO',
        institutionLine1: 'H. AYUNTAMIENTO',
        institutionLine2: 'DE LA PAZ',
        institutionLine3: '2024 - 2027',
        stampDateIso: '2026-06-09',
        colorHex: '#003399',
        dateColorHex: '#E62B4A',
        opacity: 88,
        isUnderlay: false,
        width: 210,
        height: 130,
        positionMatrix: 'mc',
        normX: 0.5,
        normY: 0.5,
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
      pageRange: { mode: 'all', rangeFrom: 1, rangeTo: 1, customPages: '' },
      numberingScope: 'per-document'
    };

    const res = await stampSinglePdf(baseBytes, settings);
    const stampedDoc = await PDFDocument.load(res.modifiedBytes);
    if (stampedDoc.getPageCount() !== 1) {
      throw new Error(`Page count mismatch for ${dept}`);
    }
    console.log(`  ✓ Successfully stamped PDF with header "${dept}" (${res.modifiedBytes.byteLength} bytes)`);
  }

  console.log('\n🎉 ALL HEADER VALIDATION TESTS PASSED!');
}

runHeaderValidationTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
