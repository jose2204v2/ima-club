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

// 3. Encontrar la tarifa exacta ignorando las horas y zonas horarias
export const findApplicableRate = (
  rates: Rate[], 
  boatId: string, 
  dateStr: string, 
  timeSlot: string
) => {
  if (!dateStr || !timeSlot || !boatId) return null;

  const duration = getDurationFromTimeSlot(timeSlot);
  
  // Convertimos a fecha ISO (YYYY-MM-DD) y luego a número
  const [year, month, day] = dateStr.split('-');
  const targetDate = new Date(Number(year), Number(month) - 1, Number(day)).getTime();

  return rates.find(r => {
    if (r.boat_id !== boatId || r.duration_hours !== duration) return false;
    if (!r.seasons?.start_date || !r.seasons?.end_date) return false;

    // Lo mismo para las fechas de la temporada
    const [sy, sm, sd] = r.seasons.start_date.split('-');
    const [ey, em, ed] = r.seasons.end_date.split('-');
    
    const start = new Date(Number(sy), Number(sm) - 1, Number(sd)).getTime();
    const end = new Date(Number(ey), Number(em) - 1, Number(ed)).getTime();

    return targetDate >= start && targetDate <= end;
  });
};