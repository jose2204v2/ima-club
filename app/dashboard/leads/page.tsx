"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/client";
import { useRouter } from "next/navigation"; 
import { showToast } from "@/utils/toast"; 

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
      showToast("Lead creado con éxito", "success"); 
    } else { 
      showToast("Error al crear lead: " + error.message, "error"); 
    }
    setSaving(false);
  };

  const handleDeleteLead = async (id: string) => {
    if (!window.confirm("¿Seguro que quieres eliminar este lead?")) return;
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (!error) {
      await fetchLeads();
      showToast("Lead eliminado", "success"); 
    } else {
      showToast("Error al eliminar: " + error.message, "error"); 
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
      showToast("Error: " + (err instanceof Error ? err.message : "Desconocido"), "error"); 
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
      showToast("Propuesta creada automáticamente", "success"); 
    } catch (err) {
      showToast("Error: " + (err instanceof Error ? err.message : "Desconocido"), "error"); 
      setIsAutoModalOpen(false);
    } finally { setAutoLoading(false); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Mensaje copiado al portapapeles", "success"); 
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Leads (CRM)</h1>
          <p className="text-slate-400 mt-1">Gestiona los contactos interesados.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors w-full sm:w-auto">
          + Añadir Lead
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg">Error: {error}</div>}

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {/* AQUI ESTA EL TRUCO PARA EL MOVIL: overflow-x-auto */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-sm border-b border-slate-700">
                <th className="px-6 py-4 font-medium">Nombre</th>
                <th className="px-6 py-4 font-medium">Contacto</th>
                <th className="px-6 py-4 font-medium">Detalles Solicitud</th>
                <th className="px-6 py-4 font-medium">Estado</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Cargando...</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No hay leads registrados.</td></tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">
                      {lead.first_name} {lead.last_name}
                      <span className="block text-xs text-slate-500 mt-1">{lead.source}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {lead.email && <div>{lead.email}</div>}
                      {lead.phone && <div className="text-sm text-slate-400">{lead.phone}</div>}
                    </td>
                    <td className="px-6 py-4 text-slate-300 text-sm">
                      <div className="flex flex-col gap-1">
                        {lead.personas && <span>👥 {lead.personas} pax</span>}
                        {lead.budget && <span>💶 {lead.budget} €</span>}
                        {lead.fecha && <span>📅 {lead.fecha}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase ${
                        lead.status === 'convertido' ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {lead.status !== 'convertido' && (
                        <>
                          <button onClick={() => handleAutoProposal(lead)} className="text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-sm font-bold px-3 py-1.5 rounded-md transition-all shadow-lg shadow-purple-500/20">
                            🤖 Auto-Propuesta
                          </button>
                          <button onClick={() => handleGenerateAiMessage(lead)} className="text-white bg-slate-600 hover:bg-slate-500 text-sm font-medium px-3 py-1.5 rounded-md transition-colors">
                            ✨ Analizar
                          </button>
                        </>
                      )}
                      <button onClick={() => handleDeleteLead(lead.id)} className="text-red-400 hover:text-red-300 text-sm font-medium px-3 py-1 bg-red-500/10 rounded-md transition-colors">
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CREAR LEAD (Ajustado para móvil) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-slate-700 shrink-0">
              <h2 className="text-xl font-bold text-white">Nuevo Lead</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleAddLead} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="text" required placeholder="Nombre" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700" />
                <input type="text" required placeholder="Apellido" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700" />
                <input type="tel" placeholder="Teléfono" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="text" placeholder="Nº Personas" value={personas} onChange={e => setPersonas(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700" />
                <input type="number" placeholder="Presupuesto (€)" value={budget} onChange={e => setBudget(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700" />
                <select value={duracion} onChange={e => setDuracion(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700">
                  <option value="">Duración...</option>
                  <option value="10:00-13:30 (Morning)">Mañana (3.5h)</option>
                  <option value="14:00-17:30 (Afternoon)">Tarde (3.5h)</option>
                  <option value="10:00-17:00 (Full Day Mañana)">Día Completo</option>
                </select>
              </div>
              <select value={source} onChange={e => setSource(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700">
                <option value="Instagram">Instagram</option>
                <option value="Web">Página Web</option>
                <option value="WhatsApp">WhatsApp</option>
              </select>
              <div className="pt-4 flex gap-3 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-700 text-white font-medium py-2 rounded">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white font-medium py-2 rounded">{saving ? "Guardando..." : "Guardar Lead"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AUTO PROPUESTA */}
      {isAutoModalOpen && selectedLead && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-gradient-to-r from-purple-900/50 to-blue-900/50 shrink-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">🤖 Propuesta Automatizada</h2>
              <button onClick={() => setIsAutoModalOpen(false)} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {autoLoading ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-purple-300 font-medium animate-pulse text-center">Buscando barco, creando propuesta y redactando...</p>
                </div>
              ) : autoResult && (
                <div className="space-y-4">
                  <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg text-center">
                    <p className="text-green-400 font-bold text-lg">✅ Propuesta Creada</p>
                    <p className="text-white mt-1">Barco asignado: <strong>{autoResult.boatName}</strong></p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-bold text-slate-300 mb-2">Mensaje generado con enlace al portal:</p>
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 text-slate-200 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
                      {autoResult.message}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button onClick={() => copyToClipboard(autoResult.message)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-colors">
                      📋 Copiar Mensaje
                    </button>
                    <button onClick={() => { router.push('/dashboard/proposals'); }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg transition-colors">
                      Ver Propuestas
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL ANÁLISIS IA */}
      {isAiModalOpen && selectedLead && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-slate-900 shrink-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">✨ Análisis IA</h2>
              <button onClick={() => setIsAiModalOpen(false)} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto">
              {generatingAi ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-purple-300 font-medium animate-pulse">Analizando...</p>
                </div>
              ) : aiData && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg">
                      <p className="text-xs text-slate-400 font-bold uppercase mb-1">Temperatura</p>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{aiData.temperature === 'Caliente' ? '🔥' : aiData.temperature === 'Tibio' ? '🌤️' : '❄️'}</span>
                        <span className="text-lg font-bold uppercase text-white">{aiData.temperature}</span>
                      </div>
                    </div>
                    <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg">
                      <p className="text-xs text-slate-400 font-bold uppercase mb-1">Score</p>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-white">{aiData.score}/100</span>
                        <div className="flex-1 bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div className={`h-full ${aiData.score > 70 ? 'bg-green-500' : aiData.score > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${aiData.score}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg">
                    <p className="text-sm font-bold text-blue-400 mb-1">🧠 Análisis</p>
                    <p className="text-slate-300 text-sm">{aiData.analysis}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-300 mb-2">📱 Mensaje Sugerido:</p>
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 text-slate-200 text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {aiData.message}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}