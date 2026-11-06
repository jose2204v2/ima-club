"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/client";

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

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const { data, error } = await supabase.from("extras").select("*").order("name");
      if (!isMounted) return;
      if (error) setError(error.message);
      else setExtras(data || []);
      setLoading(false);
    };
    load();
    return () => { isMounted = false; };
  }, [supabase]);

  const fetchExtras = async () => {
    const { data } = await supabase.from("extras").select("*").order("name");
    if (data) setExtras(data);
  };

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
    } else {
      setError(error.message);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Catálogo de Extras</h1>
          <p className="text-slate-400 mt-1">Gestiona los servicios adicionales (DJ, bebidas, etc.)</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          + Añadir Extra
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg">Error: {error}</div>}

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/50 text-slate-400 text-sm border-b border-slate-700">
              <th className="px-6 py-4 font-medium">Nombre</th>
              <th className="px-6 py-4 font-medium">Descripción</th>
              <th className="px-6 py-4 font-medium">Precio</th>
              <th className="px-6 py-4 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Cargando...</td></tr>
            ) : extras.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">No hay extras en el catálogo.</td></tr>
            ) : (
              extras.map((e) => (
                <tr key={e.id} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{e.name}</td>
                  <td className="px-6 py-4 text-slate-300">{e.description || "—"}</td>
                  <td className="px-6 py-4 text-green-400 font-bold">{e.price} €</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-green-500/10 text-green-400 border-green-500/20 uppercase">
                      {e.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">Nuevo Extra</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleAddExtra} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Nombre</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700 focus:outline-none focus:border-blue-500" placeholder="Ej: DJ Profesional" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Descripción</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Precio (€)</label>
                <input type="number" required min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700 focus:outline-none focus:border-blue-500" />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 rounded transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded transition-colors disabled:opacity-50">
                  {saving ? "Guardando..." : "Guardar Extra"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}