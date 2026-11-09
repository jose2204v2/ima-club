"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/utils/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Gift, Tag, CheckCircle2, XCircle, X } from "lucide-react";

type Extra = {
  id: string;
  name: string;
  description: string;
  price: number;
  is_active: boolean;
};

export default function ExtrasPage() {
  const [extras, setExtras] = useState<Extra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const fetchExtras = useCallback(async () => {
    const { data, error } = await supabase.from("extras").select("*").order("name");
    if (error) {
      setError(error.message);
      toast.error("Error al cargar extras");
    } else {
      setExtras(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let active = true;
    const load = async () => { if (active) await fetchExtras(); };
    const timer = setTimeout(load, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [fetchExtras]);

  const handleAddExtra = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("extras").insert([{
      name, description, price: Number(price), is_active: true
    }]);

    if (!error) {
      setName(""); setDescription(""); setPrice("");
      setIsModalOpen(false);
      await fetchExtras();
      toast.success("Extra añadido al catálogo");
    } else {
      toast.error("Error: " + error.message);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Catálogo de Extras</h1>
          <p className="text-slate-400 mt-1">Gestiona los servicios adicionales (DJ, bebidas, etc.)</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] w-full sm:w-auto flex items-center justify-center gap-2">
          <Plus size={18} /> Añadir Extra
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg">Error: {error}</div>}

      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-white/5 text-slate-300 text-sm border-b border-white/10">
                <th className="px-6 py-4 font-medium">Nombre</th>
                <th className="px-6 py-4 font-medium">Descripción</th>
                <th className="px-6 py-4 font-medium">Precio</th>
                <th className="px-6 py-4 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Cargando...</td></tr>
              ) : extras.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">No hay extras en el catálogo.</td></tr>
              ) : (
                <AnimatePresence>
                  {extras.map((e) => (
                    <motion.tr 
                      key={e.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                        <Gift size={16} className="text-purple-400" /> {e.name}
                      </td>
                      <td className="px-6 py-4 text-slate-300 text-sm truncate max-w-xs">{e.description || "—"}</td>
                      <td className="px-6 py-4 text-emerald-400 font-bold flex items-center gap-1">
                        <Tag size={14} /> {e.price} €
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                          e.is_active 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}>
                          {e.is_active ? <CheckCircle2 size={12}/> : <XCircle size={12}/>} 
                          {e.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CRISTAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0f172a]/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-white/10 shrink-0">
              <h2 className="text-xl font-bold text-white">Nuevo Extra</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddExtra} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nombre</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 transition-colors" placeholder="Ej: DJ Profesional" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Descripción</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 transition-colors" placeholder="Breve descripción..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Precio (€)</label>
                <input type="number" required min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div className="pt-4 flex flex-col sm:flex-row gap-3 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium py-2.5 rounded-lg transition-colors order-2 sm:order-1">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg transition-all disabled:opacity-50 order-1 sm:order-2">
                  {saving ? "Guardando..." : "Guardar Extra"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
} 