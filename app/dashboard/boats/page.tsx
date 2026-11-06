"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/client";
import { showToast } from "@/utils/toast"; // <-- IMPORTAMOS EL TOAST

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
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newName, setNewName] = useState("");
  const [newCapacity, setNewCapacity] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const fetchBoats = async () => {
    const { data, error } = await supabase
      .from("boats")
      .select("*")
      .order("name", { ascending: true });

    if (error) setError(error.message);
    else setBoats(data || []);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    const loadInitialData = async () => {
      if (active) await fetchBoats();
    };
    const timer = setTimeout(loadInitialData, 0);
    return () => { active = false; clearTimeout(timer); };
  }, []);

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
      showToast("Error: " + error.message, "error");
    } else {
      setIsModalOpen(false);
      await fetchBoats();
      showToast(editingId ? "Barco actualizado" : "Barco creado con éxito", "success");
    }
    setSaving(false);
  };

  const handleDeleteBoat = async (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar el barco "${name}"? Esta acción no se puede deshacer.`)) return;
    
    const { error } = await supabase.from("boats").delete().eq("id", id);
    if (error) {
      showToast("Error al eliminar: " + error.message, "error");
    } else {
      await fetchBoats();
      showToast("Barco eliminado", "success");
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Flota de Barcos</h1>
          <p className="text-slate-400 mt-1">Gestiona los barcos disponibles en la plataforma</p>
        </div>
        <button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors w-full sm:w-auto">
          + Añadir Barco
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg">Error: {error}</div>}

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {/* SCROLL HORIZONTAL PARA MOVIL */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-sm border-b border-slate-700">
                <th className="px-6 py-4 font-medium">Nombre del Barco</th>
                <th className="px-6 py-4 font-medium">Capacidad</th>
                <th className="px-6 py-4 font-medium">Precio Base</th>
                <th className="px-6 py-4 font-medium">Estado</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Cargando barcos...</td></tr>
              ) : boats.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No hay barcos registrados.</td></tr>
              ) : (
                boats.map((boat) => (
                  <tr key={boat.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{boat.name}</td>
                    <td className="px-6 py-4 text-slate-300">{boat.capacity} personas</td>
                    <td className="px-6 py-4 text-slate-300">{boat.base_price} €</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        boat.is_active ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}>
                        {boat.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => openEditModal(boat)} className="text-blue-400 hover:text-blue-300 text-sm font-medium px-3 py-1 bg-blue-500/10 rounded-md transition-colors">
                        ✏️ Editar
                      </button>
                      <button onClick={() => handleDeleteBoat(boat.id, boat.name)} className="text-red-400 hover:text-red-300 text-sm font-medium px-3 py-1 bg-red-500/10 rounded-md transition-colors">
                        🗑️ Borrar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL (Adaptado para móvil) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-slate-700 shrink-0">
              <h2 className="text-xl font-bold text-white">{editingId ? "Editar Barco" : "Añadir Nuevo Barco"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSaveBoat} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Nombre del Barco</label>
                <input type="text" required value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700 focus:outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Capacidad</label>
                  <input type="number" required min="1" value={newCapacity} onChange={(e) => setNewCapacity(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Precio Base (€)</label>
                  <input type="number" required min="0" step="0.01" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700 focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 rounded focus:ring-blue-500" />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-300">Barco Activo</label>
              </div>
              <div className="pt-4 flex flex-col sm:flex-row gap-3 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 rounded transition-colors order-2 sm:order-1">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded transition-colors disabled:opacity-50 order-1 sm:order-2">
                  {saving ? "Guardando..." : (editingId ? "Actualizar" : "Guardar")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}