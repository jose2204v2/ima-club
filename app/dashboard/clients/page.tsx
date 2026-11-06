"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/client";
import { showToast } from "@/utils/toast"; // <-- IMPORTAMOS EL TOAST

type Client = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para el Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); 
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("first_name", { ascending: true });

    if (error) setError(error.message);
    else setClients(data || []);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    const load = async () => { if (active) await fetchClients(); };
    const timer = setTimeout(load, 0);
    return () => { active = false; clearTimeout(timer); };
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setFirstName(""); setLastName(""); setEmail(""); setPhone("");
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingId(client.id);
    setFirstName(client.first_name);
    setLastName(client.last_name);
    setEmail(client.email || "");
    setPhone(client.phone || "");
    setIsModalOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const clientData = { 
      first_name: firstName, 
      last_name: lastName, 
      email, 
      phone 
    };

    let error;
    if (editingId) {
      const { error: updateError } = await supabase.from("clients").update(clientData).eq("id", editingId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from("clients").insert([clientData]);
      error = insertError;
    }

    if (error) {
      showToast("Error: " + error.message, "error");
    } else {
      setIsModalOpen(false);
      await fetchClients();
      showToast(editingId ? "Cliente actualizado" : "Cliente creado con éxito", "success");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Directorio de Clientes</h1>
          <p className="text-slate-400 mt-1">Gestiona la base de datos de tus clientes.</p>
        </div>
        <button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors w-full sm:w-auto">
          + Añadir Cliente
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg">Error: {error}</div>}

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {/* SCROLL HORIZONTAL PARA MOVIL */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-sm border-b border-slate-700">
                <th className="px-6 py-4 font-medium">Nombre Completo</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Teléfono</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Cargando clientes...</td></tr>
              ) : clients.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">No hay clientes registrados.</td></tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{c.first_name} {c.last_name}</td>
                    <td className="px-6 py-4 text-slate-300">{c.email || "—"}</td>
                    <td className="px-6 py-4 text-slate-300">{c.phone || "—"}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => openEditModal(c)}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium px-3 py-1 bg-blue-500/10 rounded-md transition-colors"
                      >
                        ✏️ Editar
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
              <h2 className="text-xl font-bold text-white">
                {editingId ? "Editar Cliente" : "Añadir Nuevo Cliente"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSaveClient} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <label className="block text-sm text-slate-300 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Teléfono</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700 focus:outline-none focus:border-blue-500" />
              </div>
              <div className="pt-4 flex flex-col sm:flex-row gap-3 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 rounded transition-colors order-2 sm:order-1">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded transition-colors disabled:opacity-50 order-1 sm:order-2">
                  {saving ? "Guardando..." : (editingId ? "Actualizar Cliente" : "Guardar Cliente")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}