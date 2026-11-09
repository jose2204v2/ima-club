"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/client";
import { toast } from "sonner";
import { Plus, Trash2, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Boat = { id: string; name: string; };
type Season = { id: string; name: string; };
type Rate = {
  id: string;
  boat_id: string;
  season_id: string;
  duration_hours: number;
  price: number;
  discount_pct: number;
  boats: { name: string } | null;
  seasons: { name: string } | null;
};

export default function RatesPage() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [boats, setBoats] = useState<Boat[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBoat, setSelectedBoat] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("");
  const [duration, setDuration] = useState("3.5");
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("0");
  const [saving, setSaving] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const fetchData = async () => {
    const [ratesRes, boatsRes, seasonsRes] = await Promise.all([
      supabase.from("rates").select(`*, boats (name), seasons (name)`).order("created_at", { ascending: false }),
      supabase.from("boats").select("id, name").eq("is_active", true),
      supabase.from("seasons").select("id, name")
    ]);

    if (ratesRes.data) setRates(ratesRes.data);
    if (boatsRes.data) setBoats(boatsRes.data);
    if (seasonsRes.data) setSeasons(seasonsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    const load = async () => { if (active) await fetchData(); };
    setTimeout(load, 0);
    return () => { active = false; };
  }, []);

  const handleAddRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from("rates").upsert([{
      boat_id: selectedBoat,
      season_id: selectedSeason,
      duration_hours: Number(duration),
      price: Number(price),
      discount_pct: Number(discount)
    }], { onConflict: 'boat_id, season_id, duration_hours' });

    if (error) {
      toast.error("Error: " + error.message);
    } else {
      setIsModalOpen(false);
      setPrice(""); setDiscount("0");
      await fetchData();
      toast.success("Tarifa guardada correctamente");
    }
    setSaving(false);
  };

  const handleDeleteRate = async (id: string) => {
    if (!window.confirm("¿Eliminar esta tarifa?")) return;
    const { error } = await supabase.from("rates").delete().eq("id", id);
    if (!error) {
      await fetchData();
      toast.success("Tarifa eliminada");
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Tarifas y Temporadas</h1>
          <p className="text-slate-400 mt-1">Configura precios base y descuentos por barco y temporada.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-[0_0_15px_rgba(59,130,246,0.15)] w-full sm:w-auto flex items-center justify-center gap-2">
          <Plus size={18} />
          Nueva Tarifa
        </button>
      </div>

      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-white/5 text-slate-300 text-sm border-b border-white/10">
                <th className="px-6 py-4 font-medium">Barco</th>
                <th className="px-6 py-4 font-medium">Temporada</th>
                <th className="px-6 py-4 font-medium">Duración</th>
                <th className="px-6 py-4 font-medium">Precio Base</th>
                <th className="px-6 py-4 font-medium">Descuento</th>
                <th className="px-6 py-4 font-medium">Precio Final</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Cargando tarifas...</td></tr>
              ) : rates.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">No hay tarifas configuradas.</td></tr>
              ) : (
                <AnimatePresence>
                  {rates.map((rate) => {
                    const finalPrice = rate.price - (rate.price * (rate.discount_pct / 100));
                    return (
                      <motion.tr 
                        key={rate.id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="hover:bg-white/5 transition-colors group"
                      >
                        <td className="px-6 py-4 font-medium text-white">{rate.boats?.name}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border ${
                            rate.seasons?.name === 'Alta' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                            rate.seasons?.name === 'Media' ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                            "bg-green-500/10 text-green-400 border-green-500/20"
                          }`}>
                            <Tag size={12} /> {rate.seasons?.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-300">{rate.duration_hours}h</td>
                        <td className="px-6 py-4 text-slate-400 line-through">{rate.price} €</td>
                        <td className="px-6 py-4 text-orange-400 font-medium">{rate.discount_pct}%</td>
                        <td className="px-6 py-4 text-emerald-400 font-bold text-lg">{finalPrice.toFixed(2)} €</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleDeleteRate(rate.id)} className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-md transition-colors opacity-0 group-hover:opacity-100">
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

      {/* MODAL NUEVA TARIFA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#1e293b]/90 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-white/10 shrink-0">
              <h2 className="text-xl font-bold text-white">Nueva Tarifa</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">&times;</button>
            </div>
            <form onSubmit={handleAddRate} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Barco</label>
                <select required value={selectedBoat} onChange={(e) => setSelectedBoat(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 transition-colors">
                  <option value="">Selecciona un barco...</option>
                  {boats.map(b => <option key={b.id} value={b.id} className="bg-slate-800">{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Temporada</label>
                <select required value={selectedSeason} onChange={(e) => setSelectedSeason(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 transition-colors">
                  <option value="">Selecciona temporada...</option>
                  {seasons.map(s => <option key={s.id} value={s.id} className="bg-slate-800">{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Duración</label>
                  <select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 transition-colors">
                    <option value="3.5" className="bg-slate-800">3.5 Horas</option>
                    <option value="7" className="bg-slate-800">7 Horas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Precio Base (€)</label>
                  <input type="number" required min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Descuento (%)</label>
                <input type="number" min="0" max="100" step="0.1" value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-full bg-white/5 text-white px-4 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div className="pt-4 flex flex-col sm:flex-row gap-3 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium py-2.5 rounded-lg transition-colors order-2 sm:order-1">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg transition-all disabled:opacity-50 order-1 sm:order-2">
                  {saving ? "Guardando..." : "Guardar Tarifa"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}