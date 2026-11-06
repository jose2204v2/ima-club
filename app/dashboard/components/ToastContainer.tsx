"use client";

import { useEffect, useState } from "react";
import { ToastType } from "@/utils/toast";

type Toast = { id: number; message: string; type: ToastType };

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const { message, type } = (e as CustomEvent).detail;
      const id = Date.now();
      
      setToasts((prev) => [...prev, { id, message, type }]);
      
      // Auto-eliminar después de 4 segundos
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };

    window.addEventListener('show-toast', handleToast);
    return () => window.removeEventListener('show-toast', handleToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => (
        <div 
          key={t.id} 
          className={`px-5 py-4 rounded-xl shadow-2xl text-white font-medium text-sm animate-slide-up pointer-events-auto flex items-center gap-3 border border-white/10 ${
            t.type === 'success' ? 'bg-green-600/90 backdrop-blur-md' :
            t.type === 'error' ? 'bg-red-600/90 backdrop-blur-md' :
            t.type === 'warning' ? 'bg-yellow-600/90 backdrop-blur-md' : 'bg-blue-600/90 backdrop-blur-md'
          }`}
        >
          <span className="text-lg">
            {t.type === 'success' && '✅'}
            {t.type === 'error' && '❌'}
            {t.type === 'warning' && '⚠️'}
            {t.type === 'info' && 'ℹ️'}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}