"use client";

import { useEffect, useState, useMemo, useCallback, ElementType } from "react";
import { createClient } from "@/utils/client";
import Image from "next/image";
import { toast } from "sonner"; 
import { motion, AnimatePresence } from "framer-motion";
import { 
  Eye, CreditCard, Banknote, Users, ClipboardList, Gift, 
  FileText, AlertTriangle, Coins, Plus, Check, Trash2, 
  X, QrCode, Printer, PenTool, CheckCircle2, Anchor
} from "lucide-react";

type Reservation = { 
  id: string; 
  date: string; 
  time_slot: string; 
  total_price: number | string; 
  status: string; 
  clients: { first_name: string; last_name: string; email: string } | null; 
  boats: { name: string } | null;
};
type Payment = { id: string; reservation_id: string; amount: number | string; status: string; };
type Passenger = { id: string; first_name: string; last_name: string; document_id: string; };
type Task = { id: string; description: string; status: string; };
type Extra = { id: string; name: string; price: number; };
type SelectedExtra = { id: string; extra_id: string; quantity: number; total_price: number; extras: { name: string; price: number } | null; };
type Contract = { id: string; status: string; signed_at: string | null; signed_by: string | null; };
type Incident = { id: string; description: string; status: string; };
type Tip = { id: string; amount: number; notes: string; };

// DEFINIMOS LOS TIPOS EXACTOS DE LAS PESTAÑAS
type TabId = "pasajeros" | "tareas" | "extras" | "contrato" | "incidencias" | "propinas";

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("pasajeros");
  
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [pFirstName, setPFirstName] = useState("");
  const [pLastName, setPLastName] = useState("");
  const [pDocument, setPDocument] = useState("");
  const [savingPassenger, setSavingPassenger] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskDesc, setTaskDesc] = useState("");
  const [savingTask, setSavingTask] = useState(false);

  const [catalogExtras, setCatalogExtras] = useState<Extra[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<SelectedExtra[]>([]);
  const [savingExtra, setSavingExtra] = useState(false);

  const [contract, setContract] = useState<Contract | null>(null);
  const [signingContract, setSigningContract] = useState(false);
  const [signatureName, setSignatureName] = useState("");

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incidentDesc, setIncidentDesc] = useState("");
  const [savingIncident, setSavingIncident] = useState(false);

  const [tips, setTips] = useState<Tip[]>([]);
  const [tipAmount, setTipAmount] = useState("");
  const [tipNotes, setTipNotes] = useState("");
  const [savingTip, setSavingTip] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  // ENVOLVEMOS FETCHDATA EN USECALLBACK
  const fetchData = useCallback(async () => {
    try {
      const [resRes, payRes] = await Promise.all([
        supabase.from("reservations").select(`*, clients (first_name, last_name, email), boats (name)`).order("date", { ascending: true }),
        supabase.from("payments").select("*")
      ]);
      if (resRes.error) throw resRes.error;
      if (payRes.error) throw payRes.error;
      setReservations(resRes.data || []);
      setPayments(payRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    let active = true;
    const loadInitialData = async () => {
      if (active) await fetchData();
    };
    const timer = setTimeout(loadInitialData, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [fetchData]); // AHORA TIENE SU DEPENDENCIA

  const handleChargeDeposit = async (res: Reservation) => {
    const total = Number(res.total_price) || 0;
    const depositAmount = (total * 0.30) + 20;
    
    if (!window.confirm(`¿Cobrar depósito del 30% + 20€ Tarifa?\n\nTotal: ${depositAmount.toFixed(2)} €`)) return;
    
    setProcessingId(res.id);
    try {
      const { error: payError } = await supabase.from("payments").insert([{ 
        reservation_id: res.id, type: "deposito", method: "stripe", amount: depositAmount, status: "completado" 
      }]);
      if (payError) throw new Error(payError.message);
      
      await supabase.from("reservations").update({ status: 'confirmada' }).eq("id", res.id);
      await fetchData();
      toast.success(`Depósito de ${depositAmount.toFixed(2)}€ cobrado`);
    } catch (err) { 
      toast.error("Error: " + (err instanceof Error ? err.message : "Desconocido")); 
    } finally { setProcessingId(null); }
  };

  const handleChargePending = async (res: Reservation, exactAmount: number) => {
    if (exactAmount <= 0) return;
    if (!window.confirm(`¿Cobrar el saldo pendiente?\n\nTotal: ${exactAmount.toFixed(2)} €`)) return;
    
    setProcessingId(res.id);
    try {
      const { error: payError } = await supabase.from("payments").insert([{ 
        reservation_id: res.id, type: "saldo", method: "efectivo", amount: exactAmount, status: "completado" 
      }]);
      if (payError) throw new Error(payError.message);
      
      await supabase.from("reservations").update({ status: 'pagada' }).eq("id", res.id);
      await fetchData();
      toast.success(`Saldo de ${exactAmount.toFixed(2)}€ cobrado`);
    } catch (err) { 
      toast.error("Error: " + (err instanceof Error ? err.message : "Desconocido")); 
    } finally { setProcessingId(null); }
  };

  const openDetailsModal = async (res: Reservation) => {
    setSelectedRes(res);
    setIsModalOpen(true);
    setActiveTab("pasajeros");
    setPFirstName(""); setPLastName(""); setPDocument(""); setTaskDesc(""); setSignatureName(""); setIncidentDesc(""); setTipAmount(""); setTipNotes("");

    const [passRes, taskRes, extrasRes, catRes, contractRes, incRes, tipRes] = await Promise.all([
      supabase.from("passengers").select("*").eq("reservation_id", res.id),
      supabase.from("tasks").select("*").eq("reservation_id", res.id),
      supabase.from("reservation_extras").select(`*, extras(name, price)`).eq("reservation_id", res.id),
      supabase.from("extras").select("*").eq("is_active", true),
      supabase.from("contracts").select("*").eq("reservation_id", res.id).maybeSingle(),
      supabase.from("incidents").select("*").eq("reservation_id", res.id).order("created_at", { ascending: false }),
      supabase.from("tips").select("*").eq("reservation_id", res.id).order("created_at", { ascending: false })
    ]);
    
    setPassengers(passRes.data || []);
    setTasks(taskRes.data || []);
    setSelectedExtras(extrasRes.data || []);
    setCatalogExtras(catRes.data || []);
    setContract(contractRes.data || null);
    setIncidents(incRes.data || []);
    setTips(tipRes.data || []);
  };

  const handleAddExtraToRes = async (extra: Extra) => {
    if (!selectedRes) return;
    setSavingExtra(true);
    const { data, error } = await supabase.from("reservation_extras").insert([{
      reservation_id: selectedRes.id, extra_id: extra.id, quantity: 1, total_price: extra.price
    }]).select(`*, extras(name, price)`).single();

    if (error) {
      toast.error("Error al añadir el extra: " + error.message);
    } else if (data) {
      setSelectedExtras([...selectedExtras, data]);
      const newTotal = (Number(selectedRes.total_price) || 0) + (Number(extra.price) || 0);
      const { error: updateError } = await supabase.from("reservations").update({ total_price: newTotal }).eq("id", selectedRes.id);
      
      if (updateError) {
        toast.error("Error al actualizar total: " + updateError.message);
      } else {
        setSelectedRes({ ...selectedRes, total_price: newTotal });
        await fetchData();
        toast.success("Extra añadido");
      }
    }
    setSavingExtra(false);
  };

  const handleRemoveExtraFromRes = async (id: string, price: number) => {
    if (!selectedRes) return;
    const { error } = await supabase.from("reservation_extras").delete().eq("id", id);
    if (!error) {
      setSelectedExtras(selectedExtras.filter(e => e.id !== id));
      const newTotal = (Number(selectedRes.total_price) || 0) - (Number(price) || 0);
      await supabase.from("reservations").update({ total_price: newTotal }).eq("id", selectedRes.id);
      setSelectedRes({ ...selectedRes, total_price: newTotal });
      await fetchData();
      toast.success("Extra eliminado");
    }
  };

  const handleAddPassenger = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedRes) return; setSavingPassenger(true);
    const { data, error } = await supabase.from("passengers").insert([{ reservation_id: selectedRes.id, first_name: pFirstName, last_name: pLastName, document_id: pDocument }]).select().single();
    if (!error && data) { setPassengers([...passengers, data]); setPFirstName(""); setPLastName(""); setPDocument(""); toast.success("Pasajero añadido"); }
    setSavingPassenger(false);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedRes) return; setSavingTask(true);
    const { data, error } = await supabase.from("tasks").insert([{ reservation_id: selectedRes.id, description: taskDesc, status: 'pendiente' }]).select().single();
    if (!error && data) { setTasks([...tasks, data]); setTaskDesc(""); toast.success("Tarea añadida"); }
    setSavingTask(false);
  };

  const handleToggleTask = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'pendiente' ? 'completada' : 'pendiente';
    await supabase.from("tasks").update({ status: newStatus }).eq("id", id);
    setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const handleSignContract = async () => {
    if (!selectedRes) return;
    if (!signatureName.trim()) { toast.warning("Escribe tu nombre para firmar."); return; }
    setSigningContract(true);
    try {
      if (contract) {
        await supabase.from("contracts").update({ status: 'firmado', signed_at: new Date().toISOString(), signed_by: signatureName }).eq("id", contract.id);
      } else {
        const { data } = await supabase.from("contracts").insert([{ reservation_id: selectedRes.id, status: 'firmado', signed_at: new Date().toISOString(), signed_by: signatureName, version: 'v1.0' }]).select().single();
        if (data) setContract(data);
      }
      toast.success("¡Contrato firmado con éxito!");
      await openDetailsModal(selectedRes);
    } catch (err) { 
      // SOLUCIÓN AL ERROR 2: Usamos la variable err
      toast.error("Error al firmar contrato: " + (err instanceof Error ? err.message : "Desconocido"));
    } finally { setSigningContract(false); }
  };

  const handleAddIncident = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedRes) return; setSavingIncident(true);
    const { data, error } = await supabase.from("incidents").insert([{ reservation_id: selectedRes.id, description: incidentDesc, status: 'abierta' }]).select().single();
    if (!error && data) { setIncidents([data, ...incidents]); setIncidentDesc(""); toast.warning("Incidencia reportada"); }
    setSavingIncident(false);
  };

  const handleResolveIncident = async (id: string) => {
    await supabase.from("incidents").update({ status: 'resuelta' }).eq("id", id);
    setIncidents(incidents.map(i => i.id === id ? { ...i, status: 'resuelta' } : i));
    toast.success("Incidencia resuelta");
  };

  const handleAddTip = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedRes) return; setSavingTip(true);
    const { data, error } = await supabase.from("tips").insert([{ reservation_id: selectedRes.id, amount: Number(tipAmount), notes: tipNotes }]).select().single();
    if (!error && data) { setTips([data, ...tips]); setTipAmount(""); setTipNotes(""); toast.success("Propina registrada"); }
    setSavingTip(false);
  };

  // DEFINIMOS LAS PESTAÑAS CON SU TIPO CORRECTO
  const tabs: { id: TabId, label: string, icon: ElementType }[] = [
    { id: "pasajeros", label: "Pasajeros", icon: Users },
    { id: "tareas", label: "Tareas", icon: ClipboardList },
    { id: "extras", label: "Extras", icon: Gift },
    { id: "contrato", label: "Contrato", icon: FileText },
    { id: "incidencias", label: "Incidencias", icon: AlertTriangle },
    { id: "propinas", label: "Propinas", icon: Coins }
  ];

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Reservas</h1>
          <p className="text-slate-400 mt-1">Controla las salidas confirmadas y pendientes.</p>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg">Error: {error}</div>}

      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-white/5 text-slate-300 text-sm border-b border-white/10">
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium">Barco</th>
                <th className="px-6 py-4 font-medium">Fecha</th>
                <th className="px-6 py-4 font-medium">Total</th>
                <th className="px-6 py-4 font-medium">Estado</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Cargando...</td></tr>
              ) : reservations.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">No hay reservas registradas.</td></tr>
              ) : (
                <AnimatePresence>
                  {reservations.map((r) => {
                    const totalPrice = Number(r.total_price) || 0;
                    const pagosDeEstaReserva = payments.filter(p => p.reservation_id === r.id && p.status === 'completado');
                    const totalPaid = pagosDeEstaReserva.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
                    const pending = Math.round((totalPrice - totalPaid) * 100) / 100;

                    return (
                      <motion.tr 
                        key={r.id} 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="hover:bg-white/5 transition-colors group"
                      >
                        <td className="px-6 py-4 font-medium text-white">{r.clients?.first_name} {r.clients?.last_name}</td>
                        <td className="px-6 py-4 text-slate-300 flex items-center gap-2">
                          <Anchor size={14} className="text-blue-400"/> {r.boats?.name}
                        </td>
                        <td className="px-6 py-4 text-slate-300">{r.date} <br/><span className="text-xs text-slate-500">{r.time_slot}</span></td>
                        <td className="px-6 py-4 text-slate-300 font-bold">
                          {totalPrice.toFixed(2)} €
                          <div className="text-[10px] text-slate-500 font-normal mt-1">
                            Pagado: {totalPaid.toFixed(2)} | Faltan: {pending.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                            r.status === 'pagada' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                            r.status === 'confirmada' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : 
                            "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          } uppercase`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => openDetailsModal(r)} className="text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-md transition-colors" title="Ver detalles">
                            <Eye size={16} />
                          </button>
                          
                          {pending > 0.01 && totalPaid === 0 && (
                            <button onClick={() => handleChargeDeposit(r)} disabled={processingId === r.id} className="text-white bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white text-sm font-medium px-3 py-2 rounded-md transition-all disabled:opacity-50 flex items-center gap-1">
                              <CreditCard size={16} /> Depósito
                            </button>
                          )}
                          
                          {pending > 0.01 && totalPaid > 0 && (
                            <button onClick={() => handleChargePending(r, pending)} disabled={processingId === r.id} className="text-white bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white text-sm font-medium px-3 py-2 rounded-md transition-all disabled:opacity-50 flex items-center gap-1">
                              <Banknote size={16} /> Cobrar {pending.toFixed(2)} €
                            </button>
                          )}
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

      {/* MODAL DE DETALLES */}
      {isModalOpen && selectedRes && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#0f172a]/95 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 md:p-6 border-b border-white/10 shrink-0 bg-white/5">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Detalles de la Reserva</h2>
                <p className="text-sm text-slate-400">{selectedRes.date} · {selectedRes.time_slot}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            
            <div className="p-5 md:p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-6 custom-scrollbar">
              
              {/* COLUMNA IZQUIERDA: INFO Y QR */}
              <div className="space-y-4">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <p className="text-xs text-slate-400 mb-1">Cliente</p>
                  <p className="font-bold text-white text-lg">{selectedRes.clients?.first_name} {selectedRes.clients?.last_name}</p>
                  <p className="text-xs text-slate-400 mt-3 mb-1">Barco</p>
                  <p className="font-medium text-blue-400 flex items-center gap-2"><Anchor size={14}/> {selectedRes.boats?.name}</p>
                </div>
                <div className="bg-white p-4 rounded-xl flex flex-col items-center justify-center shadow-inner">
                  <Image src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=IMA-CLUB-RES-${selectedRes.id}`} alt="QR" width={128} height={128} className="w-32 h-32" />
                  <p className="text-xs text-center text-slate-800 font-bold mt-2 flex items-center gap-1"><QrCode size={14}/> Check-in QR</p>
                </div>
              </div>

              {/* COLUMNA DERECHA: PESTAÑAS Y CONTENIDO */}
              <div className="md:col-span-2 flex flex-col h-full">
                
                {/* PESTAÑAS CRISTAL */}
                <div className="flex gap-2 mb-4 border-b border-white/10 pb-2 overflow-x-auto custom-scrollbar">
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)} // SOLUCIÓN AL ERROR 1: Sin "as any"
                        className={`px-3 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg transition-colors flex items-center gap-2 ${
                          isActive ? "text-blue-400 border-b-2 border-blue-400 bg-white/5" : "text-slate-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <Icon size={16} /> {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* CONTENIDO DE PESTAÑAS */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  
                  {/* PASAJEROS */}
                  {activeTab === "pasajeros" && (
                    <div className="flex flex-col h-full">
                      <div className="flex-1 space-y-2 mb-4">
                        {passengers.length === 0 ? <p className="text-sm text-slate-500 italic">No hay pasajeros.</p> : passengers.map(p => (
                          <div key={p.id} className="flex justify-between bg-white/5 p-3 rounded-lg border border-white/10 text-sm">
                            <div><p className="text-white font-medium">{p.first_name} {p.last_name}</p><p className="text-xs text-slate-400">{p.document_id || "Sin documento"}</p></div>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={handleAddPassenger} className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3 mt-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input type="text" required placeholder="Nombre" value={pFirstName} onChange={e => setPFirstName(e.target.value)} className="bg-[#0f172a] text-white px-3 py-2 rounded-md text-sm border border-white/10 outline-none focus:border-blue-500" />
                          <input type="text" required placeholder="Apellido" value={pLastName} onChange={e => setPLastName(e.target.value)} className="bg-[#0f172a] text-white px-3 py-2 rounded-md text-sm border border-white/10 outline-none focus:border-blue-500" />
                        </div>
                        <input type="text" placeholder="DNI / Pasaporte" value={pDocument} onChange={e => setPDocument(e.target.value)} className="w-full bg-[#0f172a] text-white px-3 py-2 rounded-md text-sm border border-white/10 outline-none focus:border-blue-500" />
                        <button type="submit" disabled={savingPassenger} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-md text-sm transition-colors flex items-center justify-center gap-1">
                          <Plus size={16} /> Añadir Pasajero
                        </button>
                      </form>
                    </div>
                  )}

                  {/* TAREAS */}
                  {activeTab === "tareas" && (
                    <div className="flex flex-col h-full">
                      <div className="flex-1 space-y-2 mb-4">
                        {tasks.length === 0 ? <p className="text-sm text-slate-500 italic">No hay tareas.</p> : tasks.map(t => (
                          <div key={t.id} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/10 text-sm">
                            <div className="flex items-center gap-3">
                              <input type="checkbox" checked={t.status === 'completada'} onChange={() => handleToggleTask(t.id, t.status)} className="w-4 h-4 cursor-pointer accent-blue-500" />
                              <p className={`font-medium ${t.status === 'completada' ? 'line-through text-slate-500' : 'text-white'}`}>{t.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={handleAddTask} className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3 mt-auto">
                        <input type="text" required placeholder="Ej: Comprar hielo" value={taskDesc} onChange={e => setTaskDesc(e.target.value)} className="w-full bg-[#0f172a] text-white px-3 py-2 rounded-md text-sm border border-white/10 outline-none focus:border-blue-500" />
                        <button type="submit" disabled={savingTask} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-md text-sm transition-colors flex items-center justify-center gap-1">
                          <Plus size={16} /> Añadir Tarea
                        </button>
                      </form>
                    </div>
                  )}

                  {/* EXTRAS */}
                  {activeTab === "extras" && (
                    <div className="flex flex-col h-full">
                      <div className="flex-1 space-y-2 mb-4">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Extras en esta reserva:</p>
                        {selectedExtras.length === 0 ? <p className="text-sm text-slate-500 italic">No hay extras añadidos.</p> : selectedExtras.map(se => (
                          <div key={se.id} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/10 text-sm">
                            <p className="text-white font-medium">{se.extras?.name} <span className="text-emerald-400 font-bold">({se.total_price} €)</span></p>
                            <button onClick={() => handleRemoveExtraFromRes(se.id, se.total_price)} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={16}/></button>
                          </div>
                        ))}
                      </div>
                      <div className="bg-white/5 p-4 rounded-xl border border-white/10 mt-auto">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Añadir extra:</p>
                        <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                          {catalogExtras.map(ce => (
                            <div key={ce.id} className="flex justify-between items-center bg-[#0f172a] p-2 rounded-md border border-white/10 text-sm">
                              <span className="text-white">{ce.name} - {ce.price} €</span>
                              <button onClick={() => handleAddExtraToRes(ce)} disabled={savingExtra} className="bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50">+ Añadir</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CONTRATO */}
                  {activeTab === "contrato" && (
                    <div className="flex flex-col h-full">
                      {contract?.status === 'firmado' ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl mb-4 text-center">
                          <p className="text-emerald-400 font-bold text-lg mb-1 flex items-center justify-center gap-1"><CheckCircle2 size={18}/> Contrato Firmado</p>
                          <p className="text-sm text-slate-300">Por: <strong>{contract.signed_by}</strong> el {new Date(contract.signed_at!).toLocaleDateString()}</p>
                        </div>
                      ) : (
                        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl mb-4 text-center">
                          <p className="text-amber-400 font-bold flex items-center justify-center gap-1"><AlertTriangle size={18}/> Pendiente de Firma</p>
                        </div>
                      )}

                      <div className="bg-white text-slate-800 p-6 rounded-lg text-sm shadow-inner overflow-y-auto max-h-[30vh] mb-4">
                        <h3 className="font-bold text-lg mb-4 text-center">CONTRATO DE ALQUILER</h3>
                        <p className="mb-2"><strong>Cliente:</strong> {selectedRes.clients?.first_name} {selectedRes.clients?.last_name}</p>
                        <p className="mb-2"><strong>Barco:</strong> {selectedRes.boats?.name}</p>
                        <p className="mb-4"><strong>Fecha:</strong> {selectedRes.date} · {selectedRes.time_slot}</p>
                        <p className="text-xs text-justify mt-4">El cliente acepta las condiciones de navegación y se compromete al cuidado de la embarcación. El capitán tiene la autoridad final por motivos de seguridad.</p>
                        {contract?.status === 'firmado' && (
                          <div className="mt-8 border-t border-slate-300 pt-4">
                            <p className="text-xs text-slate-500">Firma del cliente:</p>
                            <p className="text-2xl mt-2" style={{ fontFamily: 'cursive', color: 'blue' }}>{contract.signed_by}</p>
                          </div>
                        )}
                      </div>

                      {!contract || contract.status !== 'firmado' ? (
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 mt-auto">
                          <input type="text" value={signatureName} onChange={(e) => setSignatureName(e.target.value)} placeholder="Escribe el nombre completo" className="w-full bg-[#0f172a] text-white px-3 py-2 rounded-md text-sm border border-white/10 outline-none mb-3 focus:border-blue-500" />
                          <button onClick={handleSignContract} disabled={signingContract} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                            {signingContract ? "Firmando..." : <><PenTool size={16}/> Firmar Contrato</>}
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => window.print()} className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-2 rounded-md transition-colors mt-auto flex items-center justify-center gap-2">
                          <Printer size={16}/> Imprimir / Guardar PDF
                        </button>
                      )}
                    </div>
                  )}

                  {/* INCIDENCIAS */}
                  {activeTab === "incidencias" && (
                    <div className="flex flex-col h-full">
                      <div className="flex-1 space-y-2 mb-4">
                        {incidents.length === 0 ? <p className="text-sm text-slate-500 italic">No hay incidencias reportadas.</p> : incidents.map(i => (
                          <div key={i.id} className={`p-3 rounded-lg border text-sm flex justify-between items-center ${i.status === 'resuelta' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                            <div>
                              <p className={`font-medium ${i.status === 'resuelta' ? 'text-slate-400 line-through' : 'text-white'}`}>{i.description}</p>
                              <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{i.status}</span>
                            </div>
                            {i.status !== 'resuelta' && (
                              <button onClick={() => handleResolveIncident(i.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                                <Check size={12}/> Resolver
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <form onSubmit={handleAddIncident} className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3 mt-auto">
                        <input type="text" required placeholder="Ej: Falta una toalla..." value={incidentDesc} onChange={e => setIncidentDesc(e.target.value)} className="w-full bg-[#0f172a] text-white px-3 py-2 rounded-md text-sm border border-white/10 outline-none focus:border-blue-500" />
                        <button type="submit" disabled={savingIncident} className="w-full bg-red-600 hover:bg-red-500 text-white font-medium py-2 rounded-md text-sm transition-colors flex items-center justify-center gap-1">
                          <AlertTriangle size={16} /> Reportar Incidencia
                        </button>
                      </form>
                    </div>
                  )}

                  {/* PROPINAS */}
                  {activeTab === "propinas" && (
                    <div className="flex flex-col h-full">
                      <div className="flex-1 space-y-2 mb-4">
                        {tips.length === 0 ? <p className="text-sm text-slate-500 italic">No hay propinas registradas.</p> : tips.map(t => (
                          <div key={t.id} className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex justify-between items-center text-sm">
                            <p className="text-white font-medium">{t.notes || "Propina general"}</p>
                            <p className="text-emerald-400 font-bold text-lg">{Number(t.amount).toFixed(2)} €</p>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={handleAddTip} className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3 mt-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input type="number" required min="0" step="0.01" placeholder="Importe (€)" value={tipAmount} onChange={e => setTipAmount(e.target.value)} className="bg-[#0f172a] text-white px-3 py-2 rounded-md text-sm border border-white/10 outline-none focus:border-blue-500" />
                          <input type="text" placeholder="Nota (opcional)" value={tipNotes} onChange={e => setTipNotes(e.target.value)} className="bg-[#0f172a] text-white px-3 py-2 rounded-md text-sm border border-white/10 outline-none focus:border-blue-500" />
                        </div>
                        <button type="submit" disabled={savingTip} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium py-2 rounded-md text-sm transition-colors flex items-center justify-center gap-1">
                          <Coins size={16} /> Registrar Propina
                        </button>
                      </form>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}