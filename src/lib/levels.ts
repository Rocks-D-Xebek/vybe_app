export const LEVELS = [
  { name: 'Rookie', xp: 0, color: '#9A9AB0', emoji: '🌱' },
  { name: 'Grinder', xp: 200, color: '#22E4FF', emoji: '⚡' },
  { name: 'Hustler', xp: 600, color: '#4ADE80', emoji: '🔥' },
  { name: 'Beast', xp: 1500, color: '#A855F7', emoji: '🦾' },
  { name: 'Icon', xp: 3500, color: '#FF3EA5', emoji: '💎' },
  { name: 'Legend', xp: 7000, color: '#FFC83D', emoji: '👑' },
];

export function levelFor(xp: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].xp) i++;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1];
  const progress = next ? (xp - cur.xp) / (next.xp - cur.xp) : 1;
  return { ...cur, index: i + 1, next, progress, toNext: next ? next.xp - xp : 0 };
}
