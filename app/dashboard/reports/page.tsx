"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/client";

type BoatStat = { name: string; revenue: number };

// 1. Definimos los tipos exactos de lo que devuelve Supabase
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
        .from("payments")
        .select("amount")
        .eq("status", "completado")
        .returns<PaymentData[]>();

      const { data: reservations } = await supabase
        .from("reservations")
        .select(`id, total_price, boat_id, boats (name)`)
        .returns<ReservationData[]>();

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
            if (!boatsMap[boatId]) {
              boatsMap[boatId] = { name: boatName, revenue: 0 };
            }
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
        <h1 className="text-2xl md:text-3xl font-bold text-white">Reportes y Finanzas</h1>
        <p className="text-slate-400 mt-1 text-sm md:text-base">Rentabilidad global de IMA Club.</p>
      </div>

      {/* Tarjetas Financieras (Ajustadas para móvil) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-slate-800 p-5 md:p-6 rounded-xl border border-slate-700">
          <p className="text-slate-400 text-xs md:text-sm font-medium mb-1">Ingresos Brutos</p>
          <p className="text-2xl md:text-4xl font-bold text-green-400">
            {totalRevenue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
          </p>
        </div>
        <div className="bg-slate-800 p-5 md:p-6 rounded-xl border border-slate-700">
          <p className="text-slate-400 text-xs md:text-sm font-medium mb-1">Costes Estimados (60%)</p>
          <p className="text-2xl md:text-4xl font-bold text-red-400">
            {totalCost.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
          </p>
        </div>
        <div className="bg-slate-800 p-5 md:p-6 rounded-xl border border-slate-700 border-l-4 border-l-blue-500">
          <p className="text-slate-400 text-xs md:text-sm font-medium mb-1">Margen Neto</p>
          <p className="text-2xl md:text-4xl font-bold text-white">
            {margin.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
          </p>
          <p className="text-xs md:text-sm text-blue-400 mt-2">Rentabilidad del {marginPercent.toFixed(1)}%</p>
        </div>
      </div>

      {/* Gráfico: Ingresos por Barco */}
      <div className="bg-slate-800 p-5 md:p-6 rounded-xl border border-slate-700 w-full max-w-3xl">
        <h3 className="text-lg md:text-xl font-bold text-white mb-6">⛵ Top Barcos por Ingresos</h3>
        
        {boatStats.length === 0 ? (
          <p className="text-slate-400 text-sm">Aún no hay reservas para calcular el ranking.</p>
        ) : (
          <div className="space-y-4 md:space-y-5">
            {boatStats.map((boat, index) => {
              const maxRevenue = boatStats[0].revenue;
              const width = maxRevenue > 0 ? (boat.revenue / maxRevenue) * 100 : 0;
              
              return (
                <div key={index}>
                  <div className="flex justify-between text-xs md:text-sm mb-1">
                    <span className="text-slate-300 font-medium">{boat.name}</span>
                    <span className="text-slate-400">{boat.revenue.toLocaleString('es-ES')} €</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 md:h-3">
                    <div 
                      className="bg-blue-500 h-2 md:h-3 rounded-full transition-all duration-500" 
                      style={{ width: `${width}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}