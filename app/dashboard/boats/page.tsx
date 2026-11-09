"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/utils/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Ship, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Boat = {
  id: string;
  name: string;
  capacity: number;
  base_price: number;
  is_active: boolean;
};

export default function BoatsPage() {
  const [boats, setBoats] = useState<Boat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newName, setNewName] = useState("");
  const [newCapacity, setNewCapacity] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const fetchBoats = useCallback(async () => {
    const { data, error } = await supabase
      .from("boats")
      .select("*")
      .order("name", { ascending: true });

    if (error) setError(error.message);
    else setBoats(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let active = true;
    const loadInitialData = async () => {
      if (active) await fetchBoats();
    };
    const timer = setTimeout(loadInitialData, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [fetchBoats]);

  const openCreateModal = () => {
    setEditingId(null);
    setNewName(""); setNewCapacity(""); setNewPrice(""); setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (boat: Boat) => {
    setEditingId(boat.id);
    setNewName(boat.name);
    setNewCapacity(boat.capacity.toString());
    setNewPrice(boat.base_price.toString());
    setIsActive(boat.is_active);
    setIsModalOpen(true);
  };

  const handleSaveBoat = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const boatData = {
      name: newName,
      capacity: Number(newCapacity),
      base_price: Number(newPrice),
      is_active: isActive,
    };

    let error;
    if (editingId) {
      const { error: updateError } = await supabase.from("boats").update(boatData).eq("id", editingId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from("boats").insert([boatData]);
      error = insertError;
    }

    if (error) {
      toast.error("Error: " + error.message);
    } else {
      setIsModalOpen(false);
      await fetchBoats();
      toast.success(editingId ? "Barco actualizado" : "Barco creado con éxito");
    }
    setSaving(false);
  };

  const handleDeleteBoat = async (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar el barco "${name}"? Esta acción no se puede deshacer.`)) return;
    
    const { error } = await supabase.from("boats").delete().eq("id", id);
    if (error) {
      toast.error("Error al eliminar: " + error.message);
    } else {
      await fetchBoats();
      toast.success("Barco eliminado");
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Flota de Barcos</h1>
          <p className="text-slate-400 mt-1">Gestiona los barcos disponibles en la plataforma.</p>
        </div>
        <button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] w-full sm:w-auto flex items-center justify-center gap-2">
          <Plus size={18} /> Añadir Barco
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg">Error: {error}</div>}

      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-white/5 text-slate-300 text-sm border-b border-white/10">
                <th className="px-6 py-4 font-medium">Nombre del Barco</th>
                <th className="px-6 py-4 font-medium">Capacidad</th>
                <th className="px-6 py-4 font-medium">Precio Base</th>
                <th className="px-6 py-4 font-medium">Estado</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Cargando barcos...</td></tr>
              ) : boats.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No hay barcos registrados.</td></tr>
              ) : (
                <AnimatePresence>
                  {boats.map((boat) => (
                    <motion.tr 
                      key={boat.id} 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                        <Ship size={16} className="text-blue-400" /> {boat.name}
                      </td>
                      <td className="px-6 py-4 text-slate-300">{boat.capacity} personas</td>
                      <td className="px-6 py-4 text-slate-300">{boat.base_price} €</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                          boat.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}>
                          {boat.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(boat)} className="text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 p-2 rounded-md transition-colors" title="Editar">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDeleteBoat(boat.id, boat.name)} className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 p-2 rounded-md transition-colors" title="Eliminar">
                          <Trash2 size={16} />
                        </button>
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
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0f172a]/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-white/10 shrink-0">
              <h2 className="text-xl font-bold text-white">{editingId ? "Editar Barco" : "Añadir Nuevo Barco"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveBoat} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nombre del Barco</label>
                <input type="text" required value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Capacidad</label>
                  <input type="number" required min="1" value={newCapacity} onChange={(e) => setNewCapacity(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Precio Base (€)</label>
                  <input type="number" required min="0" step="0.01" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 accent-blue-500 cursor-pointer" />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-300 cursor-pointer">Barco Activo</label>
              </div>
              <div className="pt-4 flex flex-col sm:flex-row gap-3 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium py-2.5 rounded-lg transition-colors order-2 sm:order-1">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg transition-all disabled:opacity-50 order-1 sm:order-2">
                  {saving ? "Guardando..." : (editingId ? "Actualizar" : "Guardar")}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}