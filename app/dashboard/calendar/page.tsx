"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/utils/client";

const TIME_SLOTS = [
  "10:00-13:30 (Morning)",
  "14:00-17:30 (Afternoon)",
  "18:00-21:30 (Sunset)",
  "14:00-21:00 (Full Day Tarde)",
  "10:00-17:00 (Full Day Mañana)",
];

type Boat = { id: string; name: string; };
type SlotStatus = { id: string; time_slot: string; status: string; };

export default function CalendarPage() {
  const [boats, setBoats] = useState<Boat[]>([]);
  const [selectedBoat, setSelectedBoat] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [dbSlots, setDbSlots] = useState<SlotStatus[]>([]);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const fetchBoats = useCallback(async () => {
    const { data } = await supabase.from("boats").select("id, name").order("name");
    if (data && data.length > 0) {
      setBoats(data);
      setSelectedBoat((prev) => prev || data[0].id);
    }
  }, [supabase]);

  const fetchAvailability = useCallback(async () => {
    if (!selectedBoat || !selectedDate) return;
    
    const { data, error } = await supabase
      .from("availability")
      .select("*")
      .eq("boat_id", selectedBoat)
      .eq("date", selectedDate);

    if (error) setError(error.message);
    else setDbSlots(data || []);
  }, [supabase, selectedBoat, selectedDate]);

  useEffect(() => {
    const loadBoats = async () => { await fetchBoats(); };
    loadBoats();
  }, [fetchBoats]);

  useEffect(() => {
    const loadAvailability = async () => { await fetchAvailability(); };
    loadAvailability();
  }, [fetchAvailability]);

  const toggleSlot = async (slotName: string) => {
    const existingSlot = dbSlots.find((s) => s.time_slot === slotName);

    if (existingSlot) {
      const { error } = await supabase.from("availability").delete().eq("id", existingSlot.id);
      if (!error) setDbSlots(dbSlots.filter((s) => s.id !== existingSlot.id));
    } else {
      const { data, error } = await supabase
        .from("availability")
        .insert([{ boat_id: selectedBoat, date: selectedDate, time_slot: slotName, status: "tbc" }])
        .select().single();

      if (!error && data) setDbSlots([...dbSlots, data]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Calendario de Disponibilidad</h1>
        <p className="text-slate-400 mt-1">Gestiona los horarios y evita dobles reservas.</p>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg">Error: {error}</div>}

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <label className="block text-sm text-slate-300 mb-2">Seleccionar Barco</label>
          <select value={selectedBoat} onChange={(e) => setSelectedBoat(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-3 rounded-lg border border-slate-700 focus:outline-none focus:border-blue-500">
            {boats.length === 0 && <option value="">No hay barcos...</option>}
            {boats.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm text-slate-300 mb-2">Seleccionar Fecha</label>
          <input type="date" value={selectedDate} min={new Date().toISOString().split("T")[0]} onChange={(e) => setSelectedDate(e.target.value)} className="w-full bg-slate-900 text-white px-4 py-3 rounded-lg border border-slate-700 focus:outline-none focus:border-blue-500" />
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">Horarios del día</h2>
        {!selectedBoat ? (
          <p className="text-slate-400">Selecciona un barco.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TIME_SLOTS.map((slot) => {
              const isBlocked = dbSlots.find((s) => s.time_slot === slot);
              return (
                <div key={slot} onClick={() => toggleSlot(slot)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${isBlocked ? "bg-red-500/10 border-red-500/50 text-red-400" : "bg-green-500/10 border-green-500/50 text-green-400 hover:bg-green-500/20"}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold">{slot}</span>
                    <span className="text-sm font-medium">{isBlocked ? "Ocupado / TBC" : "Disponible"}</span>
                  </div>
                  <p className="text-xs mt-2 opacity-70">{isBlocked ? "Haz clic para liberar" : "Haz clic para bloquear (TBC)"}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}