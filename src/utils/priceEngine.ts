import { GOODS } from '../data/goods';
import { PLANETS } from '../data/planets';
import { SEASON_DURATION, getSeasonByIndex } from '../data/seasons';
import type { Planet, PlanetType } from '../types/game';

export interface GoodTrend {
  value: number;
  momentum: number;
}

export type PlanetSD = Record<string, number>;

export interface PriceMarketState {
  version: number;
  lastTickAt: number;
  globalTrends: Record<string, GoodTrend>;
  planetSupplyDemand: Record<string, PlanetSD>;
  seasonIndex: number;
  seasonTick: number;
}

export const MARKET_STATE_VERSION = 3;
export const TICK_MINUTES = 1;
export const MAX_OFFLINE_TICKS = 60 * 24 * 3;

const planetTypeMultiplier: Record<PlanetType, Record<string, number>> = {
  home: { food: 1.3, luxury: 1.5, weapons: 1.2, medicine: 1.1, ore: 0.9, crystal: 0.95 },
  resource: { ore: 0.6, crystal: 0.7, food: 1.4, luxury: 1.6, medicine: 1.3, weapons: 1.3 },
  industrial: { ore: 1.5, crystal: 1.3, weapons: 0.7, food: 1.2, luxury: 1.2, medicine: 1.0 },
  trade: { ore: 1.0, crystal: 1.0, weapons: 1.0, food: 1.0, luxury: 0.85, medicine: 0.9 },
};

const planetTypeNaturalSD: Record<PlanetType, Record<string, number>> = {
  home: { food: 0.4, luxury: 0.5, weapons: 0.2, medicine: 0.15, ore: -0.15, crystal: -0.1 },
  resource: { ore: -0.55, crystal: -0.5, food: 0.35, luxury: 0.5, medicine: 0.3, weapons: 0.3 },
  industrial: { ore: 0.5, crystal: 0.4, weapons: -0.5, food: 0.2, luxury: 0.2, medicine: 0.05 },
  trade: { ore: 0, crystal: 0, weapons: 0, food: 0, luxury: -0.3, medicine: -0.2 },
};

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

export const createInitialMarketState = (
  now: number = Date.now()
): PriceMarketState => {
  const globalTrends: PriceMarketState['globalTrends'] = {};
  for (const g of GOODS) {
    globalTrends[g.id] = {
      value: (Math.random() - 0.5) * 0.4,
      momentum: (Math.random() - 0.5) * 0.05,
    };
  }

  const planetSupplyDemand: PriceMarketState['planetSupplyDemand'] = {};
  for (const p of PLANETS) {
    const sd: PlanetSD = {};
    const natural = planetTypeNaturalSD[p.type] ?? {};
    for (const g of GOODS) {
      const base = natural[g.id] ?? 0;
      sd[g.id] = clamp(base + (Math.random() - 0.5) * 0.2, -1, 1);
    }
    planetSupplyDemand[p.id] = sd;
  }

  return {
    version: MARKET_STATE_VERSION,
    lastTickAt: now,
    globalTrends,
    planetSupplyDemand,
    seasonIndex: 0,
    seasonTick: 0,
  };
};

const tickTrend = (trend: GoodTrend): GoodTrend => {
  const shock = (Math.random() - 0.5) * 0.06;
  let momentum = clamp(trend.momentum * 0.88 + shock, -0.08, 0.08);
  let value = clamp(trend.value + momentum, -1, 1);
  if (Math.abs(value) > 0.95) momentum *= -0.5;
  return { value, momentum };
};

const tickPlanetSD = (planet: Planet, sd: PlanetSD, seasonIndex: number): PlanetSD => {
  const natural = planetTypeNaturalSD[planet.type] ?? {};
  const season = getSeasonByIndex(seasonIndex);
  const next: PlanetSD = {};
  for (const g of GOODS) {
    const cur = sd[g.id] ?? 0;
    const nat = natural[g.id] ?? 0;
    const seasonBias = season.sdBias[g.id] ?? 0;
    const pull = (nat + seasonBias - cur) * 0.035;
    const noise = (Math.random() - 0.5) * 0.045;
    next[g.id] = clamp(cur + pull + noise, -1, 1);
  }
  return next;
};

export const tickMarketState = (
  state: PriceMarketState,
  ticks: number,
  now: number = Date.now()
): PriceMarketState => {
  if (ticks <= 0) return { ...state, lastTickAt: now };

  let trends = { ...state.globalTrends };
  let sdMap = { ...state.planetSupplyDemand };
  let seasonIndex = state.seasonIndex;
  let seasonTick = state.seasonTick;

  for (let i = 0; i < ticks; i++) {
    const nextTrends: PriceMarketState['globalTrends'] = {};
    for (const gid of Object.keys(trends)) {
      nextTrends[gid] = tickTrend(trends[gid]);
    }
    trends = nextTrends;

    const nextSD: PriceMarketState['planetSupplyDemand'] = {};
    for (const planet of PLANETS) {
      nextSD[planet.id] = tickPlanetSD(planet, sdMap[planet.id] ?? {}, seasonIndex);
    }
    sdMap = nextSD;

    seasonTick += 1;
    if (seasonTick >= SEASON_DURATION) {
      seasonTick = 0;
      seasonIndex = (seasonIndex + 1) % 4;
    }
  }

  return {
    ...state,
    lastTickAt: now,
    globalTrends: trends,
    planetSupplyDemand: sdMap,
    seasonIndex,
    seasonTick,
  };
};

export const computePrice = (
  goodId: string,
  planetId: string,
  market: PriceMarketState,
  randomness: number = 0.08
): number => {
  const good = GOODS.find((g) => g.id === goodId);
  const planet = PLANETS.find((p) => p.id === planetId);
  if (!good || !planet) return 0;

  const season = getSeasonByIndex(market.seasonIndex);
  const typeMult = planetTypeMultiplier[planet.type]?.[goodId] ?? 1;
  const seasonMult = season.priceMult[goodId] ?? 1;
  const sd = market.planetSupplyDemand[planetId]?.[goodId] ?? 0;
  const trend = market.globalTrends[goodId]?.value ?? 0;
  const jitter = 1 + (Math.random() - 0.5) * 2 * randomness;

  const sdFactor = 1 + sd * 0.65;
  const trendFactor = 1 + trend * 0.3;

  const raw =
    good.basePrice * typeMult * seasonMult * sdFactor * trendFactor * jitter;

  return Math.max(1, Math.round(raw));
};

export const regeneratePlanetPricesFromMarket = (
  market: PriceMarketState
): Record<string, Record<string, number>> => {
  const out: Record<string, Record<string, number>> = {};
  for (const p of PLANETS) {
    out[p.id] = {};
    for (const g of GOODS) {
      out[p.id][g.id] = computePrice(g.id, p.id, market);
    }
  }
  return out;
};

export const regeneratePartialPrices = (
  existing: Record<string, Record<string, number>>,
  planetIds: string[],
  market: PriceMarketState
): Record<string, Record<string, number>> => {
  const result = { ...existing };
  for (const pid of planetIds) {
    result[pid] = {};
    for (const g of GOODS) {
      result[pid][g.id] = computePrice(g.id, pid, market);
    }
  }
  return result;
};

export const getTicksForOffline = (
  lastTickAt: number,
  now: number = Date.now()
): number => {
  const minutes = Math.max(0, (now - lastTickAt) / 1000 / 60);
  const ticks = Math.floor(minutes / TICK_MINUTES);
  return Math.min(MAX_OFFLINE_TICKS, ticks);
};

export const formatPrice = (price: number): string => {
  return `₵ ${price.toLocaleString()}`;
};

export const describeTrend = (trendValue: number): { label: string; color: string } => {
  if (trendValue > 0.35) return { label: '大涨 📈', color: 'text-rose-400' };
  if (trendValue > 0.12) return { label: '上涨 ↗', color: 'text-rose-300' };
  if (trendValue > -0.12) return { label: '平稳 →', color: 'text-slate-400' };
  if (trendValue > -0.35) return { label: '下跌 ↘', color: 'text-emerald-300' };
  return { label: '暴跌 📉', color: 'text-emerald-400' };
};

export const describeSD = (sdValue: number): { label: string; color: string } => {
  if (sdValue > 0.35) return { label: '缺货 🔥', color: 'text-rose-400' };
  if (sdValue > 0.1) return { label: '偏紧', color: 'text-amber-300' };
  if (sdValue > -0.1) return { label: '正常', color: 'text-slate-400' };
  if (sdValue > -0.35) return { label: '充足', color: 'text-cyan-300' };
  return { label: '过剩 💧', color: 'text-emerald-400' };
};
