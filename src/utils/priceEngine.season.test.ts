import {
  createInitialMarketState,
  tickMarketState,
  computePrice,
  regeneratePlanetPricesFromMarket,
} from '../utils/priceEngine';
import { GOODS } from '../data/goods';
import { PLANETS } from '../data/planets';
import {
  getCompressedTypeMult,
  getSeasonDirectSD,
  getSeasonByIndex,
  SEASON_DURATION,
} from '../data/seasons';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${msg}`);
  } else {
    failed++;
    console.error(`  ❌ ${msg}`);
  }
}

function assertGT(a: number, b: number, msg: string) {
  assert(a > b, `${msg} (${a.toFixed(2)} > ${b.toFixed(2)})`);
}

function assertLT(a: number, b: number, msg: string) {
  assert(a < b, `${msg} (${a.toFixed(2)} < ${b.toFixed(2)})`);
}

function makeMarket(seasonIndex: number, seasonTick: number) {
  const m = createInitialMarketState(1000);
  m.seasonIndex = seasonIndex;
  m.seasonTick = seasonTick;
  for (const p of PLANETS) {
    for (const g of GOODS) {
      m.planetSupplyDemand[p.id][g.id] = 0;
    }
  }
  for (const g of GOODS) {
    m.globalTrends[g.id] = { value: 0, momentum: 0 };
  }
  return m;
}

function priceNoJitter(goodId: string, planetId: string, market: ReturnType<typeof makeMarket>) {
  return computePrice(goodId, planetId, market, 0);
}

const PLANET_BY_TYPE: Record<string, string> = {};
for (const p of PLANETS) {
  if (!PLANET_BY_TYPE[p.type]) PLANET_BY_TYPE[p.type] = p.id;
}

console.log('\n=== 1. Type Compression Tests ===\n');

{
  const compress = getCompressedTypeMult(1.0, 1.0);
  assert(Math.abs(compress - 1.0) < 0.001, 'No compression when seasonMult=1.0');

  const homeWeaponsCompressed = getCompressedTypeMult(1.2, 1.5);
  const homeWeaponsRaw = 1.2 * 1.5;
  assertLT(homeWeaponsCompressed * 1.5, homeWeaponsRaw,
    'Compressed home weapons < raw (expensive planet dampened)');

  const industrialWeaponsCompressed = getCompressedTypeMult(0.7, 1.5);
  const industrialWeaponsRaw = 0.7 * 1.5;
  assertGT(industrialWeaponsCompressed * 1.5, industrialWeaponsRaw,
    'Compressed industrial weapons > raw (cheap planet boosted)');

  const homeFoodCompressed = getCompressedTypeMult(1.3, 1.35);
  const resourceFoodCompressed = getCompressedTypeMult(1.4, 1.35);
  const rawRatio = (1.4 * 1.35) / (1.3 * 1.35);
  const compressedRatio = (resourceFoodCompressed * 1.35) / (homeFoodCompressed * 1.35);
  assertLT(compressedRatio, rawRatio,
    'Type compression narrows the price ratio between planets');

  const homeWeaponsEff = getCompressedTypeMult(1.2, 1.5);
  const industrialWeaponsEff = getCompressedTypeMult(0.7, 1.5);
  const rangeCompressed = homeWeaponsEff - industrialWeaponsEff;
  const rangeRaw = 1.2 - 0.7;
  assertLT(rangeCompressed, rangeRaw,
    'Compressed typeMult range is narrower than raw');
}

console.log('\n=== 2. Uniform Season SD Tests ===\n');

{
  const springFoodSD = getSeasonDirectSD(0, 'food');
  assertGT(springFoodSD, 0, 'Spring adds positive SD for food');

  const winterWeaponsSD = getSeasonDirectSD(3, 'weapons');
  assertGT(winterWeaponsSD, 0, 'Winter adds positive SD for weapons');

  const summerFoodSD = getSeasonDirectSD(1, 'food');
  assert(Math.abs(summerFoodSD) < 0.001, 'Summer has no SD effect on food');

  const autumnFoodSD = getSeasonDirectSD(2, 'food');
  assertLT(autumnFoodSD, 0, 'Autumn adds negative SD for food (supply boost)');
}

console.log('\n=== 3. Spring Food - All Planets Price Increase ===\n');

{
  const summerMarket = makeMarket(1, 25);
  const springMarket = makeMarket(0, 25);

  const summerPrices: Record<string, number> = {};
  const springPrices: Record<string, number> = {};

  for (const [type, pid] of Object.entries(PLANET_BY_TYPE)) {
    summerPrices[type] = priceNoJitter('food', pid, summerMarket);
    springPrices[type] = priceNoJitter('food', pid, springMarket);
  }

  for (const type of Object.keys(PLANET_BY_TYPE)) {
    assertGT(springPrices[type], summerPrices[type],
      `Spring food on ${type} planet: price UP vs summer baseline`);
  }

  const homeIncrease = springPrices['home'] / summerPrices['home'];
  const tradeIncrease = springPrices['trade'] / summerPrices['trade'];
  const resourceIncrease = springPrices['resource'] / summerPrices['resource'];

  assertGT(homeIncrease, 1.3, `Home food increase ratio > 1.3 (${(homeIncrease * 100 - 100).toFixed(0)}%)`);
  assertGT(tradeIncrease, 1.3, `Trade food increase ratio > 1.3 (${(tradeIncrease * 100 - 100).toFixed(0)}%)`);
  assertGT(resourceIncrease, 1.3, `Resource food increase ratio > 1.3 (${(resourceIncrease * 100 - 100).toFixed(0)}%)`);

  const ratios = [homeIncrease, tradeIncrease, resourceIncrease];
  const maxRatio = Math.max(...ratios);
  const minRatio = Math.min(...ratios);
  const spread = maxRatio / minRatio;
  assertLT(spread, 1.5,
    `Season price change spread across planets < 1.5x (actual: ${spread.toFixed(2)}x)`);
}

console.log('\n=== 4. Winter Weapons - All Planets Price Increase ===\n');

{
  const summerMarket = makeMarket(1, 25);
  const winterMarket = makeMarket(3, 25);

  const summerPrices: Record<string, number> = {};
  const winterPrices: Record<string, number> = {};

  for (const [type, pid] of Object.entries(PLANET_BY_TYPE)) {
    summerPrices[type] = priceNoJitter('weapons', pid, summerMarket);
    winterPrices[type] = priceNoJitter('weapons', pid, winterMarket);
  }

  for (const type of Object.keys(PLANET_BY_TYPE)) {
    assertGT(winterPrices[type], summerPrices[type],
      `Winter weapons on ${type} planet: price UP vs summer baseline`);
  }

  const industrialIncrease = winterPrices['industrial'] / summerPrices['industrial'];
  const homeIncrease = winterPrices['home'] / summerPrices['home'];

  assertGT(industrialIncrease, 1.4,
    `Industrial weapons increase ratio > 1.4 (${(industrialIncrease * 100 - 100).toFixed(0)}%)`);
  assertGT(homeIncrease, 1.3,
    `Home weapons increase ratio > 1.3 (${(homeIncrease * 100 - 100).toFixed(0)}%)`);

  const industrialPrice = winterPrices['industrial'];
  const homePrice = winterPrices['home'];
  const rawIndustrial = 0.7;
  const rawHome = 1.2;
  const rawRatio = rawHome / rawIndustrial;
  const seasonRatio = homePrice / industrialPrice;
  assertLT(seasonRatio, rawRatio,
    `Winter narrows home/industrial weapons price ratio (${seasonRatio.toFixed(2)} < ${rawRatio.toFixed(2)})`);
}

console.log('\n=== 5. Season Change Immediate Price Impact ===\n');

{
  const market = makeMarket(0, 49);
  const beforePrices = regeneratePlanetPricesFromMarket(market);

  const { state: afterState, seasonChanged } = tickMarketState(market, 1, 2000);
  assert(seasonChanged, 'Season changed after 1 tick from tick 49');
  assert(afterState.seasonIndex === 1, 'Season advanced from spring to summer');

  const afterPrices = regeneratePlanetPricesFromMarket(afterState);

  for (const p of PLANETS) {
    const beforeLuxury = beforePrices[p.id]['luxury'];
    const afterLuxury = afterPrices[p.id]['luxury'];
    assertGT(afterLuxury, beforeLuxury,
      `Summer luxury UP on ${p.name} (${beforeLuxury} → ${afterLuxury})`);

    const beforeCrystal = beforePrices[p.id]['crystal'];
    const afterCrystal = afterPrices[p.id]['crystal'];
    assertLT(afterCrystal, beforeCrystal,
      `Summer crystal DOWN on ${p.name} (${beforeCrystal} → ${afterCrystal})`);
  }
}

console.log('\n=== 6. SD Pull Only Toward Natural (No Season Bias) ===\n');

{
  const market = makeMarket(0, 0);
  market.planetSupplyDemand[PLANET_BY_TYPE['home']]['food'] = 0.8;
  market.planetSupplyDemand[PLANET_BY_TYPE['trade']]['food'] = -0.5;

  const { state: afterState } = tickMarketState(market, 30, 2000);

  const homeFoodSD = afterState.planetSupplyDemand[PLANET_BY_TYPE['home']]['food'];
  const tradeFoodSD = afterState.planetSupplyDemand[PLANET_BY_TYPE['trade']]['food'];

  assertLT(Math.abs(homeFoodSD - 0.4), Math.abs(0.8 - 0.4),
    'Home food SD pulls toward natural 0.4, not season-biased value');
  assertLT(Math.abs(tradeFoodSD - 0.0), Math.abs(-0.5 - 0.0),
    'Trade food SD pulls toward natural 0.0, not season-biased value');

  assert(Math.abs(homeFoodSD - 0.4) < 0.15,
    `Home food SD near natural (0.4), got ${homeFoodSD.toFixed(3)}`);
  assert(Math.abs(tradeFoodSD - 0.0) < 0.15,
    `Trade food SD near natural (0.0), got ${tradeFoodSD.toFixed(3)}`);
}

console.log('\n=== 7. Cross-Planet Price Consistency in Season ===\n');

{
  const winterMarket = makeMarket(3, 25);
  const winterPrices = regeneratePlanetPricesFromMarket(winterMarket);

  const allWeaponsPrices = PLANETS.map(p => winterPrices[p.id]['weapons']);
  const maxPrice = Math.max(...allWeaponsPrices);
  const minPrice = Math.min(...allWeaponsPrices);
  const priceRatio = maxPrice / minPrice;

  const rawTypeMults = PLANETS.map(p => {
    const typeMultMap: Record<string, number> = {
      home: 1.2, resource: 1.3, industrial: 0.7, trade: 1.0
    };
    return typeMultMap[p.type] ?? 1;
  });
  const rawRatio = Math.max(...rawTypeMults) / Math.min(...rawTypeMults);

  assertLT(priceRatio, rawRatio,
    `Winter weapons price ratio (${priceRatio.toFixed(2)}) < raw typeMult ratio (${rawRatio.toFixed(2)})`);

  for (const p of PLANETS) {
    const weaponPrice = winterPrices[p.id]['weapons'];
    const basePrice = 350;
    assertGT(weaponPrice, basePrice,
      `Winter weapons on ${p.name} above base price (${weaponPrice} > ${basePrice})`);
  }
}

console.log('\n=== 8. Season Cycle Completeness ===\n');

{
  const market = makeMarket(0, 0);
  const { state: afterState } = tickMarketState(market, SEASON_DURATION * 4, 10000);
  assert(afterState.seasonIndex === 0, 'After 4 seasons, back to spring (index 0)');
  assert(afterState.seasonTick < SEASON_DURATION, 'Season tick within range');
}

console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50) + '\n');

if (failed > 0) {
  process.exit(1);
}
