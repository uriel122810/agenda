import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'Alegra — Gestión Contable, Tareas y Buzón SAT',
    template: '%s | Alegra',
  },
  description: 'Plataforma integral de gestión contable, tareas, sincronización de buzón SAT, opiniones de cumplimiento 32-D y foliado de documentos.',
  keywords: ['contabilidad', 'SAT', 'facturación', 'CFDI', 'Alegra', 'Fiscally', 'despacho'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
