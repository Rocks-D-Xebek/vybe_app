import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dayKey } from '../lib/dates';

export interface MealItem {
  name: string; quantity: string; calories: number;
  proteinG: number; carbsG: number; fatG: number; confidence?: string;
}
export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export interface Meal {
  id: string; items: MealItem[]; totalCalories: number; proteinG: number;
  carbsG: number; fatG: number; category: MealCategory;
  eatenAt: number; loggedAt: number; source: 'scan' | 'manual'; confirmed: boolean;
}
export interface WeightEntry { kg: number; at: number }
export interface Workout { id: string; type: string; minutes: number; at: number }
export type Mood = 'great' | 'good' | 'okay' | 'low' | 'stressed';
export interface DayLog { sleepHrs?: number; mood?: Mood }

export interface Profile {
  name: string; goal: string;
  currentWeightKg: number; targetWeightKg: number;
  calorieTarget: number; proteinTarget: number; carbsTarget: number; fatTarget: number;
  waterTargetMl: number; stepTarget: number; activeMinTarget: number; sleepTargetHrs: number;
}

const DEFAULT_PROFILE: Profile = {
  name: '', goal: 'Get lean & consistent',
  currentWeightKg: 70, targetWeightKg: 65,
  calorieTarget: 2000, proteinTarget: 110, carbsTarget: 220, fatTarget: 60,
  waterTargetMl: 2500, stepTarget: 10000, activeMinTarget: 60, sleepTargetHrs: 8,
};

interface State {
  ready: boolean; onboarded: boolean;
  meals: Meal[]; waterMl: number; weights: WeightEntry[]; profile: Profile;
  workouts: Workout[]; dayLogs: Record<string, DayLog>;
  finishOnboarding: (name: string) => void;
  addMeal: (m: Omit<Meal, 'id' | 'loggedAt'>) => void;
  removeMeal: (id: string) => void;
  addWater: (ml: number) => void;
  addWeight: (kg: number) => void;
  addWorkout: (type: string, minutes: number) => void;
  setDayLog: (patch: DayLog, key?: string) => void;
  updateProfile: (p: Partial<Profile>) => void;
  totalsFor: (key: string) => { calories: number; protein: number; carbs: number; fat: number };
  todayMeals: () => Meal[];
  activeMinutes: (key?: string) => number;
  streak: () => number;
}

const Ctx = createContext<State>(null as any);
const KEY = 'vybe-store-v2';
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [waterMl, setWater] = useState(0);
  const [waterDay, setWaterDay] = useState(dayKey());
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [dayLogs, setDayLogs] = useState<Record<string, DayLog>>({});
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const loaded = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        let raw = await AsyncStorage.getItem(KEY);
        // Migrate data saved by the first version of the app
        if (!raw) raw = await AsyncStorage.getItem('vybe-store-v1');
        if (raw) {
          const s = JSON.parse(raw);
          setMeals(s.meals ?? []); setWeights(s.weights ?? []);
          setWorkouts(s.workouts ?? []); setDayLogs(s.dayLogs ?? {});
          setProfile({ ...DEFAULT_PROFILE, ...(s.profile ?? {}) });
          setOnboarded(s.onboarded ?? Boolean(s.profile?.name && s.profile.name !== 'VYBE Athlete'));
          if (s.waterDay === dayKey()) setWater(s.waterMl ?? 0);
        }
      } catch {}
      loaded.current = true;
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(KEY, JSON.stringify({
      meals, waterMl, waterDay, weights, workouts, dayLogs, profile, onboarded,
    })).catch(() => {});
  }, [meals, waterMl, waterDay, weights, workouts, dayLogs, profile, onboarded]);

  const value: State = {
    ready, onboarded, meals, waterMl: waterDay === dayKey() ? waterMl : 0, weights, profile, workouts, dayLogs,
    finishOnboarding: name => {
      setProfile(p => ({ ...p, name: name.trim() || 'Champ' }));
      setOnboarded(true);
    },
    addMeal: m => setMeals(prev => [...prev, { ...m, id: uid(), loggedAt: Date.now() }]),
    removeMeal: id => setMeals(prev => prev.filter(m => m.id !== id)),
    addWater: ml => {
      const today = dayKey();
      setWater(w => Math.max(0, Math.min((waterDay === today ? w : 0) + ml, 10000)));
      setWaterDay(today);
    },
    addWeight: kg => {
      setWeights(w => [{ kg, at: Date.now() }, ...w].slice(0, 365));
      setProfile(p => ({ ...p, currentWeightKg: kg }));
    },
    addWorkout: (type, minutes) => setWorkouts(w => [{ id: uid(), type, minutes, at: Date.now() }, ...w].slice(0, 500)),
    setDayLog: (patch, key = dayKey()) => setDayLogs(d => ({ ...d, [key]: { ...d[key], ...patch } })),
    updateProfile: p => setProfile(prev => ({ ...prev, ...p })),
    totalsFor: key => meals.filter(m => dayKey(new Date(m.eatenAt)) === key)
      .reduce((t, m) => ({ calories: t.calories + m.totalCalories, protein: t.protein + m.proteinG,
        carbs: t.carbs + m.carbsG, fat: t.fat + m.fatG }), { calories: 0, protein: 0, carbs: 0, fat: 0 }),
    todayMeals: () => meals.filter(m => dayKey(new Date(m.eatenAt)) === dayKey())
      .sort((a, b) => a.eatenAt - b.eatenAt),
    activeMinutes: (key = dayKey()) => workouts
      .filter(w => dayKey(new Date(w.at)) === key).reduce((t, w) => t + w.minutes, 0),
    streak: () => {
      const days = new Set(meals.map(m => dayKey(new Date(m.eatenAt))));
      let n = 0; const d = new Date();
      if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1); // today not logged yet doesn't break the streak
      while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
      return n;
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useApp = () => useContext(Ctx);
