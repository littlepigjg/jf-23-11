export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonDef {
  id: SeasonId;
  name: string;
  icon: string;
  color: string;
  glowClass: string;
  sdBias: Record<string, number>;
  priceMult: Record<string, number>;
}

export const SEASON_DURATION = 50;

export const SEASONS: SeasonDef[] = [
  {
    id: 'spring',
    name: '春',
    icon: '🌸',
    color: 'text-emerald-400',
    glowClass: 'text-glow-green',
    sdBias: { food: 0.2, medicine: -0.1 },
    priceMult: { food: 1.2, medicine: 0.95 },
  },
  {
    id: 'summer',
    name: '夏',
    icon: '☀️',
    color: 'text-amber-400',
    glowClass: 'text-glow-yellow',
    sdBias: { crystal: -0.15, luxury: 0.15 },
    priceMult: { crystal: 0.9, luxury: 1.15 },
  },
  {
    id: 'autumn',
    name: '秋',
    icon: '🍂',
    color: 'text-orange-400',
    glowClass: 'text-glow-orange',
    sdBias: { ore: 0.15, food: -0.2 },
    priceMult: { ore: 1.15, food: 0.85 },
  },
  {
    id: 'winter',
    name: '冬',
    icon: '❄️',
    color: 'text-cyan-300',
    glowClass: 'text-glow-cyan',
    sdBias: { weapons: 0.3, medicine: 0.2 },
    priceMult: { weapons: 1.3, medicine: 1.2 },
  },
];

export const getSeasonByIndex = (index: number): SeasonDef =>
  SEASONS[index % SEASONS.length];

export const getSeasonIndex = (id: SeasonId): number =>
  SEASONS.findIndex((s) => s.id === id);
