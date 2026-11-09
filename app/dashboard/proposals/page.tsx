"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/utils/client";
import ChatModal from "./components/ChatModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { toast } from "sonner"; 
import { Plus, MessageSquare, Link2, CheckCircle2, Trash2, X, Info, Lock } from "lucide-react"; // <-- Añadido Lock
import { motion, AnimatePresence } from "framer-motion";
import { findApplicableRate, calculateFinalPrice, Rate } from "@/utils/pricing";

type Client = { id: string; first_name: string; last_name: string; };
type Boat = { id: string; name: string; };
type Proposal = {
  id: string;
  client_id: string;
  boat_id: string;
  date: string;
  time_slot: string;
  total_price: number;
  status: string;
  clients: { first_name: string; last_name: string } | null;
  boats: { name: string } | null;
};

const TIME_SLOTS = [
  "10:00-13:30 (Morning)",
  "14:00-17:30 (Afternoon)",
  "18:00-21:30 (Sunset)",
  "14:00-21:00 (Full Day Tarde)",
  "10:00-17:00 (Full Day Mañana)",
];

const isOverlapping = (slot1: string, slot2: string) => {
  const getTimes = (slot: string) => {
    const match = slot.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
    return match ? { start: match[1], end: match[2] } : null;
  };
  const t1 = getTimes(slot1);
  const t2 = getTimes(slot2);
  if (!t1 || !t2) return false;
  return t1.start < t2.end && t2.start < t1.end;
};

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ title: "", message: "", action: () => {} });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedBoat, setSelectedBoat] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [timeSlot, setTimeSlot] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const [appliedRateInfo, setAppliedRateInfo] = useState<string | null>(null);

  const [blockedSlots, setBlockedSlots] = useState<string[]>([]);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatProposal, setChatProposal] = useState<{id: string, name: string} | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const fetchUnreadCounts = useCallback(async () => {
    const { data: convs } = await supabase
      .from("conversations")
      .select("id, proposal_id, agent_last_read_at");
    
    const { data: clientMsgs } = await supabase
      .from("messages")
      .select("id, conversation_id, created_at")
      .eq("sender_type", "client");

    const map: Record<string, number> = {};
    convs?.forEach(conv => {
      const count = clientMsgs?.filter(m => 
        m.conversation_id === conv.id &&
        (!conv.agent_last_read_at || new Date(m.created_at) > new Date(conv.agent_last_read_at))
      ).length || 0;
      if (count > 0) map[conv.proposal_id] = count;
    });
    setUnreadCounts(map);
  }, [supabase]);

  const fetchData = useCallback(async () => {
    const [propRes, cliRes, boatRes, ratesRes] = await Promise.all([
      supabase.from("proposals").select(`*, clients (first_name, last_name), boats (name)`).order("created_at", { ascending: false }),
      supabase.from("clients").select("id, first_name, last_name"),
      supabase.from("boats").select("id, name"),
      supabase.from("rates").select(`*, seasons (name, start_month, end_month)`)
    ]);

    if (propRes.error) setError(propRes.error.message);
    else setProposals(propRes.data || []);

    if (cliRes.data) setClients(cliRes.data);
    if (boatRes.data) setBoats(boatRes.data);
    if (ratesRes.data) setRates(ratesRes.data as Rate[]);
    
    await fetchUnreadCounts();
    setLoading(false);
  }, [supabase, fetchUnreadCounts]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => { if (isMounted) await fetchData(); };
    const timer = setTimeout(load, 0);
    const channel = supabase
      .channel('proposals-unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        if (isMounted) fetchUnreadCounts();
      })
      .subscribe();
    return () => {
      isMounted = false;
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [fetchData, fetchUnreadCounts, supabase]);

  // VALIDACIÓN DE DISPONIBILIDAD (Solucionado el error de timeSlot)
  useEffect(() => {
    let isMounted = true;
    if (!isModalOpen || !selectedBoat || !date) {
      const timer = setTimeout(() => { if (isMounted) setBlockedSlots([]); }, 0);
      return () => clearTimeout(timer);
    }
    const checkAvailability = async () => {
      setTimeout(() => { if (isMounted) setCheckingAvailability(true); }, 0);
      const [availRes, propRes] = await Promise.all([
        supabase.from("availability").select("time_slot").eq("boat_id", selectedBoat).eq("date", date),
        supabase.from("proposals").select("time_slot").eq("boat_id", selectedBoat).eq("date", date).neq("status", "rechazada")
      ]);
      if (!isMounted) return;
      const occupiedData = [...(availRes.data || []).map(a => a.time_slot), ...(propRes.data || []).map(p => p.time_slot)];
      const blocked = TIME_SLOTS.filter(stdSlot => occupiedData.some(dbSlot => isOverlapping(stdSlot, dbSlot)));
      setBlockedSlots(blocked);
      setCheckingAvailability(false);
      // USAMOS FUNCIÓN FUNCIONAL PARA NO AÑADIR 'timeSlot' A LAS DEPENDENCIAS
      setTimeSlot((prev) => blocked.includes(prev) ? "" : prev);
    };
    checkAvailability();
    return () => { isMounted = false; };
  }, [isModalOpen, selectedBoat, date, supabase]);

  // LÓGICA MÁGICA: CALCULAR PRECIO (Solucionado el error de React 19)
  useEffect(() => {
    const calculatePrice = () => {
      if (!isModalOpen || !selectedBoat || !date || !timeSlot) {
        setPrice("");
        setAppliedRateInfo(null);
        return;
      }

         console.log("🔍 RADAR - Buscando tarifa:", { 
        barcoSeleccionado: selectedBoat, 
        fechaSeleccionada: date, 
        horario: timeSlot, 
        totalTarifasEnBD: rates.length,
        tarifasDisponibles: rates 
      });

      const rate = findApplicableRate(rates, selectedBoat, date, timeSlot);
      
      if (rate) {
        const finalPrice = calculateFinalPrice(rate.price, rate.discount_pct);
        setPrice(finalPrice.toString());
        setAppliedRateInfo(`Tarifa ${rate.seasons?.name} aplicada (Base: ${rate.price}€ - ${rate.discount_pct}% desc.)`);
      } else {
        setPrice("");
        setAppliedRateInfo("No hay tarifa configurada para este barco/fecha/horario.");
      }
    };

    const timer = setTimeout(calculatePrice, 0);
    return () => clearTimeout(timer);
  }, [isModalOpen, selectedBoat, date, timeSlot, rates]);

  const openModal = () => {
    setSelectedClient(""); setSelectedBoat("");
    setDate(new Date().toISOString().split("T")[0]);
    setTimeSlot(""); setPrice(""); setBlockedSlots([]); setAppliedRateInfo(null);
    setIsModalOpen(true);
  };

  const handleAddProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeSlot || !price) { toast.warning("Selecciona un horario válido y espera a que se calcule el precio."); return; }
    setSaving(true);
    setError(null);
    
    const [availRes, propRes] = await Promise.all([
      supabase.from("availability").select("time_slot").eq("boat_id", selectedBoat).eq("date", date),
      supabase.from("proposals").select("time_slot").eq("boat_id", selectedBoat).eq("date", date).neq("status", "rechazada")
    ]);
    const existingSlots = [...(availRes.data || []).map(a => a.time_slot), ...(propRes.data || []).map(p => p.time_slot)];
    const conflict = existingSlots.find(slot => isOverlapping(slot, timeSlot));
    
    if (conflict) {
      toast.error(`Conflicto de horario con ${conflict}`);
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("proposals").insert([{
      client_id: selectedClient, boat_id: selectedBoat, date, time_slot: timeSlot,
      base_price: Number(price), total_price: Number(price), status: "borrador"
    }]);
    
    if (error) {
      toast.error("Error al crear propuesta: " + error.message);
    } else { 
      setIsModalOpen(false); 
      await fetchData();
      toast.success("Propuesta creada con éxito");
    }
    setSaving(false);
  };

  const requestDeleteProposal = (id: string, clientName: string) => {
    setConfirmConfig({
      title: "Eliminar Propuesta",
      message: `¿Estás seguro de que quieres eliminar la propuesta de ${clientName}? Esta acción no se puede deshacer.`,
      action: async () => {
        const { error } = await supabase.from("proposals").delete().eq("id", id);
        if (error) toast.error("Error al borrar: " + error.message);
        else { await fetchData(); toast.success("Propuesta eliminada"); }
      }
    });
    setConfirmOpen(true);
  };

  const requestConvertToReservation = (p: Proposal) => {
    setConfirmConfig({
      title: "Convertir a Reserva",
      message: `¿Convertir la propuesta de ${p.clients?.first_name} en una reserva oficial? Se bloqueará el calendario para el barco ${p.boats?.name}.`,
      action: async () => {
        const { error: resError } = await supabase.from("reservations").insert([{
          proposal_id: p.id, client_id: p.client_id, boat_id: p.boat_id,
          date: p.date, time_slot: p.time_slot, total_price: p.total_price, status: 'pendiente_pago'
        }]);
        if (resError) { toast.error("Error al crear reserva: " + resError.message); return; }
        await supabase.from("proposals").update({ status: 'aceptada' }).eq("id", p.id);
        await supabase.from("availability").insert([{ boat_id: p.boat_id, date: p.date, time_slot: p.time_slot, status: 'reservado' }]);
        toast.success("¡Reserva creada con éxito!");
        await fetchData();
      }
    });
    setConfirmOpen(true);
  };

  const copyClientLink = (proposalId: string) => {
    const url = `${window.location.origin}/client/${proposalId}`;
    navigator.clipboard.writeText(url);
    toast.success("Enlace del portal copiado", { description: "Envíalo al cliente por WhatsApp o Email." });
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Propuestas</h1>
          <p className="text-slate-400 mt-1">Crea ofertas y conviértelas en reservas.</p>
        </div>
        <button onClick={openModal} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] w-full sm:w-auto flex items-center justify-center gap-2">
          <Plus size={18} /> Nueva Propuesta
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg">Error: {error}</div>}

      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-white/5 text-slate-300 text-sm border-b border-white/10">
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium">Barco</th>
                <th className="px-6 py-4 font-medium">Fecha / Hora</th>
                <th className="px-6 py-4 font-medium">Precio</th>
                <th className="px-6 py-4 font-medium">Estado</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Cargando...</td></tr>
              ) : proposals.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">No hay propuestas creadas.</td></tr>
              ) : (
                <AnimatePresence>
                  {proposals.map((p) => {
                    const unread = unreadCounts[p.id] || 0;
                    return (
                      <motion.tr 
                        key={p.id} 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className={`transition-colors group ${unread > 0 ? 'bg-orange-500/5 hover:bg-orange-500/10' : 'hover:bg-white/5'}`}
                      >
                        <td className="px-6 py-4 font-medium text-white">
                          <div className="flex items-center gap-2">
                            {unread > 0 && (
                              <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                              </span>
                            )}
                            {p.clients?.first_name} {p.clients?.last_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-300">{p.boats?.name}</td>
                        <td className="px-6 py-4 text-slate-300">{p.date} <br/><span className="text-xs text-slate-500">{p.time_slot}</span></td>
                        <td className="px-6 py-4 text-slate-300 font-bold">{p.total_price} €</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold tracking-wide border ${
                            p.status === 'aceptada' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          } uppercase`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => copyClientLink(p.id)} className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-md transition-colors" title="Copiar enlace">
                            <Link2 size={16} />
                          </button>
                          <button onClick={() => { setChatProposal({ id: p.id, name: p.clients?.first_name || '' }); setIsChatOpen(true); }} className={`relative text-white p-2 rounded-md transition-colors ${unread > 0 ? 'bg-orange-600 hover:bg-orange-500' : 'bg-white/5 hover:bg-white/10'}`} title="Abrir chat">
                            <MessageSquare size={16} />
                            {unread > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-[#0f172a]">{unread}</span>}
                          </button>
                          {p.status === 'borrador' && (
                            <button onClick={() => requestConvertToReservation(p)} className="text-white bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white text-sm font-medium px-3 py-2 rounded-md transition-all flex items-center gap-1">
                              <CheckCircle2 size={16} /> Convertir
                            </button>
                          )}
                          <button onClick={() => requestDeleteProposal(p.id, p.clients?.first_name || "")} className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-md transition-colors" title="Eliminar">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NUEVA PROPUESTA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0f172a] rounded-xl border border-white/10 shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-white/10 shrink-0">
              <h2 className="text-xl font-bold text-white">Nueva Propuesta</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddProposal} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Cliente</label>
                <select required value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 transition-colors">
                  <option value="">Selecciona un cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id} className="bg-slate-800">{c.first_name} {c.last_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Barco</label>
                  <select required value={selectedBoat} onChange={(e) => setSelectedBoat(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 transition-colors">
                    <option value="">Selecciona...</option>
                    {boats.map(b => <option key={b.id} value={b.id} className="bg-slate-800">{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Fecha</label>
                  <input type="date" required value={date} min={new Date().toISOString().split("T")[0]} onChange={(e) => setDate(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Horarios Disponibles</label>
                {!selectedBoat ? (
                  <div className="text-sm text-slate-500 bg-white/5 p-4 rounded-lg text-center border border-white/10 border-dashed">
                    Selecciona un barco y fecha para ver disponibilidad.
                  </div>
                ) : checkingAvailability ? (
                  <div className="text-sm text-slate-400 p-3 text-center">Comprobando...</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {TIME_SLOTS.map(slot => {
                      const isBlocked = blockedSlots.includes(slot);
                      const isSelected = timeSlot === slot;
                      return (
                        <button key={slot} type="button" disabled={isBlocked} onClick={() => setTimeSlot(slot)}
                          className={`px-2 py-2.5 text-xs font-medium rounded-lg border transition-all duration-200 text-center ${
                            isBlocked ? "bg-red-500/10 text-red-500/50 border-red-500/20 cursor-not-allowed line-through" 
                            : isSelected ? "bg-blue-600 text-white border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                            : "bg-white/5 text-slate-400 border-white/10 hover:border-slate-500"
                          }`}>
                          {slot.split(' (')[0]}<br/>
                          <span className="opacity-75">{slot.split('(')[1].replace(')', '')}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* CAMPO DE PRECIO AUTOMÁTICO */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Precio Total (€)</label>
                <div className="relative">
                  <input type="number" readOnly value={price} className="w-full bg-white/5 text-emerald-400 font-bold text-lg px-4 py-2.5 rounded-lg border border-white/10 cursor-not-allowed" placeholder="Esperando cálculo..." />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                    <Lock size={16} />
                  </div>
                </div>
                {appliedRateInfo && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-blue-400">
                    <Info size={12} /> {appliedRateInfo}
                  </div>
                )}
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium py-2.5 rounded-lg transition-colors order-2 sm:order-1">Cancelar</button>
                <button type="submit" disabled={saving || !timeSlot || !price} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg transition-all disabled:opacity-50 order-1 sm:order-2">
                  {saving ? "Guardando..." : "Crear Propuesta"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {chatProposal && (
        <ChatModal isOpen={isChatOpen} onClose={() => { setIsChatOpen(false); fetchUnreadCounts(); }} proposalId={chatProposal.id} clientName={chatProposal.name} onRead={fetchUnreadCounts} />
      )}

      <ConfirmDialog 
        isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={confirmConfig.action}
        title={confirmConfig.title} message={confirmConfig.message} confirmText="Sí, continuar" type="danger"
      />
    </div>
  );
}