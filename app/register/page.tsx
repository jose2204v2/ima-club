"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/utils/client";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import { motion } from "framer-motion";
import { User, Mail, Lock, Anchor, CheckCircle2, ArrowLeft } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("agencia");
  const [loading, setLoading] = useState(false);
  const [registroExitoso, setRegistroExitoso] = useState(false);
  
  const supabase = useMemo(() => createClient(), []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: role,
        },
      },
    });

    if (error) {
      toast.error("Error: " + error.message);
    } else {
      setRegistroExitoso(true);
    }
    setLoading(false);
  };

  // PANTALLA DE AVISO DE CORREO
  if (registroExitoso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B0F19] via-[#111827] to-[#0B0F19] flex items-center justify-center p-4 selection:bg-blue-500/30">
        <Toaster theme="dark" position="bottom-right" richColors />
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} 
          className="w-full max-w-md bg-white/5 backdrop-blur-2xl p-8 rounded-3xl border border-white/10 shadow-2xl text-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-400 border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            <Mail size={40} />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Revisa tu correo</h2>
          <p className="text-slate-300 mb-6 text-sm">
            Hemos enviado un enlace de verificación a <span className="font-bold text-blue-400">{email}</span>. 
            Por favor, haz clic en el enlace para activar tu cuenta.
          </p>
          
          <div className="bg-[#0f172a] p-4 rounded-xl mb-6 text-sm text-slate-400 border border-white/5">
            <p>¿No lo encuentras? Revisa tu carpeta de Spam.</p>
          </div>
          
          <Link 
            href="/login" 
            className="block w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} /> Ir al Login
          </Link>
        </motion.div>
      </div>
    );
  }

  // FORMULARIO DE REGISTRO
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0F19] via-[#111827] to-[#0B0F19] flex items-center justify-center p-4 selection:bg-blue-500/30">
      <Toaster theme="dark" position="bottom-right" richColors />
      
      <motion.div 
        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white/5 backdrop-blur-2xl p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col items-center mb-8 relative z-10">
          <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.2)] mb-4">
            <Anchor size={28} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Crear Cuenta</h2>
          <p className="text-slate-400 text-sm mt-1">Únete a la plataforma IMA Club</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4 relative z-10">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nombre</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-[#0f172a]/60 text-white pl-10 pr-4 py-3 rounded-xl border border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Apellido</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full bg-[#0f172a]/60 text-white pl-10 pr-4 py-3 rounded-xl border border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tipo de Cuenta</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full bg-[#0f172a]/60 text-white px-4 py-3 rounded-xl border border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm appearance-none cursor-pointer">
              <option value="agencia" className="bg-slate-800">Agencia</option>
              <option value="armador" className="bg-slate-800">Armador</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#0f172a]/60 text-white pl-10 pr-4 py-3 rounded-xl border border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#0f172a]/60 text-white pl-10 pr-4 py-3 rounded-xl border border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 mt-4 shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2">
            {loading ? "Creando cuenta..." : <><CheckCircle2 size={18}/> Registrarse</>}
          </button>
        </form>

        <p className="text-center text-slate-400 mt-6 text-sm relative z-10">
          ¿Ya tienes cuenta? <Link href="/login" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">Inicia sesión</Link>
        </p>
      </motion.div>
    </div>
  );
}