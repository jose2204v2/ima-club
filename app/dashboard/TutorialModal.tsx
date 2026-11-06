"use client";

import { useState, useEffect } from "react";

const STEPS = [
  {
    title: "👋 ¡Bienvenido a IMA Club!",
    description: "Esta es tu plataforma central para gestionar el negocio náutico. Te tomamos 1 minuto para mostrarte lo esencial.",
    icon: "⛵",
  },
  {
    title: "🎯 Leads y Agente IA",
    description: "En la sección 'Leads (CRM)' registras a los interesados. Usa el botón '🤖 Auto-Propuesta' para que la IA asigne un barco, cree la propuesta y redacte el mensaje al cliente.",
    icon: "🤖",
  },
  {
    title: "💬 Propuestas y Chat en Vivo",
    description: "Desde 'Propuestas' puedes hacer seguimiento. Envía el enlace del portal al cliente para que acepte la propuesta y chatea con él en tiempo real.",
    icon: "📋",
  },
  {
    title: "✅ Reservas y Operativa",
    description: "Convierte propuestas en reservas, gestiona los pagos, los pasajeros, el QR de check-in, los contratos y las incidencias del día a día.",
    icon: "🛥️",
  },
  {
    title: "🚀 ¡Todo listo!",
    description: "Ya tienes el control total. Si necesitas ayuda, contacta con el equipo técnico.",
    icon: "🎉",
  },
];

export default function TutorialModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Comprobar si el usuario ya vio el tutorial
    const seen = localStorage.getItem("ima_tutorial_seen");
    if (!seen) {
      // Pequeño delay para que cargue el dashboard primero
      setTimeout(() => setIsOpen(true), 1500);
    }
  }, []);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    localStorage.setItem("ima_tutorial_seen", "true");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        
        {/* Indicador de pasos */}
        <div className="flex gap-1 p-4 bg-slate-900">
          {STEPS.map((_, i) => (
            <div 
              key={i} 
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                i <= step ? "bg-blue-500" : "bg-slate-700"
              }`}
            />
          ))}
        </div>

        {/* Contenido del paso */}
        <div className="p-8 text-center flex-1 flex flex-col items-center justify-center min-h-[300px]">
          <div className="text-6xl mb-4">{currentStep.icon}</div>
          <h2 className="text-2xl font-bold text-white mb-4">{currentStep.title}</h2>
          <p className="text-slate-300 text-lg leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        {/* Botones */}
        <div className="p-6 border-t border-slate-700 bg-slate-900 flex justify-between items-center">
          <button 
            onClick={handleClose}
            className="text-slate-400 hover:text-white text-sm font-medium transition-colors"
          >
            Saltar tutorial
          </button>
          
          <button 
            onClick={handleNext}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-8 rounded-lg transition-colors shadow-lg shadow-blue-500/20"
          >
            {isLastStep ? "Empezar a trabajar 🚀" : "Siguiente →"}
          </button>
        </div>
      </div>
    </div>
  );
}