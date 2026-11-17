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
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export type ChatMsg = { role: 'user' | 'model'; text: string };

export interface FoodItem {
  name: string; estimatedQuantity: string; confidence: 'high' | 'medium' | 'low';
  estimatedCalories: number; proteinG: number; carbsG: number; fatG: number;
}
export interface FoodScanResult {
  items: FoodItem[]; overallConfidence: string; uncertaintyNote: string;
}
export interface FridgeResult {
  confirmedIngredients: { name: string; confidence: string }[];
  uncertainItems: { name: string; question: string }[];
}

export const api = {
  coachChat: (messages: ChatMsg[], userContext: object) =>
    call<{ reply: string }>('coach_chat', { messages: messages.slice(-30), userContext }),
  scanFood: (imageBase64: string, mealCategory: string) =>
    call<FoodScanResult>('food_scan', { imageBase64, mealCategory }),
  analyzeFridge: (imagesBase64: string[]) =>
    call<FridgeResult>('fridge_analyze', { imagesBase64 }, 90000),
};
