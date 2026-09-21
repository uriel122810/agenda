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
    default: 'PazSuma — Sistema Institucional de Gestión y Foliado',
    template: '%s | PazSuma',
  },
  description: 'Plataforma institucional de gestión de proyectos, foliado oficial de documentos, buzón SAT y control operativo de PazSuma.',
  keywords: ['PazSuma', 'gestión', 'foliador', 'oficios', 'documentos', 'SAT', 'tareas'],
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
