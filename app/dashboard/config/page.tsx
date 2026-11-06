"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/client";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";

export default function ConfigPage() {
  const [user, setUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'error' | 'exito', texto: string } | null>(null);

  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setUser(session.user);
    };
    getUser();
  }, [router, supabase.auth]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMensaje({ tipo: 'error', texto: 'Las contraseñas no coinciden.' });
      return;
    }
    if (newPassword.length < 6) {
      setMensaje({ tipo: 'error', texto: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    setLoading(true);
    setMensaje(null);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setMensaje({ tipo: 'error', texto: error.message });
    } else {
      setMensaje({ tipo: 'exito', texto: '¡Contraseña actualizada con éxito!' });
      setNewPassword("");
      setConfirmPassword("");
    }
    setLoading(false);
  };

  if (!user) return <div className="text-white p-8">Cargando...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-white">Configuración</h1>
        <p className="text-slate-400 mt-1">Gestiona tu perfil y seguridad de acceso.</p>
      </div>

      {/* Información del Perfil */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Mi Perfil</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Nombre</label>
            <div className="text-white font-medium text-lg">
              {user.user_metadata?.first_name} {user.user_metadata?.last_name}
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <div className="text-white font-medium">{user.email}</div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Rol en la plataforma</label>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-blue-500/10 text-blue-400 border-blue-500/20 uppercase">
              {user.user_metadata?.role || 'Desconocido'}
            </span>
          </div>
        </div>
      </div>

      {/* Cambio de Contraseña */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Seguridad</h2>
          <p className="text-sm text-slate-400 mt-1">Cambia tu contraseña de acceso.</p>
        </div>
        <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
          {mensaje && (
            <div className={`p-3 rounded-lg text-sm border ${mensaje.tipo === 'error' ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-green-500/10 border-green-500 text-green-500'}`}>
              {mensaje.texto}
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-300 mb-1">Nueva Contraseña</label>
            <input 
              type="password" 
              required
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700 focus:outline-none focus:border-blue-500" 
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Confirmar Nueva Contraseña</label>
            <input 
              type="password" 
              required
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700 focus:outline-none focus:border-blue-500" 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded transition-colors disabled:opacity-50"
          >
            {loading ? "Actualizando..." : "Actualizar Contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}