import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dayKey } from '../lib/dates';

export interface MealItem {
  name: string; quantity: string; calories: number;
  proteinG: number; carbsG: number; fatG: number; confidence?: string;
}
export interface Meal {
  id: string; items: MealItem[]; totalCalories: number; proteinG: number;
  carbsG: number; fatG: number; category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  eatenAt: number; loggedAt: number; source: 'scan' | 'manual'; confirmed: boolean;
}
export interface WeightEntry { kg: number; at: number }

interface Profile {
  name: string; goal: string;
  currentWeightKg: number; targetWeightKg: number;
  calorieTarget: number; proteinTarget: number; carbsTarget: number; fatTarget: number;
  waterTargetMl: number; stepTarget: number;
}

const DEFAULT_PROFILE: Profile = {
  name: 'VYBE Athlete', goal: 'Get lean & consistent',
  currentWeightKg: 78, targetWeightKg: 72,
  calorieTarget: 2200, proteinTarget: 140, carbsTarget: 220, fatTarget: 65,
  waterTargetMl: 2500, stepTarget: 10000,
};

interface State {
  meals: Meal[]; waterMl: number; weights: WeightEntry[]; profile: Profile;
  addMeal: (m: Omit<Meal, 'id' | 'loggedAt'>) => void;
  addWater: (ml: number) => void;
  addWeight: (kg: number) => void;
  updateProfile: (p: Partial<Profile>) => void;
  totalsFor: (key: string) => { calories: number; protein: number; carbs: number; fat: number };
  todayMeals: () => Meal[];
  streak: () => number;
}

const Ctx = createContext<State>(null as any);
const KEY = 'vybe-store-v1';

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [waterMl, setWater] = useState(0);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(raw => {
      if (!raw) return;
      const s = JSON.parse(raw);
      setMeals(s.meals ?? []); setWater(s.waterMl ?? 0);
      setWeights(s.weights ?? []); setProfile(s.profile ?? DEFAULT_PROFILE);
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(KEY, JSON.stringify({ meals, waterMl, weights, profile }));
  }, [meals, waterMl, weights, profile]);

  // Reset water counter automatically on a new day
  useEffect(() => {
    AsyncStorage.getItem('vybe-water-date').then(d => {
      const today = dayKey();
      if (d !== today) { setWater(0); AsyncStorage.setItem('vybe-water-date', today); }
    });
  }, []);

  const value: State = {
    meals, waterMl, weights, profile,
    addMeal: m => setMeals(prev => [...prev, { ...m, id: Math.random().toString(36).slice(2), loggedAt: Date.now() }]),
    addWater: ml => setWater(w => Math.min(w + ml, 10000)),
    addWeight: kg => setWeights(w => [{ kg, at: Date.now() }, ...w].slice(0, 60)),
    updateProfile: p => setProfile(prev => ({ ...prev, ...p })),
    totalsFor: key => meals.filter(m => dayKey(new Date(m.eatenAt)) === key)
      .reduce((t, m) => ({ calories: t.calories + m.totalCalories, protein: t.protein + m.proteinG,
        carbs: t.carbs + m.carbsG, fat: t.fat + m.fatG }), { calories: 0, protein: 0, carbs: 0, fat: 0 }),
    todayMeals: () => meals.filter(m => dayKey(new Date(m.eatenAt)) === dayKey()),
    streak: () => {
      const days = new Set(meals.map(m => dayKey(new Date(m.eatenAt))));
      let n = 0; const d = new Date();
      if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1); // streak counts until yesterday if today empty
      while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
      return n;
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useApp = () => useContext(Ctx);
