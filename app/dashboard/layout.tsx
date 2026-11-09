"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/client";
import { useRouter } from "next/navigation";
import { useMemo, useEffect, useState, useRef } from "react";
import { Toaster } from "sonner";
import TutorialModal from "./TutorialModal";
import {
  LayoutDashboard, Target, Ship, Calendar, Users, FileText,
  CheckSquare, CreditCard, Gift, Camera, BarChart, Settings,
  Bell, LogOut, Menu, X, Anchor
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Notification = {
  id: string;
  type: string;
  content: string;
  is_read: boolean;
  created_at: string;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setNotifications(data);
    };

    fetchNotifications();

    const channel = supabase
      .channel('notificaciones-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        setNotifications((prev) => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const navItems = [
    { name: "Inicio", path: "/dashboard", icon: LayoutDashboard },
    { name: "Leads (CRM)", path: "/dashboard/leads", icon: Target },
    { name: "Barcos", path: "/dashboard/boats", icon: Ship },
    { name: "Calendario", path: "/dashboard/calendar", icon: Calendar },
    { name: "Clientes", path: "/dashboard/clients", icon: Users },
    { name: "Propuestas", path: "/dashboard/proposals", icon: FileText },
    { name: "Reservas", path: "/dashboard/reservations", icon: CheckSquare },
    { name: "Pagos", path: "/dashboard/payments", icon: CreditCard },
    { name: "Extras", path: "/dashboard/extras", icon: Gift },
    { name: "Marketing", path: "/dashboard/marketing", icon: Camera },
    { name: "Reportes", path: "/dashboard/reports", icon: BarChart },
    { name: "Configuración", path: "/dashboard/config", icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-900 text-white font-sans overflow-hidden selection:bg-blue-500/30">
      
      <Toaster theme="dark" position="bottom-right" richColors />
      
      {/* FONDO OSCURO PARA EL MENÚ MÓVIL */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR (Menú Lateral) */}
      <aside className={`fixed md:static inset-y-0 left-0 w-64 bg-slate-950 flex flex-col border-r border-slate-800/50 shrink-0 z-50 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Anchor size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight">IMA Club</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Plataforma SaaS</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-3 mt-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? "bg-blue-600/10 text-blue-400 font-semibold" 
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 font-medium"
                }`}
              >
                {isActive && (
                  <motion.div layoutId="active-nav" className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full" />
                )}
                <Icon size={18} className={`transition-colors ${isActive ? "text-blue-500" : "text-slate-500 group-hover:text-slate-300"}`} />
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/50">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200 font-medium">
            <LogOut size={18} />
            <span className="text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col overflow-hidden relative w-full bg-[#0B1120]">
        <header className="h-16 bg-[#0B1120]/80 backdrop-blur-md border-b border-slate-800/50 flex items-center justify-between px-4 md:px-8 shrink-0 relative z-50">
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-slate-300 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-lg font-semibold text-slate-200 hidden sm:block tracking-tight">Panel de Control</h2>
          </div>
          
          <div className="flex items-center gap-3 md:gap-4">
            {/* CAMPANA DE NOTIFICACIONES */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800 focus:outline-none"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-2 inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold leading-none text-white bg-red-500 rounded-full border-2 border-[#0B1120]">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/80">
                      <h3 className="font-bold text-white text-sm">Notificaciones</h3>
                      {unreadCount > 0 && (
                        <button onClick={markAllAsRead} className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
                          Marcar leídas
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                      {notifications.length === 0 ? (
                        <p className="p-6 text-center text-sm text-slate-500">No tienes notificaciones.</p>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className={`p-4 border-b border-slate-700/50 text-sm transition-colors ${!n.is_read ? 'bg-blue-500/5 hover:bg-blue-500/10' : 'bg-transparent hover:bg-slate-700/30 opacity-70'}`}>
                            <p className="text-slate-200 leading-snug">{n.content}</p>
                            <p className="text-[10px] text-slate-500 mt-1.5 font-medium">
                              {new Date(n.created_at).toLocaleString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-sm shadow-lg shadow-blue-500/20 border border-white/10">
              U
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative custom-scrollbar">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </div>
      </main>

      <TutorialModal />
    </div>
  );
}