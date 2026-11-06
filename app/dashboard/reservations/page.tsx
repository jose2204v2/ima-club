"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/client";
import Image from "next/image";
import { showToast } from "@/utils/toast"; // <-- IMPORTAMOS EL TOAST

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

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [activeTab, setActiveTab] = useState<"pasajeros" | "tareas" | "extras" | "contrato" | "incidencias" | "propinas">("pasajeros");
  
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

  const fetchData = async () => {
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
  };

  useEffect(() => {
    let active = true;
    const loadInitialData = async () => {
      try {
        const [resRes, payRes] = await Promise.all([
          supabase.from("reservations").select(`*, clients (first_name, last_name, email), boats (name)`).order("date", { ascending: true }),
          supabase.from("payments").select("*")
        ]);
        if (!active) return;
        if (resRes.error) throw resRes.error;
        if (payRes.error) throw payRes.error;
        setReservations(resRes.data || []);
        setPayments(payRes.data || []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Error");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadInitialData();
    return () => { active = false; };
  }, [supabase]);

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
      showToast(`Depósito de ${depositAmount.toFixed(2)}€ cobrado`, "success"); // <-- TOAST
    } catch (err) { 
      showToast("Error: " + (err instanceof Error ? err.message : "Desconocido"), "error"); // <-- TOAST
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
      showToast(`Saldo de ${exactAmount.toFixed(2)}€ cobrado`, "success"); // <-- TOAST
    } catch (err) { 
      showToast("Error: " + (err instanceof Error ? err.message : "Desconocido"), "error"); // <-- TOAST
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
      showToast("Error al añadir el extra: " + error.message, "error"); // <-- TOAST
    } else if (data) {
      setSelectedExtras([...selectedExtras, data]);
      const newTotal = (Number(selectedRes.total_price) || 0) + (Number(extra.price) || 0);
      const { error: updateError } = await supabase.from("reservations").update({ total_price: newTotal }).eq("id", selectedRes.id);
      
      if (updateError) {
        showToast("Error al actualizar total: " + updateError.message, "error"); // <-- TOAST
      } else {
        setSelectedRes({ ...selectedRes, total_price: newTotal });
        await fetchData();
        showToast("Extra añadido a la reserva", "success"); // <-- TOAST
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
      showToast("Extra eliminado", "success"); // <-- TOAST
    }
  };

  const handleAddPassenger = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedRes) return; setSavingPassenger(true);
    const { data, error } = await supabase.from("passengers").insert([{ reservation_id: selectedRes.id, first_name: pFirstName, last_name: pLastName, document_id: pDocument }]).select().single();
    if (!error && data) { setPassengers([...passengers, data]); setPFirstName(""); setPLastName(""); setPDocument(""); showToast("Pasajero añadido", "success"); }
    setSavingPassenger(false);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedRes) return; setSavingTask(true);
    const { data, error } = await supabase.from("tasks").insert([{ reservation_id: selectedRes.id, description: taskDesc, status: 'pendiente' }]).select().single();
    if (!error && data) { setTasks([...tasks, data]); setTaskDesc(""); showToast("Tarea añadida", "success"); }
    setSavingTask(false);
  };

  const handleToggleTask = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'pendiente' ? 'completada' : 'pendiente';
    await supabase.from("tasks").update({ status: newStatus }).eq("id", id);
    setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const handleSignContract = async () => {
    if (!selectedRes) return;
    if (!signatureName.trim()) { showToast("Escribe tu nombre para firmar.", "warning"); return; }
    setSigningContract(true);
    try {
      if (contract) {
        await supabase.from("contracts").update({ status: 'firmado', signed_at: new Date().toISOString(), signed_by: signatureName }).eq("id", contract.id);
      } else {
        const { data } = await supabase.from("contracts").insert([{ reservation_id: selectedRes.id, status: 'firmado', signed_at: new Date().toISOString(), signed_by: signatureName, version: 'v1.0' }]).select().single();
        if (data) setContract(data);
      }
      showToast("¡Contrato firmado con éxito!", "success"); // <-- TOAST
      await openDetailsModal(selectedRes);
       } catch (err) {
      showToast("Error al firmar contrato: " + (err instanceof Error ? err.message : "Desconocido"), "error");
    } finally { 
      setSigningContract(false); 
    }
  };

  const handleAddIncident = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedRes) return; setSavingIncident(true);
    const { data, error } = await supabase.from("incidents").insert([{ reservation_id: selectedRes.id, description: incidentDesc, status: 'abierta' }]).select().single();
    if (!error && data) { setIncidents([data, ...incidents]); setIncidentDesc(""); showToast("Incidencia reportada", "warning"); }
    setSavingIncident(false);
  };

  const handleResolveIncident = async (id: string) => {
    await supabase.from("incidents").update({ status: 'resuelta' }).eq("id", id);
    setIncidents(incidents.map(i => i.id === id ? { ...i, status: 'resuelta' } : i));
    showToast("Incidencia resuelta", "success"); // <-- TOAST
  };

  const handleAddTip = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedRes) return; setSavingTip(true);
    const { data, error } = await supabase.from("tips").insert([{ reservation_id: selectedRes.id, amount: Number(tipAmount), notes: tipNotes }]).select().single();
    if (!error && data) { setTips([data, ...tips]); setTipAmount(""); setTipNotes(""); showToast("Propina registrada", "success"); }
    setSavingTip(false);
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Reservas</h1>
          <p className="text-slate-400 mt-1">Controla las salidas confirmadas y pendientes.</p>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg">Error: {error}</div>}

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/50 text-slate-400 text-sm border-b border-slate-700">
              <th className="px-6 py-4 font-medium">Cliente</th>
              <th className="px-6 py-4 font-medium">Barco</th>
              <th className="px-6 py-4 font-medium">Fecha</th>
              <th className="px-6 py-4 font-medium">Total</th>
              <th className="px-6 py-4 font-medium">Estado</th>
              <th className="px-6 py-4 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Cargando...</td></tr>
            ) : reservations.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">No hay reservas registradas.</td></tr>
            ) : (
              reservations.map((r) => {
                const totalPrice = Number(r.total_price) || 0;
                const pagosDeEstaReserva = payments.filter(p => p.reservation_id === r.id && p.status === 'completado');
                const totalPaid = pagosDeEstaReserva.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
                const pending = Math.round((totalPrice - totalPaid) * 100) / 100;

                return (
                  <tr key={r.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{r.clients?.first_name} {r.clients?.last_name}</td>
                    <td className="px-6 py-4 text-slate-300">{r.boats?.name}</td>
                    <td className="px-6 py-4 text-slate-300">{r.date} <br/><span className="text-xs text-slate-500">{r.time_slot}</span></td>
                    <td className="px-6 py-4 text-slate-300 font-bold">
                      {totalPrice.toFixed(2)} €
                      <div className="text-[10px] text-slate-500 font-normal mt-1">
                        Pagado: {totalPaid.toFixed(2)} | Faltan: {pending.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        r.status === 'pagada' ? "bg-green-500/10 text-green-400 border-green-500/20" : 
                        r.status === 'confirmada' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : 
                        "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                      } uppercase`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => openDetailsModal(r)} className="text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 text-sm font-medium px-3 py-1.5 rounded-md transition-colors">
                        👁️ Ver
                      </button>
                      
                      {pending > 0.01 && totalPaid === 0 && (
                        <button onClick={() => handleChargeDeposit(r)} disabled={processingId === r.id} className="text-white bg-blue-600 hover:bg-blue-700 text-sm font-medium px-4 py-1.5 rounded-md disabled:opacity-50">
                          💳 Depósito
                        </button>
                      )}
                      
                      {pending > 0.01 && totalPaid > 0 && (
                        <button onClick={() => handleChargePending(r, pending)} disabled={processingId === r.id} className="text-white bg-green-600 hover:bg-green-700 text-sm font-medium px-4 py-1.5 rounded-md disabled:opacity-50 shadow-lg shadow-green-500/20">
                          💰 Cobrar {pending.toFixed(2)} €
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedRes && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-700">
              <div>
                <h2 className="text-xl font-bold text-white">Detalles de la Reserva</h2>
                <p className="text-sm text-slate-400">{selectedRes.date} · {selectedRes.time_slot}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                  <p className="text-sm text-slate-400 mb-1">Cliente</p>
                  <p className="font-bold text-white text-lg">{selectedRes.clients?.first_name} {selectedRes.clients?.last_name}</p>
                  <p className="text-sm text-slate-400 mt-2 mb-1">Barco</p>
                  <p className="font-medium text-blue-400">{selectedRes.boats?.name}</p>
                </div>
                <div className="bg-white p-4 rounded-lg flex flex-col items-center justify-center">
                  <Image src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=IMA-CLUB-RES-${selectedRes.id}`} alt="QR" width={128} height={128} className="w-32 h-32" />
                  <p className="text-xs text-center text-slate-800 font-bold mt-2">Check-in QR</p>
                </div>
              </div>

              <div className="md:col-span-2 flex flex-col h-full">
                <div className="flex gap-2 mb-4 border-b border-slate-700 pb-2 overflow-x-auto">
                  <button onClick={() => setActiveTab("pasajeros")} className={`px-3 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg ${activeTab === "pasajeros" ? "bg-slate-900 text-white border-b-2 border-blue-500" : "text-slate-400 hover:text-white"}`}>👥 Pasajeros</button>
                  <button onClick={() => setActiveTab("tareas")} className={`px-3 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg ${activeTab === "tareas" ? "bg-slate-900 text-white border-b-2 border-blue-500" : "text-slate-400 hover:text-white"}`}>📋 Tareas</button>
                  <button onClick={() => setActiveTab("extras")} className={`px-3 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg ${activeTab === "extras" ? "bg-slate-900 text-white border-b-2 border-blue-500" : "text-slate-400 hover:text-white"}`}>🍾 Extras</button>
                  <button onClick={() => setActiveTab("contrato")} className={`px-3 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg ${activeTab === "contrato" ? "bg-slate-900 text-white border-b-2 border-blue-500" : "text-slate-400 hover:text-white"}`}>📄 Contrato</button>
                  <button onClick={() => setActiveTab("incidencias")} className={`px-3 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg ${activeTab === "incidencias" ? "bg-slate-900 text-white border-b-2 border-blue-500" : "text-slate-400 hover:text-white"}`}>⚠️ Incidencias</button>
                  <button onClick={() => setActiveTab("propinas")} className={`px-3 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg ${activeTab === "propinas" ? "bg-slate-900 text-white border-b-2 border-blue-500" : "text-slate-400 hover:text-white"}`}>💸 Propinas</button>
                </div>

                {activeTab === "pasajeros" && (
                  <div className="flex flex-col flex-1">
                    <div className="flex-1 overflow-y-auto space-y-2 mb-4 max-h-48 pr-2">
                      {passengers.length === 0 ? <p className="text-sm text-slate-500 italic">No hay pasajeros.</p> : passengers.map(p => (
                        <div key={p.id} className="flex justify-between bg-slate-900 p-3 rounded border border-slate-700 text-sm">
                          <div><p className="text-white font-medium">{p.first_name} {p.last_name}</p><p className="text-xs text-slate-400">{p.document_id || "Sin documento"}</p></div>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={handleAddPassenger} className="bg-slate-900 p-4 rounded-lg border border-slate-700 space-y-3 mt-auto">
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" required placeholder="Nombre" value={pFirstName} onChange={e => setPFirstName(e.target.value)} className="bg-slate-800 text-white px-3 py-1.5 rounded text-sm border border-slate-600 outline-none" />
                        <input type="text" required placeholder="Apellido" value={pLastName} onChange={e => setPLastName(e.target.value)} className="bg-slate-800 text-white px-3 py-1.5 rounded text-sm border border-slate-600 outline-none" />
                      </div>
                      <input type="text" placeholder="DNI / Pasaporte" value={pDocument} onChange={e => setPDocument(e.target.value)} className="w-full bg-slate-800 text-white px-3 py-1.5 rounded text-sm border border-slate-600 outline-none" />
                      <button type="submit" disabled={savingPassenger} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 rounded text-sm disabled:opacity-50">+ Añadir Pasajero</button>
                    </form>
                  </div>
                )}

                {activeTab === "tareas" && (
                  <div className="flex flex-col flex-1">
                    <div className="flex-1 overflow-y-auto space-y-2 mb-4 max-h-48 pr-2">
                      {tasks.length === 0 ? <p className="text-sm text-slate-500 italic">No hay tareas.</p> : tasks.map(t => (
                        <div key={t.id} className="flex justify-between items-center bg-slate-900 p-3 rounded border border-slate-700 text-sm">
                          <div className="flex items-center gap-3">
                            <input type="checkbox" checked={t.status === 'completada'} onChange={() => handleToggleTask(t.id, t.status)} className="w-4 h-4 cursor-pointer" />
                            <p className={`font-medium ${t.status === 'completada' ? 'line-through text-slate-500' : 'text-white'}`}>{t.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={handleAddTask} className="bg-slate-900 p-4 rounded-lg border border-slate-700 space-y-3 mt-auto">
                      <input type="text" required placeholder="Ej: Comprar hielo" value={taskDesc} onChange={e => setTaskDesc(e.target.value)} className="w-full bg-slate-800 text-white px-3 py-1.5 rounded text-sm border border-slate-600 outline-none" />
                      <button type="submit" disabled={savingTask} className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-1.5 rounded text-sm disabled:opacity-50">+ Añadir Tarea</button>
                    </form>
                  </div>
                )}

                {activeTab === "extras" && (
                  <div className="flex flex-col flex-1">
                    <div className="flex-1 overflow-y-auto space-y-2 mb-4 max-h-48 pr-2">
                      <p className="text-sm font-bold text-slate-300 mb-2">Extras en esta reserva:</p>
                      {selectedExtras.length === 0 ? <p className="text-sm text-slate-500 italic">No hay extras añadidos.</p> : selectedExtras.map(se => (
                        <div key={se.id} className="flex justify-between items-center bg-slate-900 p-3 rounded border border-slate-700 text-sm">
                          <p className="text-white font-medium">{se.extras?.name} <span className="text-green-400">({se.total_price} €)</span></p>
                          <button onClick={() => handleRemoveExtraFromRes(se.id, se.total_price)} className="text-red-400 text-xs">Quitar</button>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 mt-auto">
                      <p className="text-sm font-bold text-slate-300 mb-2">Añadir extra:</p>
                      <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto pr-2">
                        {catalogExtras.map(ce => (
                          <div key={ce.id} className="flex justify-between items-center bg-slate-800 p-2 rounded border border-slate-600 text-sm">
                            <span className="text-white">{ce.name} - {ce.price} €</span>
                            <button onClick={() => handleAddExtraToRes(ce)} disabled={savingExtra} className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-500 disabled:opacity-50">+ Añadir</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "contrato" && (
                  <div className="flex flex-col flex-1">
                    {contract?.status === 'firmado' ? (
                      <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg mb-4 text-center">
                        <p className="text-green-400 font-bold text-lg mb-1">✅ Contrato Firmado</p>
                        <p className="text-sm text-slate-300">Por: <strong>{contract.signed_by}</strong> el {new Date(contract.signed_at!).toLocaleDateString()}</p>
                      </div>
                    ) : (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg mb-4 text-center">
                        <p className="text-yellow-400 font-bold">⏳ Pendiente de Firma</p>
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
                      <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 mt-auto">
                        <input type="text" value={signatureName} onChange={(e) => setSignatureName(e.target.value)} placeholder="Escribe tu nombre completo" className="w-full bg-slate-800 text-white px-3 py-2 rounded text-sm border border-slate-600 outline-none mb-3 focus:border-blue-500" />
                        <button onClick={handleSignContract} disabled={signingContract} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded transition-colors disabled:opacity-50">
                          {signingContract ? "Firmando..." : "✍️ Firmar Contrato"}
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => window.print()} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded transition-colors mt-auto">
                        🖨️ Imprimir / Guardar PDF
                      </button>
                    )}
                  </div>
                )}

                {activeTab === "incidencias" && (
                  <div className="flex flex-col flex-1">
                    <div className="flex-1 overflow-y-auto space-y-2 mb-4 max-h-48 pr-2">
                      {incidents.length === 0 ? <p className="text-sm text-slate-500 italic">No hay incidencias reportadas.</p> : incidents.map(i => (
                        <div key={i.id} className={`p-3 rounded border text-sm flex justify-between items-center ${i.status === 'resuelta' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                          <div>
                            <p className={`font-medium ${i.status === 'resuelta' ? 'text-slate-400 line-through' : 'text-white'}`}>{i.description}</p>
                            <span className="text-xs font-bold uppercase tracking-wider opacity-70">{i.status}</span>
                          </div>
                          {i.status !== 'resuelta' && (
                            <button onClick={() => handleResolveIncident(i.id)} className="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">
                              ✓ Resolver
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <form onSubmit={handleAddIncident} className="bg-slate-900 p-4 rounded-lg border border-slate-700 space-y-3 mt-auto">
                      <input type="text" required placeholder="Ej: Falta una toalla..." value={incidentDesc} onChange={e => setIncidentDesc(e.target.value)} className="w-full bg-slate-800 text-white px-3 py-1.5 rounded text-sm border border-slate-600 outline-none" />
                      <button type="submit" disabled={savingIncident} className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-1.5 rounded text-sm disabled:opacity-50">⚠️ Reportar Incidencia</button>
                    </form>
                  </div>
                )}

                {activeTab === "propinas" && (
                  <div className="flex flex-col flex-1">
                    <div className="flex-1 overflow-y-auto space-y-2 mb-4 max-h-48 pr-2">
                      {tips.length === 0 ? <p className="text-sm text-slate-500 italic">No hay propinas registradas.</p> : tips.map(t => (
                        <div key={t.id} className="p-3 rounded border border-green-500/30 bg-green-500/10 flex justify-between items-center text-sm">
                          <p className="text-white font-medium">{t.notes || "Propina general"}</p>
                          <p className="text-green-400 font-bold text-lg">{Number(t.amount).toFixed(2)} €</p>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={handleAddTip} className="bg-slate-900 p-4 rounded-lg border border-slate-700 space-y-3 mt-auto">
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" required min="0" step="0.01" placeholder="Importe (€)" value={tipAmount} onChange={e => setTipAmount(e.target.value)} className="bg-slate-800 text-white px-3 py-1.5 rounded text-sm border border-slate-600 outline-none" />
                        <input type="text" placeholder="Nota (opcional)" value={tipNotes} onChange={e => setTipNotes(e.target.value)} className="bg-slate-800 text-white px-3 py-1.5 rounded text-sm border border-slate-600 outline-none" />
                      </div>
                      <button type="submit" disabled={savingTip} className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-1.5 rounded text-sm disabled:opacity-50">💸 Registrar Propina</button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}