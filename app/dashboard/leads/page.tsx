"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/client";
import { useRouter } from "next/navigation"; 
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Bot, Sparkles, Trash2, X, 
  Target, Phone, Mail, Copy 
} from "lucide-react"; // <-- He eliminado UserPlus

type Lead = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  budget?: number;
  personas?: string;
  fecha?: string;
  duracion?: string;
};

type AiData = {
  score: number;
  temperature: string;
  analysis: string;
  recommended_boat: string;
  objections: string[];
  message: string;
};

// VARIANTES PARA LA ANIMACIÓN EN CASCADA
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const item = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 }
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter(); 

  // Modal Crear Lead
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("Instagram");
  const [budget, setBudget] = useState("");
  const [personas, setPersonas] = useState("");
  const [fecha, setFecha] = useState("");
  const [duracion, setDuracion] = useState("");
  const [saving, setSaving] = useState(false);

  // Modal Auto-Propuesta
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoResult, setAutoResult] = useState<{ boatName: string; message: string; proposalId: string } | null>(null);

  // Modal IA Análisis
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiData, setAiData] = useState<AiData | null>(null); 
  const [generatingAi, setGeneratingAi] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (!isMounted) return;
      if (error) setError(error.message);
      else setLeads(data || []);
      setLoading(false);
    };
    loadData();
    return () => { isMounted = false; };
  }, [supabase]);

  const fetchLeads = async () => {
    const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    if (data) setLeads(data);
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("leads").insert([{
      first_name: firstName, last_name: lastName, email, phone, source, status: "nuevo",
      budget: budget ? Number(budget) : null, personas, fecha: fecha || null, duracion
    }]);

    if (!error) {
      setFirstName(""); setLastName(""); setEmail(""); setPhone("");
      setBudget(""); setPersonas(""); setFecha(""); setDuracion("");
      setIsModalOpen(false);
      await fetchLeads();
      toast.success("Lead creado con éxito"); 
    } else { 
      toast.error("Error al crear lead: " + error.message); 
    }
    setSaving(false);
  };

  const handleDeleteLead = async (id: string) => {
    if (!window.confirm("¿Seguro que quieres eliminar este lead?")) return;
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (!error) {
      await fetchLeads();
      toast.success("Lead eliminado"); 
    } else {
      toast.error("Error al eliminar: " + error.message); 
    }
  };

  const handleGenerateAiMessage = async (lead: Lead) => {
    setSelectedLead(lead);
    setIsAiModalOpen(true);
    setGeneratingAi(true);
    setAiData(null);

    try {
      const response = await fetch('/api/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setAiData(data);
    } catch (err) {
      toast.error("Error: " + (err instanceof Error ? err.message : "Desconocido")); 
      setIsAiModalOpen(false);
    } finally { setGeneratingAi(false); }
  };

  const handleAutoProposal = async (lead: Lead) => {
    setSelectedLead(lead);
    setIsAutoModalOpen(true);
    setAutoLoading(true);
    setAutoResult(null);

    try {
      const response = await fetch('/api/generate-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      setAutoResult(data);
      await fetchLeads();
      toast.success("Propuesta creada automáticamente"); 
    } catch (err) {
      toast.error("Error: " + (err instanceof Error ? err.message : "Desconocido")); 
      setIsAutoModalOpen(false);
    } finally { setAutoLoading(false); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Mensaje copiado al portapapeles"); 
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Leads (CRM)</h1>
          <p className="text-slate-400 mt-1">Gestiona los contactos interesados.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] w-full sm:w-auto flex items-center justify-center gap-2">
          <Plus size={18} /> Añadir Lead
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg">Error: {error}</div>}

      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-white/5 text-slate-300 text-sm border-b border-white/10">
                <th className="px-6 py-4 font-medium">Nombre</th>
                <th className="px-6 py-4 font-medium">Contacto</th>
                <th className="px-6 py-4 font-medium">Detalles Solicitud</th>
                <th className="px-6 py-4 font-medium">Estado</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            {/* APLICAMOS LA ANIMACIÓN AL TBODY */}
            <motion.tbody 
              variants={container} 
              initial="hidden" 
              animate="show" 
              className="divide-y divide-white/5"
            >
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Cargando...</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No hay leads registrados.</td></tr>
              ) : (
                <AnimatePresence>
                  {leads.map((lead) => (
                    <motion.tr 
                      key={lead.id} 
                      variants={item}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      <td className="px-6 py-4 font-medium text-white">
                        <div className="flex items-center gap-2">
                          <Target size={16} className="text-blue-400" />
                          {lead.first_name} {lead.last_name}
                          <span className="block text-xs text-slate-500 ml-6">{lead.source}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {lead.email && <div className="flex items-center gap-1 text-sm"><Mail size={12}/> {lead.email}</div>}
                        {lead.phone && <div className="flex items-center gap-1 text-sm text-slate-400 mt-1"><Phone size={12}/> {lead.phone}</div>}
                      </td>
                      <td className="px-6 py-4 text-slate-300 text-sm">
                        <div className="flex flex-col gap-1">
                          {lead.personas && <span className="flex items-center gap-1">👥 {lead.personas} pax</span>}
                          {lead.budget && <span className="flex items-center gap-1">💶 {lead.budget} €</span>}
                          {lead.fecha && <span className="flex items-center gap-1">📅 {lead.fecha}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border uppercase ${
                          lead.status === 'convertido' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        }`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        {lead.status !== 'convertido' && (
                          <>
                            <button onClick={() => handleAutoProposal(lead)} className="text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-sm font-bold px-3 py-2 rounded-md transition-all shadow-lg shadow-purple-500/20 inline-flex items-center gap-1">
                              <Bot size={16}/> Auto-Propuesta
                            </button>
                            <button onClick={() => handleGenerateAiMessage(lead)} className="text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 text-sm font-medium px-3 py-2 rounded-md transition-colors inline-flex items-center gap-1">
                              <Sparkles size={16}/> Analizar
                            </button>
                          </>
                        )}
                        <button onClick={() => handleDeleteLead(lead.id)} className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 p-2 rounded-md transition-colors" title="Eliminar">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </motion.tbody>
          </table>
        </div>
      </div>

      {/* MODAL CREAR LEAD */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0f172a]/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-white/10 shrink-0">
              <h2 className="text-xl font-bold text-white">Nuevo Lead</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddLead} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="text" required placeholder="Nombre" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:border-blue-500 outline-none" />
                <input type="text" required placeholder="Apellido" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:border-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:border-blue-500 outline-none" />
                <input type="tel" placeholder="Teléfono" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:border-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="text" placeholder="Nº Personas" value={personas} onChange={e => setPersonas(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:border-blue-500 outline-none" />
                <input type="number" placeholder="Presupuesto (€)" value={budget} onChange={e => setBudget(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:border-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:border-blue-500 outline-none" />
                <select value={duracion} onChange={e => setDuracion(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:border-blue-500 outline-none">
                  <option value="" className="bg-slate-800">Duración...</option>
                  <option value="10:00-13:30 (Morning)" className="bg-slate-800">Mañana (3.5h)</option>
                  <option value="14:00-17:30 (Afternoon)" className="bg-slate-800">Tarde (3.5h)</option>
                  <option value="10:00-17:00 (Full Day Mañana)" className="bg-slate-800">Día Completo (7h)</option>
                </select>
              </div>
              <select value={source} onChange={e => setSource(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:border-blue-500 outline-none">
                <option value="Instagram" className="bg-slate-800">Instagram</option>
                <option value="Web" className="bg-slate-800">Página Web</option>
                <option value="WhatsApp" className="bg-slate-800">WhatsApp</option>
              </select>
              <div className="pt-4 flex flex-col sm:flex-row gap-3 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium py-2.5 rounded-lg transition-colors order-2 sm:order-1">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg transition-all disabled:opacity-50 order-1 sm:order-2">{saving ? "Guardando..." : "Guardar Lead"}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL AUTO PROPUESTA */}
      {isAutoModalOpen && selectedLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0f172a]/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-white/10 bg-gradient-to-r from-purple-900/50 to-blue-900/50 shrink-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Bot size={24} /> Propuesta Automatizada</h2>
              <button onClick={() => setIsAutoModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              {autoLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-purple-300 font-medium animate-pulse text-center">Buscando barco, calculando tarifa y redactando...</p>
                </div>
              ) : autoResult && (
                <div className="space-y-4">
                  <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl text-center">
                    <p className="text-emerald-400 font-bold text-lg">✅ Propuesta Creada</p>
                    <p className="text-white mt-1">Barco asignado: <strong>{autoResult.boatName}</strong></p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-bold text-slate-300 mb-2">Mensaje generado con enlace al portal:</p>
                    <div className="bg-[#0f172a] p-4 rounded-xl border border-white/10 text-slate-200 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
                      {autoResult.message}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button onClick={() => copyToClipboard(autoResult.message)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                      <Copy size={16} /> Copiar Mensaje
                    </button>
                    <button onClick={() => { router.push('/dashboard/proposals'); }} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 rounded-lg transition-colors">
                      Ver Propuestas
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL ANÁLISIS IA */}
      {isAiModalOpen && selectedLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0f172a]/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-white/10 bg-white/5 shrink-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Sparkles size={20} className="text-purple-400"/> Análisis IA</h2>
              <button onClick={() => setIsAiModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
              {generatingAi ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-purple-300 font-medium animate-pulse">Analizando perfil del cliente...</p>
                </div>
              ) : aiData && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Temperatura</p>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{aiData.temperature === 'Caliente' ? '🔥' : aiData.temperature === 'Tibio' ? '🌤️' : '❄️'}</span>
                        <span className="text-lg font-bold uppercase text-white">{aiData.temperature}</span>
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Score</p>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-white">{aiData.score}/100</span>
                        <div className="flex-1 bg-[#0f172a] h-2 rounded-full overflow-hidden border border-white/5">
                          <div className={`h-full ${aiData.score > 70 ? 'bg-emerald-500' : aiData.score > 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${aiData.score}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl">
                    <p className="text-sm font-bold text-blue-400 mb-1 flex items-center gap-2">🧠 Análisis Interno</p>
                    <p className="text-slate-300 text-sm">{aiData.analysis}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-300 mb-2">📱 Mensaje Sugerido:</p>
                    <div className="bg-[#0f172a] p-4 rounded-xl border border-white/10 text-slate-200 text-sm whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">
                      {aiData.message}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}