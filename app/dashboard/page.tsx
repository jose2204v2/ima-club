"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/client";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";

type Reservation = {
  id: string;
  date: string;
  time_slot: string;
  total_price: number;
  status: string;
  clients: { first_name: string; last_name: string } | null;
  boats: { name: string } | null;
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados para KPIs
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [activeReservations, setActiveReservations] = useState(0);
  const [activeBoats, setActiveBoats] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [upcomingTrips, setUpcomingTrips] = useState<Reservation[]>([]);

  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let active = true;
    const loadDashboardData = async () => {
      // 1. Sesión
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      if (!active) return;
      setUser(session.user);

      // 2. Datos en paralelo
      const [
        { data: payments },
        { data: reservations },
        { data: boats },
        { data: tasks }
      ] = await Promise.all([
        supabase.from("payments").select("amount").eq("status", "completado"),
        supabase.from("reservations").select(`*, clients (first_name, last_name), boats (name)`).neq("status", "cancelada").order("date", { ascending: true }),
        supabase.from("boats").select("id").eq("is_active", true),
        supabase.from("tasks").select("id").eq("status", "pendiente")
      ]);

      if (!active) return;

      // Cálculos
      const revenue = payments?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      setTotalRevenue(revenue);
      setActiveReservations(reservations?.length || 0);
      setActiveBoats(boats?.length || 0);
      setPendingTasks(tasks?.length || 0);

      if (reservations) {
        const today = new Date().toISOString().split("T")[0];
        const upcoming = reservations.filter(r => r.date >= today).slice(0, 5);
        setUpcomingTrips(upcoming);
      }
      setLoading(false);
    };

    loadDashboardData();
    return () => { active = false; };
  }, [router, supabase]);

  if (loading) return <div className="text-white p-8">Cargando panel de control...</div>;

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-lg flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white">
            ¡Hola, {user?.user_metadata?.first_name || user?.email}! 👋
          </h1>
          <p className="text-slate-400">Aquí tienes el resumen de IMA Club hoy.</p>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-slate-400 text-sm mb-1">Rol activo</p>
          <p className="text-xl font-bold uppercase text-blue-400">{user?.user_metadata?.role || 'Agencia'}</p>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 border-l-4 border-l-green-500">
          <p className="text-slate-400 text-sm font-medium mb-1">Ingresos Totales</p>
          <p className="text-3xl font-bold text-white">{totalRevenue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 border-l-4 border-l-blue-500">
          <p className="text-slate-400 text-sm font-medium mb-1">Reservas Activas</p>
          <p className="text-3xl font-bold text-white">{activeReservations}</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 border-l-4 border-l-yellow-500">
          <p className="text-slate-400 text-sm font-medium mb-1">Barcos Activos</p>
          <p className="text-3xl font-bold text-white">{activeBoats}</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 border-l-4 border-l-red-500">
          <p className="text-slate-400 text-sm font-medium mb-1">Tareas Pendientes</p>
          <p className="text-3xl font-bold text-white">{pendingTasks}</p>
        </div>
      </div>

      {/* Tabla Próximas Salidas */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-white">Próximas Salidas</h3>
            <p className="text-slate-400 text-sm mt-1">Reservas programadas en el calendario.</p>
          </div>
          <button onClick={() => router.push('/dashboard/reservations')} className="text-sm bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors">
            Ver todas
          </button>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/50 text-slate-400 text-sm">
              <th className="px-6 py-4 font-medium">Fecha</th>
              <th className="px-6 py-4 font-medium">Cliente</th>
              <th className="px-6 py-4 font-medium">Barco</th>
              <th className="px-6 py-4 font-medium">Horario</th>
              <th className="px-6 py-4 font-medium text-right">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {upcomingTrips.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No hay salidas próximas.</td></tr>
            ) : (
              upcomingTrips.map((r) => (
                <tr key={r.id} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-4 font-bold text-white">{r.date}</td>
                  <td className="px-6 py-4 text-slate-300">{r.clients?.first_name} {r.clients?.last_name}</td>
                  <td className="px-6 py-4 text-slate-300">{r.boats?.name}</td>
                  <td className="px-6 py-4 text-slate-400 text-sm">{r.time_slot}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      r.status === 'pagada' ? "bg-green-500/10 text-green-400 border-green-500/20" : 
                      r.status === 'confirmada' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : 
                      "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                    } uppercase`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}