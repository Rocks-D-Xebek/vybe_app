// Time-aware helpers (blueprint 3.C)
export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function mealCategoryByHour(d = new Date()): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const h = d.getHours();
  if (h >= 5 && h < 11) return 'breakfast';
  if (h >= 11 && h < 16) return 'lunch';
  if (h >= 16 && h < 22) return 'dinner';
  return 'snack';
}

export function timeAwarePrompt(): string {
  const c = mealCategoryByHour();
  const prompts: Record<string, string> = {
    breakfast: "What's the breakfast scene?",
    lunch: "What's for lunch?",
    dinner: "What's on the dinner menu?",
  };
  return prompts[c] ?? 'What did you eat?';
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
