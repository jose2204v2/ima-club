// utils/pricing.ts

export type Rate = {
  id: string;
  boat_id: string;
  season_id: string;
  duration_hours: number;
  price: number;
  discount_pct: number;
  seasons?: { name: string, start_month: number, end_month: number } | null;
};

// 1. Traducir texto a horas (duración)
export const getDurationFromTimeSlot = (timeSlot: string): number => {
  if (timeSlot.includes("Full Day") || timeSlot.includes("7h")) return 7;
  if (timeSlot.includes("3.5h") || timeSlot.includes("Morning") || timeSlot.includes("Afternoon") || timeSlot.includes("Sunset")) return 3.5;
  return 3.5; // Por defecto
};

// 2. Calcular el precio final con descuento
export const calculateFinalPrice = (basePrice: number, discountPct: number) => {
  return basePrice - (basePrice * (discountPct / 100));
};

// 3. Encontrar la tarifa exacta (Lógica para el Frontend)
export const findApplicableRate = (
  rates: Rate[], 
  boatId: string, 
  dateStr: string, 
  timeSlot: string
) => {
  if (!dateStr || !timeSlot || !boatId) return null;

  const duration = getDurationFromTimeSlot(timeSlot);
  const month = new Date(dateStr).getMonth() + 1; // 1-12

  // Buscamos la tarifa que coincide con barco y duración, y cuya temporada incluya el mes
  return rates.find(r => 
    r.boat_id === boatId && 
    r.duration_hours === duration &&
    r.seasons && 
    month >= r.seasons.start_month && month <= r.seasons.end_month
  );
};