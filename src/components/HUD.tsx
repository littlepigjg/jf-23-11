import { useGameStore } from '../store/useGameStore';
import { getPlanet } from '../data/planets';
import { getSeasonByIndex, getCyclesLeft, getSeasonProgressPct } from '../data/seasons';

export default function HUD() {
  const credits = useGameStore((s) => s.credits);
  const ship = useGameStore((s) => s.ship);
  const cargo = useGameStore((s) => s.cargo);
  const currentPlanetId = useGameStore((s) => s.currentPlanetId);
  const statistics = useGameStore((s) => s.statistics);
  const marketState = useGameStore((s) => s.marketState);

  const season = getSeasonByIndex(marketState.seasonIndex);
  const cyclesLeft = getCyclesLeft(marketState.seasonTick);
  const seasonProgress = getSeasonProgressPct(marketState.seasonTick);

  const planet = getPlanet(currentPlanetId);
  const cargoUsed = cargo.reduce((sum, c) => sum + c.quantity, 0);
  const shieldPercent = (ship.currentShield / ship.maxShield) * 100;

  const shieldColor =
    shieldPercent > 60
      ? 'bg-neon-cyan'
      : shieldPercent > 30
      ? 'bg-neon-yellow'
      : 'bg-neon-red';

  const cargoPercent = (cargoUsed / ship.cargoCapacity) * 100;
  const cargoColor =
    cargoPercent > 90
      ? 'bg-neon-red'
      : cargoPercent > 70
      ? 'bg-neon-orange'
      : 'bg-neon-green';

  return (
    <div className="w-full h-[60px] panel flex items-center px-4 gap-6 flex-shrink-0">
      <div className="flex items-center gap-5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">🪙</span>
          <span className="font-orbitron font-bold text-neon-yellow text-glow-yellow text-sm">
            ₵{credits.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-2 w-40">
          <span className="text-sm">🛡️</span>
          <div className="flex-1 h-3 rounded-full bg-space-800 border border-white/10 overflow-hidden">
            <div
              className={`h-full ${shieldColor} transition-all duration-300`}
              style={{ width: `${shieldPercent}%` }}
            />
          </div>
          <span className="text-xs font-mono text-slate-300 w-14 text-right tabular-nums">
            {ship.currentShield}/{ship.maxShield}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm">📦</span>
          <div className="flex items-center gap-1.5">
            <div className="w-24 h-3 rounded-full bg-space-800 border border-white/10 overflow-hidden">
              <div
                className={`h-full ${cargoColor} transition-all duration-300`}
                style={{ width: `${cargoPercent}%` }}
              />
            </div>
            <span className="text-xs font-mono text-slate-300 tabular-nums">
              {cargoUsed}/{ship.cargoCapacity}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm">⚔️</span>
          <span className="text-xs font-mono text-slate-300">
            击败海盗 <span className="text-neon-orange font-semibold">{statistics.piratesDefeated}</span>
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 px-4">
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg bg-white/5 border border-white/10 min-w-[180px]">
          <span className="text-xl">{season.icon}</span>
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`font-orbitron font-semibold text-sm tracking-wide ${season.color} ${season.glowClass}`}>
                {season.name}季
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                剩 {cyclesLeft}
              </span>
            </div>
            <div className="w-full h-1 rounded-full bg-space-800 overflow-hidden">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${seasonProgress}%`,
                  background: season.id === 'spring'
                    ? 'linear-gradient(90deg,#22c55e,#10b981)'
                    : season.id === 'summer'
                    ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                    : season.id === 'autumn'
                    ? 'linear-gradient(90deg,#f97316,#fb923c)'
                    : 'linear-gradient(90deg,#06b6d4,#22d3ee)',
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm">📍</span>
          <span className="font-orbitron font-semibold text-neon-cyan text-sm text-glow-cyan tracking-wide">
            {planet?.name ?? '未知星域'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green" />
          </span>
          <span>存档已自动保存</span>
        </div>
      </div>
    </div>
  );
}
