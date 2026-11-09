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
  if (timeSlot.includes("3.5h") || timeSlot.includes("Morning") || timeSlot.includes("Afternoon") || timeSlot.includes("Sunset")) return 3.5;
  return 3.5;
};

// 2. Calcular el precio final con descuento
export const calculateFinalPrice = (basePrice: number, discountPct: number) => {
  return basePrice - (basePrice * (discountPct / 100));
};

// 3. Encontrar la tarifa exacta basándose en FECHAS reales
export const findApplicableRate = (
  rates: Rate[], 
  boatId: string, 
  dateStr: string, 
  timeSlot: string
) => {
  if (!dateStr || !timeSlot || !boatId) return null;

  const duration = getDurationFromTimeSlot(timeSlot);
  const targetDate = new Date(dateStr).getTime();

  return rates.find(r => {
    if (r.boat_id !== boatId || r.duration_hours !== duration) return false;
    if (!r.seasons?.start_date || !r.seasons?.end_date) return false;

    const start = new Date(r.seasons.start_date).getTime();
    const end = new Date(r.seasons.end_date).getTime();

    return targetDate >= start && targetDate <= end;
  });
};