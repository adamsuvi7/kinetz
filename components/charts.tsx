// Small dependency-free SVG charts for the dashboard. Colours follow the theme accent (CSS variables).
type Datum = { label: string; value: number | null };

const W = 320;
const ACCENT = { fill: 'var(--accent)', stroke: 'var(--accent)' };

/** Vertical bars with an optional dashed target line. `null` values render as an empty slot (no data that day). */
export function Bars({ data, target, format = (v) => String(Math.round(v)), height = 150, overColor }: {
  data: Datum[];
  target?: number;
  format?: (v: number) => string;
  height?: number;
  /** Bars above the target use this colour (e.g. a calorie surplus). */
  overColor?: string;
}) {
  const top = 18, bottom = 22;
  const max = Math.max(1, target ?? 0, ...data.map((d) => d.value ?? 0)) * 1.12;
  const y = (v: number) => top + (height - top - bottom) * (1 - v / max);
  const slot = W / data.length;
  const bw = Math.min(28, slot * 0.56);
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full h-auto" role="img">
      {data.map((d, i) => {
        const cx = slot * i + slot / 2;
        return (
          <g key={d.label + i}>
            <rect x={cx - bw / 2} y={top} width={bw} height={height - top - bottom} rx={6} fill="rgba(142,155,147,0.12)" />
            {d.value != null && d.value > 0 && (
              <>
                <rect
                  x={cx - bw / 2}
                  y={y(d.value)}
                  width={bw}
                  height={height - bottom - y(d.value)}
                  rx={6}
                  style={overColor && target && d.value > target ? { fill: overColor } : ACCENT}
                />
                <text x={cx} y={y(d.value) - 4} textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor" opacity="0.8">
                  {format(d.value)}
                </text>
              </>
            )}
            <text x={cx} y={height - 6} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.6">
              {d.label}
            </text>
          </g>
        );
      })}
      {target != null && target > 0 && (
        <>
          <line x1={0} x2={W} y1={y(target)} y2={y(target)} stroke="currentColor" strokeOpacity="0.55" strokeDasharray="5 4" />
          <text x={W - 2} y={y(target) - 4} textAnchor="end" fontSize="9" fontWeight="700" fill="currentColor" opacity="0.7">
            target {format(target)}
          </text>
        </>
      )}
    </svg>
  );
}

/** Line with dots, optional dashed goal line, labels on first/last points. */
export function Line({ data, goal, format = (v) => v.toFixed(1), height = 160 }: {
  data: { label: string; value: number }[];
  goal?: number;
  format?: (v: number) => string;
  height?: number;
}) {
  const pad = { l: 8, r: 8, t: 22, b: 22 };
  const vals = data.map((d) => d.value).concat(goal != null ? [goal] : []);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const lo = min - span * 0.15, hi = max + span * 0.15;
  const x = (i: number) => pad.l + (data.length === 1 ? (W - pad.l - pad.r) / 2 : (i / (data.length - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (height - pad.t - pad.b) * (1 - (v - lo) / (hi - lo));
  const pts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full h-auto" role="img">
      {goal != null && (
        <>
          <line x1={0} x2={W} y1={y(goal)} y2={y(goal)} stroke="currentColor" strokeOpacity="0.5" strokeDasharray="5 4" />
          <text x={W - 2} y={y(goal) - 4} textAnchor="end" fontSize="9" fontWeight="700" fill="currentColor" opacity="0.7">
            target {format(goal)}
          </text>
        </>
      )}
      <polyline points={pts} fill="none" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'var(--accent)' }} />
      {data.map((d, i) => (
        <circle key={i} cx={x(i)} cy={y(d.value)} r={3.5} fill="var(--bg-card)" strokeWidth={2} style={{ stroke: 'var(--accent)' }} />
      ))}
      {data.length > 0 && (
        <>
          <text x={x(0)} y={height - 6} textAnchor="start" fontSize="10" fill="currentColor" opacity="0.6">{data[0].label}</text>
          <text x={x(data.length - 1)} y={height - 6} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.6">{data[data.length - 1].label}</text>
          <text x={x(data.length - 1)} y={y(data[data.length - 1].value) - 8} textAnchor="end" fontSize="11" fontWeight="800" fill="currentColor">
            {format(data[data.length - 1].value)}
          </text>
        </>
      )}
    </svg>
  );
}

/** Progress ring: value of max, big label in the middle. */
export function Ring({ value, max, label, sub }: { value: number; max: number; label: string; sub: string }) {
  const r = 34, c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const over = max > 0 && value > max * 1.1;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 84 84" className="w-20 h-20" role="img" aria-label={`${label} ${sub}`}>
        <circle cx={42} cy={42} r={r} fill="none" stroke="rgba(142,155,147,0.18)" strokeWidth={8} />
        <circle
          cx={42}
          cy={42}
          r={r}
          fill="none"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${pct * c} ${c}`}
          transform="rotate(-90 42 42)"
          style={{ stroke: over ? '#F59E0B' : 'var(--accent)' }}
        />
        <text x={42} y={46} textAnchor="middle" fontSize="15" fontWeight="800" fill="currentColor">
          {Math.round(pct * 100)}%
        </text>
      </svg>
      <div className="text-[11px] font-bold mt-1 text-center">{label}</div>
      <div className="text-[10px] opacity-60 text-center">{sub}</div>
    </div>
  );
}
