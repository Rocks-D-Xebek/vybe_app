import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dayKey, mealCategoryByHour, MealSlot } from '../lib/dates';
import type { Food } from '../lib/foods';
import type { Plan } from '../lib/api';

export interface Nutrients {
  calories: number; proteinG: number; carbsG: number; fatG: number;
  fiberG: number; sugarG: number; sodiumMg: number;
}
export interface MealItem {
  name: string; quantity: string; calories: number;
  proteinG: number; carbsG: number; fatG: number;
  fiberG?: number; sugarG?: number; sodiumMg?: number; confidence?: string;
  foodId?: string; unit?: string; qty?: number;   // set when logged with the calculator, so it can be re-edited
}
export type MealCategory = MealSlot;
export type MealSource = 'scan' | 'manual' | 'text' | 'label' | 'barcode' | 'favourite' | 'search';
export interface Meal {
  id: string; items: MealItem[]; totalCalories: number; proteinG: number;
  carbsG: number; fatG: number; fiberG?: number; sugarG?: number; sodiumMg?: number;
  category: MealCategory; eatenAt: number; loggedAt: number; source: MealSource; confirmed: boolean;
  timeApprox?: boolean;   // logged later without an exact time – excluded from meal-timing insights
}
export interface WeightEntry { kg: number; at: number }
export interface WorkoutPart { activity: string; minutes: number; intensity: 'light' | 'moderate' | 'intense' }
export interface Workout { id: string; type: string; minutes: number; at: number; kcal: number; parts?: WorkoutPart[] }
export type Mood = 'great' | 'good' | 'okay' | 'low' | 'stressed';
export interface DayLog { sleepHrs?: number; mood?: Mood }
export interface FavMeal { id: string; name: string; items: MealItem[] }
export interface ChallengeJoin { id: string; joinedAt: number; completedAt?: number }
export type AvatarChoice = { kind: 'initial' } | { kind: 'preset'; index: number } | { kind: 'photo'; uri: string };
export interface Reminders { water: boolean; meals: boolean; plan: boolean }
export type ChatMsg = { role: 'user' | 'model'; text: string };

export interface Profile {
  name: string; goal: string;
  currentWeightKg: number; targetWeightKg: number;
  calorieTarget: number; proteinTarget: number; carbsTarget: number; fatTarget: number; fiberTarget: number;
  waterTargetMl: number; stepTarget: number; activeMinTarget: number; sleepTargetHrs: number;
}

const DEFAULT_PROFILE: Profile = {
  name: '', goal: 'Get lean & consistent',
  currentWeightKg: 70, targetWeightKg: 65,
  calorieTarget: 2000, proteinTarget: 110, carbsTarget: 220, fatTarget: 60, fiberTarget: 30,
  waterTargetMl: 2500, stepTarget: 10000, activeMinTarget: 60, sleepTargetHrs: 8,
};

export const EMPTY_NUTRIENTS: Nutrients = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sugarG: 0, sodiumMg: 0 };

interface Persisted {
  onboarded: boolean; meals: Meal[]; waterByDay: Record<string, number>; weights: WeightEntry[];
  workouts: Workout[]; dayLogs: Record<string, DayLog>; profile: Profile; favourites: FavMeal[];
  challenges: ChallengeJoin[]; avatar: AvatarChoice; bannerUri: string | null; premium: boolean;
  plan: Plan | null; planStartedAt: number | null; planChat: ChatMsg[]; reminders: Reminders; openDays: string[];
  customFoods: Food[];   // foods Mr. Vyb looked up, cached for instant reuse
}

const DEFAULTS: Persisted = {
  onboarded: false, meals: [], waterByDay: {}, weights: [], workouts: [], dayLogs: {}, profile: DEFAULT_PROFILE,
  favourites: [], challenges: [], avatar: { kind: 'initial' }, bannerUri: null, premium: false,
  plan: null, planStartedAt: null, planChat: [], reminders: { water: false, meals: false, plan: false }, openDays: [], customFoods: [],
};

type State = Persisted & {
  ready: boolean; waterMl: number; targets: Profile;
  set: <K extends keyof Persisted>(key: K, value: Persisted[K] | ((prev: Persisted[K]) => Persisted[K])) => void;
  finishOnboarding: (name: string) => void;
  addMeal: (m: Omit<Meal, 'id' | 'loggedAt'>) => void;
  removeMeal: (id: string) => void;
  toggleFavourite: (meal: Meal) => void;
  isFavourite: (meal: Meal) => boolean;
  addWater: (ml: number) => void;
  addWeight: (kg: number) => void;
  addWorkout: (w: Omit<Workout, 'id' | 'at'>) => void;
  removeWorkout: (id: string) => void;
  setDayLog: (patch: DayLog, key?: string) => void;
  updateProfile: (p: Partial<Profile>) => void;
  totalsFor: (key: string) => { calories: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number; sodium: number };
  todayMeals: () => Meal[];
  activeMinutes: (key?: string) => number;
  burnedKcal: (key?: string) => number;
  streak: () => number;
  openStreak: () => number;
  xp: () => number;
  exportData: () => Persisted;
  mergeFromCloud: (remote: Partial<Persisted>) => void;
};

const Ctx = createContext<State>(null as any);
const KEY = 'vybe-store-v3';
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const mealSignature = (items: MealItem[]) => items.map(i => i.name.toLowerCase().trim()).sort().join('|');

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<Persisted>(DEFAULTS);
  const loaded = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY)
          ?? await AsyncStorage.getItem('vybe-store-v2')
          ?? await AsyncStorage.getItem('vybe-store-v1');
        if (raw) {
          const s = JSON.parse(raw);
          // Migrate older versions (single water counter → per-day history)
          const waterByDay = s.waterByDay ?? (s.waterDay ? { [s.waterDay]: s.waterMl ?? 0 } : {});
          setData({
            ...DEFAULTS, ...s, waterByDay,
            profile: { ...DEFAULT_PROFILE, ...(s.profile ?? {}) },
            reminders: { ...DEFAULTS.reminders, ...(s.reminders ?? {}) },
            onboarded: s.onboarded ?? Boolean(s.profile?.name && s.profile.name !== 'VYBE Athlete'),
            workouts: (s.workouts ?? []).map((w: Workout) => ({ ...w, kcal: w.kcal ?? 0 })),
            // Old single 'snack' category → morning or evening snack by when it was eaten
            meals: (s.meals ?? []).map((m: Meal) => (m.category as string) === 'snack'
              ? { ...m, category: new Date(m.eatenAt).getHours() < 13 ? 'morning_snack' : 'evening_snack' } : m),
          });
        }
      } catch {}
      loaded.current = true;
      setReady(true);
    })();
  }, []);

  // Record today's app open (for login streak bonuses and greetings)
  useEffect(() => {
    if (!ready) return;
    const today = dayKey();
    setData(d => d.openDays.includes(today) ? d : { ...d, openDays: [...d.openDays, today].slice(-400) });
  }, [ready]);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() => {});
  }, [data]);

  const set: State['set'] = (key, value) =>
    setData(d => ({ ...d, [key]: typeof value === 'function' ? (value as any)(d[key]) : value }));

  // An active plan's targets override the default profile targets
  const p = data.plan?.targets;
  const targets: Profile = p ? {
    ...data.profile,
    calorieTarget: Math.round(p.calories || data.profile.calorieTarget),
    proteinTarget: Math.round(p.proteinG || data.profile.proteinTarget),
    carbsTarget: Math.round(p.carbsG || data.profile.carbsTarget),
    fatTarget: Math.round(p.fatG || data.profile.fatTarget),
    fiberTarget: Math.round(p.fiberG || data.profile.fiberTarget),
    waterTargetMl: Math.round(p.waterMl || data.profile.waterTargetMl),
    activeMinTarget: Math.round(p.activeMin || data.profile.activeMinTarget),
  } : data.profile;

  const mealsOn = (key: string) => data.meals.filter(m => dayKey(new Date(m.eatenAt)) === key);
  const workoutsOn = (key: string) => data.workouts.filter(w => dayKey(new Date(w.at)) === key);

  const consecutive = (days: Set<string>, allowTodayMissing = true) => {
    let n = 0; const d = new Date();
    if (allowTodayMissing && !days.has(dayKey(d))) d.setDate(d.getDate() - 1);
    while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  };

  const value: State = {
    exportData: () => data,
    // Union of phone + cloud data: nothing logged on either side is lost.
    mergeFromCloud: remote => setData(d => {
      const byId = <T,>(a: T[] = [], b: T[] = [], key: (x: T) => string) => {
        const m = new Map<string, T>(); [...a, ...b].forEach(x => m.set(key(x), x)); return [...m.values()];
      };
      const maxRec = (a: Record<string, number> = {}, b: Record<string, number> = {}) => {
        const out = { ...a }; for (const k in b) out[k] = Math.max(out[k] ?? 0, b[k]); return out;
      };
      const r = remote as Persisted;
      return {
        ...d,
        onboarded: d.onboarded || !!r.onboarded,
        meals: byId(r.meals, d.meals, m => m.id),
        workouts: byId(r.workouts, d.workouts, w => w.id),
        weights: byId(r.weights, d.weights, w => String(w.at)).sort((a, b) => b.at - a.at),
        waterByDay: maxRec(r.waterByDay, d.waterByDay),
        dayLogs: { ...(r.dayLogs ?? {}), ...d.dayLogs },
        favourites: byId(r.favourites, d.favourites, f => f.id),
        customFoods: byId(r.customFoods, d.customFoods, f => f.id),
        challenges: byId(r.challenges, d.challenges, c => c.id + (c.completedAt ? ':done' : ':run')),
        openDays: [...new Set([...(r.openDays ?? []), ...d.openDays])].sort().slice(-400),
        profile: d.profile.name ? d.profile : { ...d.profile, ...(r.profile ?? {}) },
        plan: d.plan ?? r.plan ?? null,
        planStartedAt: d.planStartedAt ?? r.planStartedAt ?? null,
        planChat: d.planChat.length ? d.planChat : (r.planChat ?? []),
        avatar: d.avatar.kind !== 'initial' ? d.avatar : (r.avatar ?? d.avatar),
      };
    }),
    ...data, ready, targets,
    waterMl: data.waterByDay[dayKey()] ?? 0,
    set,
    finishOnboarding: name => setData(d => ({ ...d, onboarded: true, profile: { ...d.profile, name: name.trim() || 'Champ' } })),
    addMeal: m => setData(d => ({ ...d, meals: [...d.meals, { ...m, id: uid(), loggedAt: Date.now() }] })),
    removeMeal: id => setData(d => ({ ...d, meals: d.meals.filter(m => m.id !== id) })),
    isFavourite: meal => data.favourites.some(f => mealSignature(f.items) === mealSignature(meal.items)),
    toggleFavourite: meal => setData(d => {
      const sig = mealSignature(meal.items);
      const exists = d.favourites.some(f => mealSignature(f.items) === sig);
      return { ...d, favourites: exists
        ? d.favourites.filter(f => mealSignature(f.items) !== sig)
        : [{ id: uid(), name: meal.items.map(i => i.name).join(' + ').slice(0, 60), items: meal.items }, ...d.favourites].slice(0, 30) };
    }),
    addWater: ml => setData(d => {
      const k = dayKey();
      return { ...d, waterByDay: { ...d.waterByDay, [k]: Math.max(0, Math.min((d.waterByDay[k] ?? 0) + ml, 10000)) } };
    }),
    addWeight: kg => setData(d => ({ ...d, weights: [{ kg, at: Date.now() }, ...d.weights].slice(0, 365),
      profile: { ...d.profile, currentWeightKg: kg } })),
    addWorkout: w => setData(d => ({ ...d, workouts: [{ ...w, id: uid(), at: Date.now() }, ...d.workouts].slice(0, 1000) })),
    removeWorkout: id => setData(d => ({ ...d, workouts: d.workouts.filter(w => w.id !== id) })),
    setDayLog: (patch, key = dayKey()) => setData(d => ({ ...d, dayLogs: { ...d.dayLogs, [key]: { ...d.dayLogs[key], ...patch } } })),
    updateProfile: pr => setData(d => ({ ...d, profile: { ...d.profile, ...pr } })),
    totalsFor: key => mealsOn(key).reduce((t, m) => ({
      calories: t.calories + m.totalCalories, protein: t.protein + m.proteinG, carbs: t.carbs + m.carbsG,
      fat: t.fat + m.fatG, fiber: t.fiber + (m.fiberG ?? 0), sugar: t.sugar + (m.sugarG ?? 0), sodium: t.sodium + (m.sodiumMg ?? 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }),
    todayMeals: () => mealsOn(dayKey()).sort((a, b) => a.eatenAt - b.eatenAt),
    activeMinutes: (key = dayKey()) => workoutsOn(key).reduce((t, w) => t + w.minutes, 0),
    burnedKcal: (key = dayKey()) => workoutsOn(key).reduce((t, w) => t + (w.kcal || 0), 0),
    streak: () => consecutive(new Set(data.meals.map(m => dayKey(new Date(m.eatenAt))))),
    openStreak: () => consecutive(new Set(data.openDays), false),
    // XP is calculated from real activity, so deleting a log also removes its XP
    xp: () => {
      const waterGoalDays = Object.values(data.waterByDay).filter(ml => ml >= targets.waterTargetMl).length;
      const mealDays = new Set(data.meals.map(m => dayKey(new Date(m.eatenAt)))).size;
      return data.meals.length * 10 + mealDays * 5 + data.workouts.length * 15 + waterGoalDays * 10
        + data.weights.length * 5 + Object.keys(data.dayLogs).length * 3
        + data.challenges.filter(c => c.completedAt).length * 100 + (data.plan ? 50 : 0);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useApp = () => useContext(Ctx);
