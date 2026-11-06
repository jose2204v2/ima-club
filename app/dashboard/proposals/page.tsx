"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/utils/client";
import ChatModal from "./components/ChatModal";
import { showToast } from "@/utils/toast"; // <-- IMPORTAMOS EL TOAST

type Client = { id: string; first_name: string; last_name: string; };
type Boat = { id: string; name: string; base_price: number; };
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Estados del Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedBoat, setSelectedBoat] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [timeSlot, setTimeSlot] = useState("10:00-13:30 (Morning)");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  // Estados del Calendario Visual
  const [blockedSlots, setBlockedSlots] = useState<string[]>([]);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Estados del Chat
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
    const { data: propData, error: propError } = await supabase
      .from("proposals")
      .select(`*, clients (first_name, last_name), boats (name)`)
      .order("created_at", { ascending: false });

    if (propError) setError(propError.message);
    else setProposals(propData || []);

    const [cliRes, boatRes] = await Promise.all([
      supabase.from("clients").select("id, first_name, last_name"),
      supabase.from("boats").select("id, name, base_price")
    ]);
    
    if (cliRes.data) setClients(cliRes.data);
    if (boatRes.data) setBoats(boatRes.data);
    
    await fetchUnreadCounts();
    setLoading(false);
  }, [supabase, fetchUnreadCounts]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (isMounted) await fetchData();
    };

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

  // Efecto disponibilidad
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
      setTimeSlot((prev) => blocked.includes(prev) ? "" : prev);
    };
    checkAvailability();
    return () => { isMounted = false; };
  }, [isModalOpen, selectedBoat, date, supabase]);

  const handleBoatChange = (boatId: string) => {
    setSelectedBoat(boatId);
    const boat = boats.find(b => b.id === boatId);
    if (boat) setPrice(boat.base_price.toString());
  };

  const openModal = () => {
    setSelectedClient(""); setSelectedBoat("");
    setDate(new Date().toISOString().split("T")[0]);
    setTimeSlot(""); setPrice(""); setBlockedSlots([]);
    setIsModalOpen(true);
  };

  const handleAddProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeSlot) { showToast("Selecciona un horario disponible", "warning"); return; } // <-- TOAST
    
    setSaving(true);
    setError(null);
    const [availRes, propRes] = await Promise.all([
      supabase.from("availability").select("time_slot").eq("boat_id", selectedBoat).eq("date", date),
      supabase.from("proposals").select("time_slot").eq("boat_id", selectedBoat).eq("date", date).neq("status", "rechazada")
    ]);
    const existingSlots = [...(availRes.data || []).map(a => a.time_slot), ...(propRes.data || []).map(p => p.time_slot)];
    const conflict = existingSlots.find(slot => isOverlapping(slot, timeSlot));
    
    if (conflict) {
      showToast(`Conflicto de horario con ${conflict}`, "error"); // <-- TOAST
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("proposals").insert([{
      client_id: selectedClient, boat_id: selectedBoat, date, time_slot: timeSlot,
      base_price: Number(price), total_price: Number(price), status: "borrador"
    }]);
    
    if (error) {
      showToast("Error al crear propuesta: " + error.message, "error"); // <-- TOAST
    } else { 
      setIsModalOpen(false); 
      await fetchData();
      showToast("Propuesta creada con éxito", "success"); // <-- TOAST
    }
    setSaving(false);
  };

  const handleDeleteProposal = async (id: string) => {
    if (!window.confirm("¿Seguro que quieres eliminar esta propuesta?")) return;
    const { error } = await supabase.from("proposals").delete().eq("id", id);
    if (error) {
      showToast("Error al borrar: " + error.message, "error"); // <-- TOAST
    } else {
      await fetchData();
      showToast("Propuesta eliminada", "success"); // <-- TOAST
    }
  };

  const handleConvertToReservation = async (p: Proposal) => {
    if (!window.confirm(`¿Convertir la propuesta de ${p.clients?.first_name} en reserva?`)) return;
    const { error: resError } = await supabase.from("reservations").insert([{
      proposal_id: p.id, client_id: p.client_id, boat_id: p.boat_id,
      date: p.date, time_slot: p.time_slot, total_price: p.total_price, status: 'pendiente_pago'
    }]);
    
    if (resError) { 
      showToast("Error al crear reserva: " + resError.message, "error"); // <-- TOAST
      return; 
    }
    
    await supabase.from("proposals").update({ status: 'aceptada' }).eq("id", p.id);
    await supabase.from("availability").insert([{
      boat_id: p.boat_id, date: p.date, time_slot: p.time_slot, status: 'reservado'
    }]);
    
    showToast("¡Reserva creada con éxito!", "success"); // <-- TOAST
    await fetchData();
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Propuestas</h1>
          <p className="text-slate-400 mt-1">Crea ofertas y conviértelas en reservas.</p>
        </div>
        <button onClick={openModal} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          + Nueva Propuesta
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg">Error: {error}</div>}

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/50 text-slate-400 text-sm border-b border-slate-700">
              <th className="px-6 py-4 font-medium">Cliente</th>
              <th className="px-6 py-4 font-medium">Barco</th>
              <th className="px-6 py-4 font-medium">Fecha / Hora</th>
              <th className="px-6 py-4 font-medium">Precio</th>
              <th className="px-6 py-4 font-medium">Estado</th>
              <th className="px-6 py-4 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Cargando...</td></tr>
            ) : proposals.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">No hay propuestas creadas.</td></tr>
            ) : (
              proposals.map((p) => {
                const unread = unreadCounts[p.id] || 0;
                return (
                  <tr key={p.id} className={`transition-colors ${unread > 0 ? 'bg-orange-500/5 hover:bg-orange-500/10' : 'hover:bg-slate-700/20'}`}>
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase ${
                        p.status === 'aceptada' ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => { setChatProposal({ id: p.id, name: p.clients?.first_name || '' }); setIsChatOpen(true); }}
                        className={`text-white text-sm font-medium px-3 py-1.5 rounded-md transition-colors relative ${
                          unread > 0 ? 'bg-orange-600 hover:bg-orange-700' : 'bg-slate-600 hover:bg-slate-500'
                        }`}>
                        💬 Chat
                        {unread > 0 && (
                          <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {unread}
                          </span>
                        )}
                      </button>
                      {p.status === 'borrador' && (
                        <button onClick={() => handleConvertToReservation(p)} className="text-white bg-blue-600 hover:bg-blue-700 text-sm font-medium px-4 py-1.5 rounded-md transition-colors shadow-lg shadow-blue-500/20">
                          🤝 Convertir
                        </button>
                      )}
                      <button onClick={() => handleDeleteProposal(p.id)} className="text-red-400 hover:text-red-300 text-sm font-medium px-3 py-1 bg-red-500/10 rounded-md transition-colors">
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL NUEVA PROPUESTA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">Nueva Propuesta</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleAddProposal} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Cliente</label>
                <select required value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700 focus:outline-none focus:border-blue-500">
                  <option value="">Selecciona un cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Barco</label>
                  <select required value={selectedBoat} onChange={(e) => handleBoatChange(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700 focus:outline-none focus:border-blue-500">
                    <option value="">Selecciona...</option>
                    {boats.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Fecha</label>
                  <input type="date" required value={date} min={new Date().toISOString().split("T")[0]} onChange={(e) => setDate(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700 focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Horarios Disponibles</label>
                {!selectedBoat ? (
                  <div className="text-sm text-slate-500 bg-slate-900 p-3 rounded text-center border border-slate-700 border-dashed">
                    Selecciona un barco y fecha.
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
                          className={`px-3 py-2 text-xs font-medium rounded border transition-all text-center ${
                            isBlocked ? "bg-red-500/10 text-red-500/50 border-red-500/20 cursor-not-allowed line-through" 
                            : isSelected ? "bg-blue-600 text-white border-blue-500 shadow-md"
                            : "bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20"
                          }`}>
                          {slot.split(' (')[0]}<br/>
                          <span className="opacity-75">{slot.split('(')[1].replace(')', '')}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Precio (€)</label>
                <input type="number" required min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-2 rounded border border-slate-700 focus:outline-none focus:border-blue-500" />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 rounded transition-colors">Cancelar</button>
                <button type="submit" disabled={saving || !timeSlot} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded transition-colors disabled:opacity-50">
                  {saving ? "Guardando..." : "Crear Propuesta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {chatProposal && (
        <ChatModal 
          isOpen={isChatOpen} 
          onClose={() => { setIsChatOpen(false); fetchUnreadCounts(); }} 
          proposalId={chatProposal.id} 
          clientName={chatProposal.name} 
          onRead={fetchUnreadCounts}
        />
      )}
    </div>
  );
}