// Client for the VYBE backend (backend/vybe-api.php on vibenews.in).
// URL comes from app.json → expo.extra.apiUrl, or EXPO_PUBLIC_API_URL in .env for testing.
import Constants from 'expo-constants';

const BASE: string =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  'https://vibenews.in/backend/vybe-api';

async function call<T>(action: string, body: object, timeoutMs = 60000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...body }),
      signal: ctrl.signal,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((data as any).error ?? `Server error (${r.status})`);
    return data as T;
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error('Mr. Vyb took too long. Try again.');
    if (e?.message === 'Network request failed') throw new Error('No internet connection.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export type ChatMsg = { role: 'user' | 'model'; text: string };

export interface FoodItem {
  name: string; estimatedQuantity: string; confidence: 'high' | 'medium' | 'low';
  estimatedCalories: number; proteinG: number; carbsG: number; fatG: number;
  fiberG?: number; sugarG?: number; sodiumMg?: number;
}
export interface FoodScanResult {
  items: FoodItem[]; overallConfidence: string; uncertaintyNote: string;
}
export interface FridgeResult {
  confirmedIngredients: { name: string; confidence: string }[];
  uncertainItems: { name: string; question: string }[];
}
export interface PlanDay {
  day: string; focus: string; tip?: string;
  workout: { title: string; minutes: number; exercises: string[] };
}
export interface Plan {
  title: string; goal: string; summary: string; durationWeeks: number;
  targets: { calories: number; proteinG: number; carbsG: number; fatG: number; fiberG: number; waterMl: number; activeMin: number };
  weekly: PlanDay[];
  meals: { slot: string; time: string; options: string[] }[];
  rules: string[];
}

export const api = {
  coachChat: (messages: ChatMsg[], userContext: object) =>
    call<{ reply: string }>('coach_chat', { messages: messages.slice(-30), userContext }),
  scanFood: (imageBase64: string, mealCategory: string) =>
    call<FoodScanResult>('food_scan', { imageBase64, mealCategory }),
  foodText: (text: string) =>
    call<FoodScanResult>('food_text', { text }),
  foodLabel: (imageBase64: string, amountText: string, name?: string) =>
    call<FoodScanResult>('food_label', { imageBase64, amountText, name }),
  analyzeFridge: (imagesBase64: string[]) =>
    call<FridgeResult>('fridge_analyze', { imagesBase64 }, 90000),
  planChat: (messages: ChatMsg[], userContext: object) =>
    call<{ reply: string; plan: Plan | null }>('plan_chat', { messages: messages.slice(-40), userContext }, 95000),
  avatarMakeover: (imageBase64: string) =>
    call<{ imageBase64: string; mimeType: string }>('avatar_makeover', { imageBase64 }, 95000),
};
