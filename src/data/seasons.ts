import { GOODS } from './goods';
import type { Good } from '../types/game';

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

export const SEASON_TYPE_COMPRESS = 2.5;

export const SEASON_SD_DIRECT = 1.0;

export const SEASONS: SeasonDef[] = [
  {
    id: 'spring',
    name: '春',
    icon: '🌸',
    color: 'text-emerald-400',
    glowClass: 'text-glow-green',
    sdBias: { food: 0.45, medicine: -0.15 },
    priceMult: { food: 1.35, medicine: 0.92 },
  },
  {
    id: 'summer',
    name: '夏',
    icon: '☀️',
    color: 'text-amber-400',
    glowClass: 'text-glow-yellow',
    sdBias: { crystal: -0.3, luxury: 0.35 },
    priceMult: { crystal: 0.82, luxury: 1.3 },
  },
  {
    id: 'autumn',
    name: '秋',
    icon: '🍂',
    color: 'text-orange-400',
    glowClass: 'text-glow-orange',
    sdBias: { ore: 0.35, food: -0.35 },
    priceMult: { ore: 1.28, food: 0.78 },
  },
  {
    id: 'winter',
    name: '冬',
    icon: '❄️',
    color: 'text-cyan-300',
    glowClass: 'text-glow-cyan',
    sdBias: { weapons: 0.55, medicine: 0.35 },
    priceMult: { weapons: 1.5, medicine: 1.35 },
  },
];

export const getSeasonByIndex = (index: number): SeasonDef =>
  SEASONS[index % SEASONS.length];

export const getSeasonIndex = (id: SeasonId): number =>
  SEASONS.findIndex((s) => s.id === id);

export const getCompressedTypeMult = (
  typeMult: number,
  seasonMult: number
): number => {
  const seasonStrength = Math.abs(seasonMult - 1);
  if (seasonStrength < 0.01) return typeMult;
  const compressFactor = 1 / (1 + seasonStrength * SEASON_TYPE_COMPRESS);
  return 1 + (typeMult - 1) * compressFactor;
};

export const getSeasonDirectSD = (
  seasonIndex: number,
  goodId: string
): number => {
  const season = getSeasonByIndex(seasonIndex);
  return (season.sdBias[goodId] ?? 0) * SEASON_SD_DIRECT;
};

export const getSeasonSDEffects = (
  seasonIndex: number
): Record<string, { sdBias: number; priceMult: number }> => {
  const season = getSeasonByIndex(seasonIndex);
  const result: Record<string, { sdBias: number; priceMult: number }> = {};
  for (const g of GOODS) {
    result[g.id] = {
      sdBias: season.sdBias[g.id] ?? 0,
      priceMult: season.priceMult[g.id] ?? 1,
    };
  }
  return result;
};

export const getSeasonPullStrength = (
  seasonIndex: number,
  goodId: string
): number => {
  return 0.08;
};

export interface GoodSeasonEffect {
  goodId: string;
  good: Good | undefined;
  priceMult: number;
  sdBias: number;
  priceDeltaPct: number;
  label: string;
  tone: 'up' | 'down' | 'flat';
}

export const getGoodSeasonEffects = (seasonIndex: number): GoodSeasonEffect[] => {
  const season = getSeasonByIndex(seasonIndex);
  return GOODS.map((g) => {
    const priceMult = season.priceMult[g.id] ?? 1;
    const sdBias = season.sdBias[g.id] ?? 0;
    const priceDeltaPct = Math.round((priceMult - 1) * 100);

    let tone: 'up' | 'down' | 'flat' = 'flat';
    let label = '无季节影响';

    if (priceDeltaPct > 5 || sdBias > 0.1) {
      tone = 'up';
      const parts: string[] = [];
      if (priceDeltaPct > 0) parts.push(`价格+${priceDeltaPct}%`);
      if (sdBias > 0.1) parts.push(`需求↑`);
      label = parts.join(' · ') || '旺季';
    } else if (priceDeltaPct < -5 || sdBias < -0.1) {
      tone = 'down';
      const parts: string[] = [];
      if (priceDeltaPct < 0) parts.push(`价格${priceDeltaPct}%`);
      if (sdBias < -0.1) parts.push(`供应↑`);
      label = parts.join(' · ') || '淡季';
    }

    return {
      goodId: g.id,
      good: g,
      priceMult,
      sdBias,
      priceDeltaPct,
      label,
      tone,
    };
  });
};

export const getCyclesLeft = (seasonTick: number): number =>
  SEASON_DURATION - seasonTick;

export const getSeasonProgressPct = (seasonTick: number): number =>
  (seasonTick / SEASON_DURATION) * 100;
