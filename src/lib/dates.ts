// Time-aware helpers (blueprint 3.C)
export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export type MealSlot = 'breakfast' | 'morning_snack' | 'lunch' | 'evening_snack' | 'dinner';

// Slot windows are only used to pre-select a slot and to time reminders.
// Users can log any slot at any time (e.g. everything at night).
export const SLOTS: { key: MealSlot; label: string; short: string; emoji: string; window: string;
  remind: [number, number]; usual: [number, number]; whatsapp: boolean }[] = [
  { key: 'breakfast', label: 'Breakfast', short: 'Breakfast', emoji: '🍳', window: 'before 9 AM', remind: [8, 30], usual: [8, 30], whatsapp: true },
  { key: 'morning_snack', label: 'Morning Snack', short: 'AM Snack', emoji: '🍎', window: '10 – 11:30 AM', remind: [11, 0], usual: [10, 45], whatsapp: false },
  { key: 'lunch', label: 'Lunch', short: 'Lunch', emoji: '🍛', window: '12 – 2 PM', remind: [13, 30], usual: [13, 0], whatsapp: true },
  { key: 'evening_snack', label: 'Evening Snack', short: 'PM Snack', emoji: '☕', window: '2 – 7 PM', remind: [17, 0], usual: [17, 0], whatsapp: false },
  { key: 'dinner', label: 'Dinner', short: 'Dinner', emoji: '🍲', window: 'after 8 PM', remind: [20, 30], usual: [20, 30], whatsapp: true },
];

export const slotInfo = (k: string) => SLOTS.find(s => s.key === k) ?? SLOTS[3];

export function mealCategoryByHour(d = new Date()): MealSlot {
  const m = d.getHours() * 60 + d.getMinutes();
  if (m < 9 * 60 + 30) return m < 4 * 60 ? 'dinner' : 'breakfast';
  if (m < 12 * 60) return 'morning_snack';
  if (m < 14 * 60 + 30) return 'lunch';
  if (m < 19 * 60 + 30) return 'evening_snack';
  return 'dinner';
}

export function timeAwarePrompt(): string {
  const prompts: Record<MealSlot, string> = {
    breakfast: "What's the breakfast scene?",
    morning_snack: 'Snack attack? 🍎',
    lunch: "What's for lunch?",
    evening_snack: 'Chai-time snack? ☕',
    dinner: "What's on the dinner menu?",
  };
  return prompts[mealCategoryByHour()] ?? 'What did you eat?';
}

// Local calendar day (YYYY-MM-DD). toISOString() would use UTC and put
// meals eaten in India between 00:00 and 05:30 on the previous day.
export function dayKey(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString([], { day: 'numeric', month: 'short' });
}
