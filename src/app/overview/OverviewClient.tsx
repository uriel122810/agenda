'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import AlegraSidebar, { AlegraTabId } from '@/components/alegra/AlegraSidebar';
import AlegraHeader from '@/components/alegra/AlegraHeader';
import AlegraDashboard from '@/components/alegra/AlegraDashboard';
import AlegraOnboarding from '@/components/alegra/AlegraOnboarding';
import AlegraBuzonSAT from '@/components/alegra/AlegraBuzonSAT';
import AlegraWorkspaces from '@/components/alegra/AlegraWorkspaces';
import AlegraTaskManager from '@/components/alegra/AlegraTaskManager';
import AlegraTeamManager from '@/components/alegra/AlegraTeamManager';
import AlegraReports from '@/components/alegra/AlegraReports';
import AlegraCSDModal from '@/components/alegra/AlegraCSDModal';
import AlegraQuickCreateModal from '@/components/alegra/AlegraQuickCreateModal';
import AlegraGeneralPlaceholder from '@/components/alegra/AlegraGeneralPlaceholder';
import DocumentFoliator from '@/components/foliador/DocumentFoliator';

interface Props {
  user: any;
  userRole: 'administrador' | 'empleado';
  userName: string;
}

export default function OverviewClient({ user, userRole, userName }: Props) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  // Estado de navegación
  const [currentTab, setCurrentTab] = useState<AlegraTabId>('inicio');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState('Espacio Contador');

  // Modales
  const [isCSDModalOpen, setIsCSDModalOpen] = useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);

  // Manejador de logout seguro
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Error during sign out:', err);
    } finally {
      // Limpiar cookies de sesión de desarrollo si existen
      document.cookie = 'dev_auth_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900 antialiased selection:bg-[#00C9A7]/20 selection:text-[#008F76]">
      {/* 1. Barra lateral izquierda (Sidebar fixed) estilo Alegra */}
      <AlegraSidebar
        currentTab={currentTab}
        onSelectTab={tab => setCurrentTab(tab)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onOpenPromo={() => alert('¡Aprovecha la promoción anual de Alegra! 9 meses contratados, 12 meses de servicio.')}
        userEmail={user?.email || 'contador@despacho.com'}
        userName={userName || 'Espacio Contador'}
      />

      {/* 2. Contenedor principal con Header sticky y vistas dinámicas */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra superior (Header) */}
        <AlegraHeader
          onOpenQuickCreate={() => setIsQuickCreateOpen(true)}
          onSelectTab={tab => setCurrentTab(tab)}
          userEmail={user?.email || 'contador@despacho.com'}
          userName={userName || 'Espacio Contador'}
          onLogout={handleLogout}
          activeWorkspace={activeWorkspace}
          onWorkspaceChange={ws => setActiveWorkspace(ws)}
          onSearch={q => console.log('Búsqueda global:', q)}
        />

        {/* Área de contenido scrollable */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-150">
          {/* Módulo 1: Inicio / Resumen del negocio (Screenshot 1) */}
          {currentTab === 'inicio' && (
            <AlegraDashboard
              onSelectTab={tab => setCurrentTab(tab)}
              onOpenQuickCreate={() => setIsQuickCreateOpen(true)}
              onOpenCSDModal={() => setIsCSDModalOpen(true)}
            />
          )}

          {/* Módulo 2: Configuración inicial (Screenshot 3) */}
          {currentTab === 'configuracion_inicial' && (
            <AlegraOnboarding
              onSelectTab={tab => setCurrentTab(tab)}
              onOpenAddClientModal={() => setCurrentTab('espacio_trabajo')}
              onOpenCSDModal={() => setIsCSDModalOpen(true)}
            />
          )}

          {/* Módulo 3: Buzón SAT (Screenshot 4) */}
          {currentTab === 'buzon_sat' && <AlegraBuzonSAT />}

          {/* Módulo 4: Espacio de trabajo / Cartera de RFCs (Screenshot 5) */}
          {currentTab === 'espacio_trabajo' && <AlegraWorkspaces />}

          {/* Módulo 5: Gestión de tareas (Kanban + Lista) */}
          {currentTab === 'tareas' && <AlegraTaskManager />}

          {/* Módulo 6: Gestión de equipo / Mi equipo */}
          {currentTab === 'mi_equipo' && <AlegraTeamManager />}

          {/* Módulo 7: Foliador de documentos PDF (funcionalidad clave previa estilizada) */}
          {currentTab === 'foliador' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <span>Foliador Oficial de Documentos Contables y Libros</span>
                    <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-semibold text-[#00A88B] border border-teal-200">
                      Oficial
                    </span>
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Estampa folios consecutivos, membrete, códigos QR y leyendas fiscales en tus archivos PDF.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <DocumentFoliator />
              </div>
            </div>
          )}

          {/* Módulo 8: Centro de Reportes y Balanzas */}
          {currentTab === 'reportes' && (
            <AlegraReports onOpenCSDModal={() => setIsCSDModalOpen(true)} />
          )}

          {/* Módulos secundarios del menú lateral: Ingresos, Gastos, Contactos, Inventario, Bancos, Contabilidad, Configuración */}
          {(currentTab === 'ingresos' ||
            currentTab === 'gastos' ||
            currentTab === 'contactos' ||
            currentTab === 'inventario' ||
            currentTab === 'bancos' ||
            currentTab === 'contabilidad' ||
            currentTab === 'configuracion') && (
            <AlegraGeneralPlaceholder
              tab={currentTab}
              onOpenQuickCreate={() => setIsQuickCreateOpen(true)}
              onOpenCSDModal={() => setIsCSDModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Modal CSD (Certificado de Sello Digital SAT) */}
      <AlegraCSDModal
        isOpen={isCSDModalOpen}
        onClose={() => setIsCSDModalOpen(false)}
        onSuccess={() => alert('Certificado SAT configurado y listo para timbrado.')}
      />

      {/* Modal Creación Rápida (+) */}
      <AlegraQuickCreateModal
        isOpen={isQuickCreateOpen}
        onClose={() => setIsQuickCreateOpen(false)}
        onSelectTab={tab => setCurrentTab(tab)}
        onOpenCSDModal={() => setIsCSDModalOpen(true)}
      />
    </div>
  );
}
