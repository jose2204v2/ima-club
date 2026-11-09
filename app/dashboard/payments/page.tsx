"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/utils/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Banknote, TrendingUp, Calendar, User, Hash, CheckCircle2 } from "lucide-react";

type Payment = {
  id: string;
  amount: number;
  method: string;
  type: string;
  status: string;
  created_at: string;
  reservations: {
    total_price: number;
    clients: { first_name: string; last_name: string } | null;
  } | null;
};

// VARIANTES PARA LA ANIMACIÓN EN CASCADA
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const item = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 }
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const fetchPayments = useCallback(async () => {
    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        reservations (
          total_price,
          clients (first_name, last_name)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      toast.error("Error al cargar pagos: " + error.message);
    } else {
      setPayments(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let active = true;
    const load = async () => { if (active) await fetchPayments(); };
    const timer = setTimeout(load, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [fetchPayments]);

  const totalCollected = payments.filter(p => p.status === 'completado').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalTransactions = payments.filter(p => p.status === 'completado').length;

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Registro de Pagos</h1>
          <p className="text-slate-400 mt-1">Historial de ingresos, depósitos y saldos.</p>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg">Error: {error}</div>}

      {/* TARJETAS DE RESUMEN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl p-5 md:p-6 rounded-2xl border border-white/10 shadow-lg flex items-center gap-4"
        >
          <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
            <TrendingUp size={28} />
          </div>
          <div>
            <p className="text-slate-400 text-xs md:text-sm font-medium mb-1">Total Cobrado</p>
            <p className="text-2xl md:text-3xl font-bold text-white">
              {totalCollected.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur-xl p-5 md:p-6 rounded-2xl border border-white/10 shadow-lg flex items-center gap-4"
        >
          <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
            <Hash size={28} />
          </div>
          <div>
            <p className="text-slate-400 text-xs md:text-sm font-medium mb-1">Transacciones Completadas</p>
            <p className="text-2xl md:text-3xl font-bold text-white">{totalTransactions}</p>
          </div>
        </motion.div>
      </div>

      {/* TABLA DE PAGOS */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-white/5 text-slate-300 text-sm border-b border-white/10">
                <th className="px-6 py-4 font-medium">Fecha</th>
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium">Concepto</th>
                <th className="px-6 py-4 font-medium">Método</th>
                <th className="px-6 py-4 font-medium">Importe</th>
                <th className="px-6 py-4 font-medium">Estado</th>
              </tr>
            </thead>
            {/* APLICAMOS LA ANIMACIÓN AL TBODY */}
            <motion.tbody 
              variants={container} 
              initial="hidden" 
              animate="show" 
              className="divide-y divide-white/5"
            >
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Cargando pagos...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">No hay pagos registrados.</td></tr>
              ) : (
                <AnimatePresence>
                  {payments.map((p) => (
                    <motion.tr 
                      key={p.id} 
                      variants={item}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4 text-slate-300 flex items-center gap-2 text-sm">
                        <Calendar size={14} className="text-slate-500" />
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-medium text-white flex items-center gap-2 text-sm">
                        <User size={14} className="text-blue-400" />
                        {p.reservations?.clients?.first_name} {p.reservations?.clients?.last_name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize text-slate-300 text-sm flex items-center gap-2">
                          {p.type.includes('deposito') ? <Banknote size={14} className="text-amber-400" /> : <CreditCard size={14} className="text-emerald-400" />}
                          {p.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 uppercase text-xs font-bold tracking-wider">{p.method}</td>
                      <td className="px-6 py-4 text-emerald-400 font-bold text-base">{Number(p.amount).toFixed(2)} €</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase">
                          <CheckCircle2 size={12} /> {p.status}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </motion.tbody>
          </table>
        </div>
      </div>
    </div>
  );
}