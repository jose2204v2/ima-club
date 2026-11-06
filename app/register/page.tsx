"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/utils/client";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("agencia");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // NUEVO ESTADO: Para saber si el registro fue exitoso
  const [registroExitoso, setRegistroExitoso] = useState(false);
  
  const supabase = useMemo(() => createClient(), []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
      setError(error.message);
      setLoading(false);
    } else {
      setRegistroExitoso(true); // Mostramos la pantalla de aviso
      setLoading(false);
    }
  };

  // PANTALLA DE AVISO DE CORREO
  if (registroExitoso) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
        <div className="w-full max-w-md bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700 text-center">
          <div className="text-6xl mb-4">✉️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Revisa tu correo</h2>
          <p className="text-slate-300 mb-6">
            Hemos enviado un enlace de verificación a <span className="font-bold text-white">{email}</span>. 
            Por favor, haz clic en el enlace para activar tu cuenta y poder iniciar sesión.
          </p>
          <div className="bg-slate-900 p-4 rounded-lg mb-6 text-sm text-slate-400">
            <p>¿No lo encuentras? Revisa tu carpeta de Spam o correo no deseado.</p>
          </div>
          <Link 
            href="/login" 
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition-colors"
          >
            Ir al Login
          </Link>
        </div>
      </div>
    );
  }

  // FORMULARIO DE REGISTRO
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700">
        <h2 className="text-3xl font-bold text-white text-center mb-6">Crear Cuenta</h2>
        
        {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4 text-sm">{error}</div>}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Nombre</label>
              <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700 focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Apellido</label>
              <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700 focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Tipo de Cuenta</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700 focus:outline-none focus:border-blue-500">
              <option value="agencia">Agencia</option>
              <option value="armador">Armador</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700 focus:outline-none focus:border-blue-500" />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Contraseña</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700 focus:outline-none focus:border-blue-500" />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition-colors disabled:opacity-50">
            {loading ? "Creando cuenta..." : "Registrarse"}
          </button>
        </form>

        <p className="text-center text-slate-400 mt-6 text-sm">
          ¿Ya tienes cuenta? <Link href="/login" className="text-blue-400 hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}