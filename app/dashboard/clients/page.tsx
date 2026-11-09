"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/utils/client";
import { toast } from "sonner";
import { UserPlus, Pencil, Users, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  const fetchClients = useCallback(async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("first_name", { ascending: true });

    if (error) setError(error.message);
    else setClients(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let active = true;
    const load = async () => { if (active) await fetchClients(); };
    const timer = setTimeout(load, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [fetchClients]);

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
      toast.error("Error: " + error.message);
    } else {
      setIsModalOpen(false);
      await fetchClients();
      toast.success(editingId ? "Cliente actualizado" : "Cliente creado con éxito");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Directorio de Clientes</h1>
          <p className="text-slate-400 mt-1">Gestiona la base de datos de tus clientes.</p>
        </div>
        <button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] w-full sm:w-auto flex items-center justify-center gap-2">
          <UserPlus size={18} /> Añadir Cliente
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg">Error: {error}</div>}

      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-white/5 text-slate-300 text-sm border-b border-white/10">
                <th className="px-6 py-4 font-medium">Nombre Completo</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Teléfono</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Cargando clientes...</td></tr>
              ) : clients.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">No hay clientes registrados.</td></tr>
              ) : (
                <AnimatePresence>
                  {clients.map((c) => (
                    <motion.tr 
                      key={c.id} 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                        <Users size={16} className="text-blue-400" /> {c.first_name} {c.last_name}
                      </td>
                      <td className="px-6 py-4 text-slate-300">{c.email || "—"}</td>
                      <td className="px-6 py-4 text-slate-300">{c.phone || "—"}</td>
                      <td className="px-6 py-4 text-right opacity-80 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openEditModal(c)}
                          className="text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 p-2 rounded-md transition-colors"
                          title="Editar Cliente"
                        >
                          <Pencil size={16} />
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
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0f172a]/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-white/10 shrink-0">
              <h2 className="text-xl font-bold text-white">
                {editingId ? "Editar Cliente" : "Añadir Nuevo Cliente"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveClient} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Nombre</label>
                  <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Apellido</label>
                  <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Teléfono</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div className="pt-4 flex flex-col sm:flex-row gap-3 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium py-2.5 rounded-lg transition-colors order-2 sm:order-1">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg transition-all disabled:opacity-50 order-1 sm:order-2">
                  {saving ? "Guardando..." : (editingId ? "Actualizar Cliente" : "Guardar Cliente")}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}