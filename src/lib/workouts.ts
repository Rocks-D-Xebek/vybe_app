// Calories burned = MET × body weight (kg) × hours  (Compendium of Physical Activities averages)
import type { WorkoutPart } from '../store/AppStore';

export const ACTIVITIES: { name: string; met: number; icon: string }[] = [
  { name: 'Walk', met: 3.5, icon: 'walk' },
  { name: 'Brisk walk', met: 4.8, icon: 'walk' },
  { name: 'Run', met: 9.8, icon: 'run-fast' },
  { name: 'Gym (mixed)', met: 5.0, icon: 'dumbbell' },
  { name: 'Weight training', met: 5.0, icon: 'weight-lifter' },
  { name: 'Boxing', met: 7.8, icon: 'boxing-glove' },
  { name: 'HIIT', met: 8.0, icon: 'lightning-bolt' },
  { name: 'Cardio machine', met: 7.0, icon: 'heart-pulse' },
  { name: 'Cycling', met: 7.5, icon: 'bike' },
  { name: 'Swimming', met: 7.0, icon: 'swim' },
  { name: 'Yoga', met: 2.5, icon: 'meditation' },
  { name: 'Stretching', met: 2.3, icon: 'human-handsup' },
  { name: 'Dance', met: 6.0, icon: 'human-female-dance' },
  { name: 'Skipping', met: 11.0, icon: 'jump-rope' },
  { name: 'Cricket', met: 4.8, icon: 'cricket' },
  { name: 'Football', met: 7.0, icon: 'soccer' },
  { name: 'Badminton', met: 5.5, icon: 'badminton' },
  { name: 'Trekking', met: 6.0, icon: 'hiking' },
  { name: 'Sports', met: 6.5, icon: 'basketball' },
];

export const QUICK = ['Walk', 'Run', 'Gym (mixed)', 'Yoga', 'Cycling', 'Swimming', 'Sports', 'Dance'];

const INTENSITY = { light: 0.8, moderate: 1, intense: 1.25 } as const;

export function metOf(name: string) {
  return ACTIVITIES.find(a => a.name === name)?.met ?? 5;
}

export function kcalFor(activity: string, minutes: number, weightKg: number, intensity: keyof typeof INTENSITY = 'moderate') {
  return Math.round(metOf(activity) * INTENSITY[intensity] * weightKg * (minutes / 60));
}

export function kcalForParts(parts: WorkoutPart[], weightKg: number) {
  return parts.reduce((t, p) => t + kcalFor(p.activity, p.minutes, weightKg, p.intensity), 0);
}

export function iconOf(name: string) {
  return ACTIVITIES.find(a => a.name === name)?.icon ?? 'run';
}
