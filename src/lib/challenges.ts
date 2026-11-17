// Solo virtual challenges. Progress is calculated from the user's own logs after they join.
// Each challenge has its own badge (shape + colours + icon) shown when completed.
import { dayKey } from './dates';

export type BadgeShape = 'hex' | 'shield' | 'circle' | 'star';
export interface Challenge {
  id: string; title: string; desc: string; days: number; target: number; unit: string;
  category: 'walk' | 'run' | 'gym' | 'water' | 'food' | 'mind' | 'burn';
  badge: { name: string; icon: string; colors: [string, string]; shape: BadgeShape };
}

export const CHALLENGES: Challenge[] = [
  { id: 'walk-300', title: 'Walk It Out', desc: 'Walk 300 minutes in 7 days', days: 7, target: 300, unit: 'min', category: 'walk',
    badge: { name: 'Street Walker', icon: 'walk', colors: ['#22E4FF', '#2563EB'], shape: 'circle' } },
  { id: 'run-5', title: '5 Run Week', desc: 'Go for 5 runs in 10 days', days: 10, target: 5, unit: 'runs', category: 'run',
    badge: { name: 'Road Runner', icon: 'run-fast', colors: ['#C8FF00', '#16A34A'], shape: 'hex' } },
  { id: 'run-100', title: 'Century Sprint', desc: '100 minutes of running in 14 days', days: 14, target: 100, unit: 'min', category: 'run',
    badge: { name: 'Speed Demon', icon: 'lightning-bolt', colors: ['#FFC83D', '#FF6A3D'], shape: 'star' } },
  { id: 'gym-12', title: 'Iron Month', desc: '12 gym sessions in 30 days', days: 30, target: 12, unit: 'sessions', category: 'gym',
    badge: { name: 'Iron Beast', icon: 'weight-lifter', colors: ['#A855F7', '#6D28D9'], shape: 'shield' } },
  { id: 'burn-3000', title: 'Burn 3K', desc: 'Burn 3,000 kcal in workouts in 14 days', days: 14, target: 3000, unit: 'kcal', category: 'burn',
    badge: { name: 'Fire Starter', icon: 'fire', colors: ['#FF6A3D', '#DC2626'], shape: 'hex' } },
  { id: 'water-7', title: 'Hydro Homie', desc: 'Hit your water goal 7 days', days: 10, target: 7, unit: 'days', category: 'water',
    badge: { name: 'Hydro Homie', icon: 'water', colors: ['#22E4FF', '#0891B2'], shape: 'circle' } },
  { id: 'protein-5', title: 'Protein Pro', desc: 'Hit your protein target on 5 days', days: 7, target: 5, unit: 'days', category: 'food',
    badge: { name: 'Protein Pro', icon: 'food-drumstick', colors: ['#FF3EA5', '#BE185D'], shape: 'shield' } },
  { id: 'log-14', title: 'No Days Off', desc: 'Log your meals 14 days in a row', days: 14, target: 14, unit: 'days', category: 'food',
    badge: { name: 'Consistency King', icon: 'crown', colors: ['#FFC83D', '#A855F7'], shape: 'star' } },
  { id: 'yoga-7', title: 'Zen Mode', desc: '7 days of yoga or stretching (10+ min)', days: 10, target: 7, unit: 'days', category: 'mind',
    badge: { name: 'Zen Master', icon: 'meditation', colors: ['#4ADE80', '#0D9488'], shape: 'circle' } },
];

type AppLike = {
  meals: { eatenAt: number; proteinG: number }[];
  workouts: { type: string; minutes: number; at: number; kcal: number; parts?: { activity: string; minutes: number }[] }[];
  waterByDay: Record<string, number>;
  targets: { waterTargetMl: number; proteinTarget: number };
};

const minutesOf = (w: AppLike['workouts'][number], match: (a: string) => boolean) =>
  w.parts?.length ? w.parts.filter(p => match(p.activity)).reduce((t, p) => t + p.minutes, 0) : (match(w.type) ? w.minutes : 0);

export function challengeProgress(c: Challenge, app: AppLike, joinedAt: number): number {
  const end = joinedAt + c.days * 86400000;
  const inWindow = (t: number) => t >= joinedAt && t <= end;
  const ws = app.workouts.filter(w => inWindow(w.at));
  const daysInWindow: string[] = [];
  for (let t = joinedAt; t <= Math.min(end, Date.now()); t += 86400000) daysInWindow.push(dayKey(new Date(t)));
  if (!daysInWindow.includes(dayKey())) daysInWindow.push(dayKey());

  switch (c.id) {
    case 'walk-300': return ws.reduce((t, w) => t + minutesOf(w, a => a.toLowerCase().includes('walk') || a === 'Trekking'), 0);
    case 'run-5': return ws.filter(w => minutesOf(w, a => a === 'Run') > 0).length;
    case 'run-100': return ws.reduce((t, w) => t + minutesOf(w, a => a === 'Run'), 0);
    case 'gym-12': return ws.filter(w => minutesOf(w, a => ['Gym (mixed)', 'Weight training', 'Boxing', 'HIIT', 'Cardio machine'].includes(a)) > 0).length;
    case 'burn-3000': return ws.reduce((t, w) => t + (w.kcal || 0), 0);
    case 'water-7': return daysInWindow.filter(d => (app.waterByDay[d] ?? 0) >= app.targets.waterTargetMl).length;
    case 'protein-5': return daysInWindow.filter(d =>
      app.meals.filter(m => dayKey(new Date(m.eatenAt)) === d).reduce((t, m) => t + m.proteinG, 0) >= app.targets.proteinTarget).length;
    case 'log-14': {
      const logged = new Set(app.meals.filter(m => inWindow(m.eatenAt)).map(m => dayKey(new Date(m.eatenAt))));
      let n = 0; for (const d of daysInWindow) { if (logged.has(d)) n++; else if (d !== dayKey()) n = 0; }
      return n;
    }
    case 'yoga-7': return new Set(ws.filter(w => minutesOf(w, a => a === 'Yoga' || a === 'Stretching') >= 10)
      .map(w => dayKey(new Date(w.at)))).size;
    default: return 0;
  }
}

export function challengeStatus(c: Challenge, app: AppLike, joinedAt: number) {
  const value = challengeProgress(c, app, joinedAt);
  const done = value >= c.target;
  const msLeft = joinedAt + c.days * 86400000 - Date.now();
  return { value, done, expired: !done && msLeft <= 0, daysLeft: Math.max(0, Math.ceil(msLeft / 86400000)) };
}
