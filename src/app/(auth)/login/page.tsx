'use client';

import { useState, useEffect, Suspense } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Loader2, Mail, Lock, Shield, KeyRound, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginFormContent() {
  const [loading, setLoading] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const err = searchParams.get('error');
    if (err) {
      setErrorMessage(decodeURIComponent(err.replace(/_/g, ' ')));
    }
  }, [searchParams]);

  async function handleGoogleLogin() {
    setLoading(true);
    setErrorMessage('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          scopes: [
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.readonly'
          ].join(' '),
        },
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('Error al iniciar sesión:', error);
      setErrorMessage(error?.message || 'Error al conectar con Google OAuth.');
      setLoading(false);
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Ingresa correo y contraseña.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setInfoMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) throw error;

      if (data?.session) {
        router.push('/overview');
        router.refresh();
      }
    } catch (error: any) {
      console.error('Error de autenticación:', error);
      setErrorMessage(error.message === 'Invalid login credentials' 
        ? 'Credenciales inválidas. Verifica tu correo y contraseña.' 
        : error.message);
      setLoading(false);
    }
  }

  async function handleMagicLinkLogin() {
    if (!email.trim()) {
      setErrorMessage('Ingresa tu correo para recibir el enlace de acceso.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setInfoMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      setInfoMessage('¡Enlace enviado! Revisa tu bandeja de entrada para ingresar directamente.');
    } catch (error: any) {
      console.error('Error enviando enlace:', error);
      setErrorMessage(error?.message || 'Error al enviar enlace mágico.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 w-full max-w-md shadow-xl shadow-black/5 relative overflow-hidden animate-fade-in">
      {/* Adorno superior dorado institucional */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#6b1c35] via-[#b39656] to-[#6b1c35]"></div>

      <div className="text-center mb-8 mt-2 flex flex-col items-center">
        <div className="flex flex-col mb-3">
          <h1 className="text-4xl font-black text-[#6b1c35] tracking-tight leading-none">
            PazSuma
          </h1>
          <span className="text-[#b39656] text-xs font-bold tracking-[0.25em] uppercase mt-2">
            Sistema Institucional
          </span>
        </div>
        <p className="text-slate-500 text-xs mt-1 max-w-xs">
          Acceso centralizado para gestión de correspondencia, foliado, agenda y proyectos.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2 animate-fade-in">
          <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {infoMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-start gap-2 animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>{infoMessage}</span>
        </div>
      )}

      {/* Botón Principal Google OAuth */}
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="group relative w-full flex items-center justify-center gap-3 bg-white px-6 py-3.5 rounded-xl border-2 border-[#b39656] shadow-md shadow-[#b39656]/10 hover:shadow-[#b39656]/30 hover:bg-[#f4f1ea]/50 transition-all duration-200 disabled:opacity-50 cursor-pointer"
      >
        <div className="flex items-center justify-center bg-white p-1 rounded-full">
          {loading && !showEmailLogin ? (
            <Loader2 className="animate-spin text-[#6b1c35]" size={20} />
          ) : (
            <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
        </div>
        <span className="font-bold text-[#6b1c35] text-xs sm:text-sm tracking-wide">
          Acceso con Google Institucional
        </span>
      </button>

      {/* Separator */}
      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <button
          type="button"
          onClick={() => setShowEmailLogin(!showEmailLogin)}
          className="relative px-3 bg-white text-slate-400 hover:text-slate-600 text-[11px] font-semibold transition-colors"
        >
          {showEmailLogin ? '▲ Ocultar acceso por correo' : '▼ O acceder con correo y contraseña'}
        </button>
      </div>

      {/* Email / Password Option */}
      {showEmailLogin && (
        <form onSubmit={handlePasswordLogin} className="space-y-3.5 animate-fade-in">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="usuario@municipio.gob.mx"
                required
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#6b1c35] focus:ring-1 focus:ring-[#6b1c35]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
              Contraseña
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#6b1c35] focus:ring-1 focus:ring-[#6b1c35]"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#6b1c35] hover:bg-[#581c2f] text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow shadow-[#6b1c35]/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading && showEmailLogin ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
              Iniciar Sesión
            </button>

            <button
              type="button"
              onClick={handleMagicLinkLogin}
              disabled={loading}
              title="Recibir enlace de acceso al correo"
              className="px-3 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors"
            >
              Enlace Mágico
            </button>
          </div>
        </form>
      )}

      <div className="mt-8 text-center border-t border-slate-100 pt-5">
        <p className="text-[10px] text-slate-400 font-medium">
          Sistema de uso exclusivo para personal autorizado. Las operaciones quedan auditadas y foliadas.
        </p>
      </div>
    </div>
  );
}

export default function PazSumaLogin() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f4f1ea] font-sans selection:bg-[#b39656] selection:text-white">
      <Suspense fallback={<div className="text-slate-400 text-xs">Cargando acceso institucional...</div>}>
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
