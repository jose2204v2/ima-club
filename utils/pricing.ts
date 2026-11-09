// utils/pricing.ts

export type Rate = {
  id: string;
  boat_id: string;
  season_id: string;
  duration_hours: number;
  price: number;
  discount_pct: number;
  seasons?: { name: string, start_date: string | null, end_date: string | null } | null;
};

// 1. Traducir texto a horas (duración)
export const getDurationFromTimeSlot = (timeSlot: string): number => {
  if (timeSlot.includes("Full Day") || timeSlot.includes("7h")) return 7;
  return 3.5; // Por defecto 3.5h para Morning, Afternoon, Sunset
};

// 2. Calcular el precio final con descuento
export const calculateFinalPrice = (basePrice: number, discountPct: number) => {
  return basePrice - (basePrice * (discountPct / 100));
};

// 3. Encontrar la tarifa exacta (Lógica robusta por strings)
export const findApplicableRate = (
  rates: Rate[], 
  boatId: string, 
  dateStr: string, 
  timeSlot: string
) => {
  if (!dateStr || !timeSlot || !boatId) return null;

  // Forzar formato YYYY-MM-DD cortando cualquier hora que venga de más
  const targetDate = dateStr.split('T')[0]; 
  const duration = getDurationFromTimeSlot(timeSlot);

  return rates.find(r => {
    // Comprobar barco y duración (forzando a número)
    if (r.boat_id !== boatId || Number(r.duration_hours) !== duration) return false;
    
    if (!r.seasons?.start_date || !r.seasons?.end_date) return false;

    // Cortar las fechas de temporada a YYYY-MM-DD también
    const start = r.seasons.start_date.split('T')[0];
    const end = r.seasons.end_date.split('T')[0];

    // Al ser strings tipo "2026-11-09", la comparación alfabética funciona perfecto para fechas
    return targetDate >= start && targetDate <= end;
  });
};