/**
 * Recursos del formato oficial (logos y fuente métrica de Calibri para el PDF).
 * Viven en /public/conciliacion y se cargan bajo demanda en el navegador.
 */

export interface RecursosOficiales {
  logoAyuntamiento: Uint8Array;
  logoLaPaz: Uint8Array;
  logoAuxiliar: Uint8Array;
  /** Carlito: fuente libre con las mismas métricas que Calibri */
  fuenteCalibri: Uint8Array;
}

export const ARCHIVOS_RECURSOS: Record<keyof RecursosOficiales, string> = {
  logoAyuntamiento: 'logo-ayuntamiento.png',
  logoLaPaz: 'logo-lapaz.png',
  logoAuxiliar: 'logo-auxiliar.png',
  fuenteCalibri: 'Carlito-Regular.ttf'
};

let cache: Promise<RecursosOficiales> | null = null;

export function cargarRecursosNavegador(base = '/conciliacion'): Promise<RecursosOficiales> {
  if (!cache) {
    cache = (async () => {
      const entradas = await Promise.all(
        Object.entries(ARCHIVOS_RECURSOS).map(async ([k, archivo]) => {
          const r = await fetch(`${base}/${archivo}`);
          if (!r.ok) throw new Error(`No se pudo cargar ${archivo}`);
          return [k, new Uint8Array(await r.arrayBuffer())] as const;
        })
      );
      return Object.fromEntries(entradas) as unknown as RecursosOficiales;
    })().catch(err => {
      cache = null;
      throw err;
    });
  }
  return cache;
}

export function descargarArchivo(datos: Uint8Array | ArrayBuffer, nombre: string, tipo: string): void {
  const blob = new Blob([datos as BlobPart], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1500);
}
