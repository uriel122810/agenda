/**
 * Convierte la primera hoja de un archivo Excel (.xlsx) a texto separado por
 * tabuladores, para reutilizar el mismo importador que el pegado desde Excel.
 */

export async function excelATexto(datos: ArrayBuffer): Promise<string> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(datos);
  const ws = wb.worksheets[0];
  if (!ws) return '';
  const lineas: string[] = [];
  ws.eachRow({ includeEmpty: false }, row => {
    const valores: string[] = [];
    const n = row.cellCount;
    for (let i = 1; i <= n; i++) {
      const v = row.getCell(i).value as unknown;
      valores.push(valorATexto(v));
    }
    if (valores.some(v => v.trim())) lineas.push(valores.join('\t'));
  });
  return lineas.join('\n');
}

function valorATexto(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) {
    const d = String(v.getUTCDate()).padStart(2, '0');
    const m = String(v.getUTCMonth() + 1).padStart(2, '0');
    return `${d}/${m}/${v.getUTCFullYear()}`;
  }
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object') {
    const o = v as { result?: unknown; text?: string; richText?: Array<{ text: string }> };
    if (o.result !== undefined) return valorATexto(o.result);
    if (o.richText) return o.richText.map(r => r.text).join('');
    if (o.text) return o.text;
  }
  return String(v).replace(/[\t\r\n]+/g, ' ');
}
