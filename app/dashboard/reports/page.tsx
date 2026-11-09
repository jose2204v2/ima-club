"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/client";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, PiggyBank, Anchor } from "lucide-react";

type BoatStat = { name: string; revenue: number };
type PaymentData = { amount: number | string };
type ReservationData = {
  id: string;
  total_price: number | string;
  boat_id: string;
  boats: { name: string }[] | null; 
};

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [boatStats, setBoatStats] = useState<BoatStat[]>([]);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let active = true;
    const loadReports = async () => {
      const { data: payments } = await supabase
        .from("payments").select("amount").eq("status", "completado").returns<PaymentData[]>();

      const { data: reservations } = await supabase
        .from("reservations").select(`id, total_price, boat_id, boats (name)`).returns<ReservationData[]>();

      if (!active) return;

      if (payments && reservations) {
        const revenue = payments.reduce((acc, curr) => acc + Number(curr.amount), 0);
        setTotalRevenue(revenue);
        setTotalCost(revenue * 0.60);

        const boatsMap: Record<string, BoatStat> = {};
        reservations.forEach((r) => {
          const boatName = r.boats?.[0]?.name;
          const boatId = r.boat_id;
          if (boatName && boatId) {
            if (!boatsMap[boatId]) boatsMap[boatId] = { name: boatName, revenue: 0 };
            boatsMap[boatId].revenue += Number(r.total_price);
          }
        });

        const sortedBoats = Object.values(boatsMap).sort((a, b) => b.revenue - a.revenue);
        setBoatStats(sortedBoats);
      }
      setLoading(false);
    };

    loadReports();
    return () => { active = false; };
  }, [supabase]);

  const margin = totalRevenue - totalCost;
  const marginPercent = totalRevenue > 0 ? (margin / totalRevenue) * 100 : 0;

  if (loading) return <div className="text-white p-8">Calculando métricas...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Reportes y Finanzas</h1>
        <p className="text-slate-400 mt-1">Rentabilidad global de IMA Club.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 backdrop-blur-xl p-5 md:p-6 rounded-2xl border border-white/10 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"><TrendingUp size={18} /></div>
            <p className="text-slate-300 text-xs md:text-sm font-medium">Ingresos Brutos</p>
          </div>
          <p className="text-2xl md:text-4xl font-bold text-white">
            {totalRevenue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/5 backdrop-blur-xl p-5 md:p-6 rounded-2xl border border-white/10 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-red-500/20 rounded-lg text-red-400"><TrendingDown size={18} /></div>
            <p className="text-slate-300 text-xs md:text-sm font-medium">Costes Estimados (60%)</p>
          </div>
          <p className="text-2xl md:text-4xl font-bold text-white">
            {totalCost.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/5 backdrop-blur-xl p-5 md:p-6 rounded-2xl border border-white/10 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><PiggyBank size={18} /></div>
            <p className="text-slate-300 text-xs md:text-sm font-medium">Margen Neto</p>
          </div>
          <p className="text-2xl md:text-4xl font-bold text-white">
            {margin.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
          </p>
          <p className="text-xs md:text-sm text-blue-400 mt-2">Rentabilidad del {marginPercent.toFixed(1)}%</p>
        </motion.div>
      </div>

      {/* Gráfico de Barras Animado */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-white/5 backdrop-blur-xl p-5 md:p-6 rounded-2xl border border-white/10 w-full max-w-4xl shadow-2xl mt-6"
      >
        <h3 className="text-lg md:text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Anchor className="text-blue-400" /> Top Barcos por Ingresos
        </h3>
        
        {boatStats.length === 0 ? (
          <p className="text-slate-400 text-sm">Aún no hay reservas para calcular el ranking.</p>
        ) : (
          <div className="space-y-5">
            {boatStats.map((boat, index) => {
              const maxRevenue = boatStats[0].revenue;
              const width = maxRevenue > 0 ? (boat.revenue / maxRevenue) * 100 : 0;
              
              return (
                <div key={index}>
                  <div className="flex justify-between text-xs md:text-sm mb-1.5">
                    <span className="text-slate-200 font-medium">{boat.name}</span>
                    <span className="text-slate-400 font-mono">{boat.revenue.toLocaleString('es-ES')} €</span>
                  </div>
                  <div className="w-full bg-[#0f172a] rounded-full h-2.5 md:h-3 border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${width}%` }}
                      transition={{ duration: 1, delay: 0.4 + (index * 0.1), ease: "easeOut" }}
                      className="bg-gradient-to-r from-blue-600 to-indigo-400 h-2.5 md:h-3 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}