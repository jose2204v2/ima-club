"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/client";
import { showToast } from "@/utils/toast";

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

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const fetchPayments = async () => {
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
      showToast("Error al cargar pagos: " + error.message, "error");
    } else {
      setPayments(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    const load = async () => { if (active) await fetchPayments(); };
    const timer = setTimeout(load, 0);
    return () => { active = false; clearTimeout(timer); };
  }, []);

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Registro de Pagos</h1>
          <p className="text-slate-400 mt-1">Historial de ingresos, depósitos y saldos.</p>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg">Error: {error}</div>}

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {/* SCROLL HORIZONTAL PARA MOVIL */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-sm border-b border-slate-700">
                <th className="px-6 py-4 font-medium">Fecha</th>
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium">Concepto</th>
                <th className="px-6 py-4 font-medium">Método</th>
                <th className="px-6 py-4 font-medium">Importe</th>
                <th className="px-6 py-4 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Cargando pagos...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">No hay pagos registrados.</td></tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4 text-slate-300">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-medium text-white">
                      {p.reservations?.clients?.first_name} {p.reservations?.clients?.last_name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize text-slate-300">{p.type.replace('_', ' ')}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 uppercase text-xs font-bold">{p.method}</td>
                    <td className="px-6 py-4 text-green-400 font-bold">{p.amount.toFixed(2)} €</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-green-500/10 text-green-400 border-green-500/20 uppercase">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}