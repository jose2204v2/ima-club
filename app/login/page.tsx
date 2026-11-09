"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/utils/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import { motion } from "framer-motion";
import { Mail, Lock, Anchor, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Hacemos el login con Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error("Credenciales incorrectas o cuenta no verificada.");
      setLoading(false);
    } else if (data.session) {
      // Guardamos el token y el usuario en localStorage para que api.js lo use
      localStorage.setItem('charter_token', data.session.access_token);
      localStorage.setItem('charter_usuario', JSON.stringify({
        id: data.user.id,
        email: data.user.email,
        rol: data.user.user_metadata?.role || 'agencia',
        nombre: data.user.user_metadata?.first_name || 'Usuario',
        comision: 20
      }));
      
      toast.success("¡Bienvenido de nuevo!");
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0F19] via-[#111827] to-[#0B0F19] flex items-center justify-center p-4 selection:bg-blue-500/30">
      <Toaster theme="dark" position="bottom-right" richColors />
      
      <motion.div 
        initial={{ y: 30, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm bg-white/5 backdrop-blur-2xl p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col items-center mb-8 relative z-10">
          <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.3)] mb-4">
            <Anchor size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">IMA Club</h2>
          <p className="text-slate-400 text-[11px] uppercase tracking-widest font-bold mt-1">Plataforma SaaS</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 relative z-10">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full bg-[#0f172a]/60 text-white pl-10 pr-4 py-3 rounded-xl border border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm" 
                placeholder="tu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full bg-[#0f172a]/60 text-white pl-10 pr-4 py-3 rounded-xl border border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm" 
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 mt-2 shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2"
          >
            {loading ? "Entrando..." : <><ArrowRight size={18}/> Iniciar Sesión</>}
          </button>
        </form>

        <p className="text-center text-slate-400 mt-6 text-sm relative z-10">
          ¿No tienes cuenta? <Link href="/register" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">Regístrate aquí</Link>
        </p>
      </motion.div>
    </div>
  );
}