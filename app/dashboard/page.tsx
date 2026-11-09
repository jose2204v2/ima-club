"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/client";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { 
  TrendingUp, CalendarCheck, Ship, CheckCircle2, 
  ArrowRight, Anchor 
} from "lucide-react";

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      if (!active) return;
      setUser(session.user);

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

  if (loading) return <div className="text-white p-8 flex items-center justify-center">Cargando panel de control...</div>;

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-6">
      
      {/* CABECERA CRISTAL */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 backdrop-blur-2xl p-6 md:p-8 rounded-2xl border border-white/10 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-white tracking-tight">
            ¡Hola, {user?.user_metadata?.first_name || user?.email}! 👋
          </h1>
          <p className="text-sm md:text-base text-slate-300">Aquí tienes el resumen de IMA Club hoy.</p>
        </div>
        <div className="text-left md:text-right relative z-10 bg-white/5 px-5 py-3 rounded-xl border border-white/10">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Rol activo</p>
          <p className="text-sm font-bold uppercase text-blue-400">{user?.user_metadata?.role || 'Agencia'}</p>
        </div>
      </motion.div>

      {/* TARJETAS KPI CRISTAL */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"
      >
        <motion.div variants={item} className="bg-white/5 backdrop-blur-xl p-5 md:p-6 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden group hover:bg-white/10 transition-colors">
          <div className="absolute right-0 top-0 opacity-5 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform text-green-400"><TrendingUp size={100} /></div>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-green-500/20 rounded-lg text-green-400"><TrendingUp size={18} /></div>
            <p className="text-slate-300 text-xs md:text-sm font-medium">Ingresos Totales</p>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white relative z-10">{totalRevenue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</p>
        </motion.div>
        
        <motion.div variants={item} className="bg-white/5 backdrop-blur-xl p-5 md:p-6 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden group hover:bg-white/10 transition-colors">
          <div className="absolute right-0 top-0 opacity-5 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform text-blue-400"><CalendarCheck size={100} /></div>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><CalendarCheck size={18} /></div>
            <p className="text-slate-300 text-xs md:text-sm font-medium">Reservas Activas</p>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white relative z-10">{activeReservations}</p>
        </motion.div>

        <motion.div variants={item} className="bg-white/5 backdrop-blur-xl p-5 md:p-6 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden group hover:bg-white/10 transition-colors">
          <div className="absolute right-0 top-0 opacity-5 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform text-yellow-400"><Ship size={100} /></div>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400"><Ship size={18} /></div>
            <p className="text-slate-300 text-xs md:text-sm font-medium">Barcos Activos</p>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white relative z-10">{activeBoats}</p>
        </motion.div>

        <motion.div variants={item} className="bg-white/5 backdrop-blur-xl p-5 md:p-6 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden group hover:bg-white/10 transition-colors">
          <div className="absolute right-0 top-0 opacity-5 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform text-red-400"><CheckCircle2 size={100} /></div>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-red-500/20 rounded-lg text-red-400"><CheckCircle2 size={18} /></div>
            <p className="text-slate-300 text-xs md:text-sm font-medium">Tareas Pendientes</p>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white relative z-10">{pendingTasks}</p>
        </motion.div>
      </motion.div>

      {/* TABLA PRÓXIMAS SALIDAS CRISTAL */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white/5 backdrop-blur-2xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
      >
        <div className="p-5 md:p-6 border-b border-white/10 flex justify-between items-center">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">Próximas Salidas</h3>
            <p className="text-slate-400 text-xs md:text-sm mt-1">Reservas programadas en el calendario.</p>
          </div>
          <button onClick={() => router.push('/dashboard/reservations')} className="text-xs md:text-sm bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-1">
            Ver todas <ArrowRight size={16} />
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-white/5 text-slate-300 text-xs md:text-sm">
                <th className="px-5 md:px-6 py-4 font-medium">Fecha</th>
                <th className="px-5 md:px-6 py-4 font-medium">Cliente</th>
                <th className="px-5 md:px-6 py-4 font-medium">Barco</th>
                <th className="px-5 md:px-6 py-4 font-medium">Horario</th>
                <th className="px-5 md:px-6 py-4 font-medium text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {upcomingTrips.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-sm">No hay salidas próximas.</td></tr>
              ) : (
                upcomingTrips.map((r) => (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 md:px-6 py-4 font-bold text-white text-sm">{r.date}</td>
                    <td className="px-5 md:px-6 py-4 text-slate-200 text-sm">{r.clients?.first_name} {r.clients?.last_name}</td>
                    <td className="px-5 md:px-6 py-4 text-slate-300 text-sm flex items-center gap-2">
                      <Anchor size={14} className="text-blue-400" /> {r.boats?.name}
                    </td>
                    <td className="px-5 md:px-6 py-4 text-slate-400 text-xs md:text-sm">{r.time_slot}</td>
                    <td className="px-5 md:px-6 py-4 text-right">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold border ${
                        r.status === 'pagada' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                        r.status === 'confirmada' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : 
                        "bg-amber-500/10 text-amber-400 border-amber-500/20"
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
      </motion.div>
    </div>
  );
}