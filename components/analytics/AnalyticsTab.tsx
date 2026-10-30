'use client';

import { useState } from 'react';
import { last, type BodyMetric } from '@/lib/fitsync';
import { useApp } from '../AppProvider';

const INPUTS: { key: BodyMetric; label: string; fallback: number; accent?: boolean }[] = [
  { key: 'weight', label: 'Berat (kg)', fallback: 72 },
  { key: 'waist', label: 'Pinggang', fallback: 78.5, accent: true },
  { key: 'thigh', label: 'Paha (cm)', fallback: 56 },
  { key: 'arm', label: 'Lengan', fallback: 36.5 },
  { key: 'chest', label: 'Dada (cm)', fallback: 101 },
];

function BodyCurveChart({ data, labels }: { data: number[]; labels: string[] }) {
  const minVal = Math.min(...data) - 1;
  const maxVal = Math.max(...data) + 1;
  const w = 360, h = 150, padX = 32, padY = 24;

  const pts = data.map((val, idx) => ({
    x: padX + (idx / (data.length - 1)) * (w - padX * 2),
    y: h - padY - ((val - minVal) / (maxVal - minVal || 1)) * (h - padY * 2),
    val,
    label: labels[idx],
  }));

  let pathD = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const xc = (pts[i - 1].x + pts[i].x) / 2;
    const yc = (pts[i - 1].y + pts[i].y) / 2;
    pathD += ` Q ${pts[i - 1].x} ${pts[i - 1].y}, ${xc} ${yc}`;
  }
  pathD += ` T ${last(pts).x} ${last(pts).y}`;

  const areaD = `${pathD} L ${last(pts).x} ${h - padY} L ${pts[0].x} ${h - padY} Z`;
  const lastPt = last(pts);
  const delta = (last(data) - data[0]).toFixed(1);

  return (
    <svg viewBox="0 0 360 150" className="w-full h-36">
      <defs>
        <linearGradient id="bodyCurveGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C8F526" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#C8F526" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#bodyCurveGrad)" />
      <path d={pathD} fill="none" stroke="#C8F526" strokeWidth="3" strokeLinecap="round" />
      {pts.map((p) => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r="4" fill="#0E110F" stroke="#C8F526" strokeWidth="2.5" />
          <text x={p.x} y={h - 6} textAnchor="middle" fill="#8E9B93" fontSize="10">
            {p.label}
          </text>
        </g>
      ))}
      <rect x={lastPt.x - 86} y={Math.max(6, lastPt.y - 36)} width="82" height="24" rx="6" fill="#161B18" stroke="#C8F526" strokeWidth="1" />
      <text x={lastPt.x - 45} y={Math.max(22, lastPt.y - 20)} textAnchor="middle" fill="#C8F526" fontSize="10" fontWeight="bold">
        {`Now: ${lastPt.val} (${Number(delta) > 0 ? '+' + delta : delta})`}
      </text>
    </svg>
  );
}

export default function AnalyticsTab() {
  const { s, set, toast } = useApp();
  const [metric, setMetric] = useState<BodyMetric>('weight');
  const [inputs, setInputs] = useState<Record<BodyMetric, string>>({ weight: '72.0', waist: '78.5', thigh: '56.0', arm: '36.5', chest: '101.0' });

  const saveNewBodyMetrics = () => {
    set((p) => {
      const bodyHistory = { ...p.bodyHistory };
      INPUTS.forEach(({ key, fallback }) => {
        bodyHistory[key] = [...bodyHistory[key].slice(0, -1), parseFloat(inputs[key]) || fallback];
      });
      return { ...p, bodyHistory };
    });
    toast('Log ukuran tubuh (Berat, Pinggang, Paha, Lengan, Dada) berhasil diperbarui!');
  };

  return (
    <section className={`space-y-4${s.activeTab === 'analytics' ? '' : ' hidden'}`}>
      {/* Progress Goals */}
      <div className="surface-card p-4">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-bold">Progress Goals</h2>
          <span className="text-xs opacity-60">Body Recomposition</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="surface-card-alt p-3.5">
            <div className="text-[11px] opacity-65">Target Weight</div>
            <div className="font-display font-bold text-lg mt-1">
              <span>{last(s.bodyHistory.weight).toFixed(1)} KG</span> <span className="text-xs opacity-70">→ 68 KG</span>
            </div>
            <div className="text-[11px] text-[#C8F526] mt-1">78% Completed</div>
          </div>
          <div className="surface-card-alt p-3.5">
            <div className="text-[11px] opacity-65">Waist & Muscle Delta</div>
            <div className="font-display font-bold text-lg mt-1 text-[#C8F526]">
              -3.2 CM <span className="text-xs text-white opacity-80">Pinggang</span>
            </div>
            <div className="text-[11px] opacity-70 mt-1">Lean Mass Improving</div>
          </div>
        </div>
      </div>

      {/* Performance Insights: Weekly Consistency Slotted Bars */}
      <div className="surface-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold">Performance Insights</h3>
            <p className="text-[11px] opacity-65">Weekly Consistency & Macro Adherence</p>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-lg surface-card-alt font-semibold">Filter | Week ▾</span>
        </div>
        <div className="flex items-end justify-between px-2 pt-2">
          {s.weeklyConsistency.map((item) => (
            <div key={item.day} className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-bold opacity-80">{item.pct}%</span>
              <div className="text-[9px] font-extrabold text-[#C8F526] tracking-tighter leading-none">|||</div>
              <div className="slotted-bar-track">
                <div className="slotted-bar-fill" style={{ height: `${item.pct}%` }}></div>
              </div>
              <span className="text-[10px] font-bold opacity-60">{item.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Body Analytics Curve & Anthropometry Logger */}
      <div className="surface-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-bold">Body Analytics (Ukuran Tubuh)</h3>
            <p className="text-[11px] opacity-65">Pilih metrik untuk melihat kurva progres</p>
          </div>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as BodyMetric)}
            className="surface-card-alt text-xs font-bold px-2.5 py-1.5 rounded-xl outline-none"
          >
            <option value="weight">Berat Badan (kg)</option>
            <option value="waist">Lingkar Pinggang (cm)</option>
            <option value="thigh">Lingkar Paha (cm)</option>
            <option value="arm">Lingkar Lengan (cm)</option>
            <option value="chest">Lingkar Dada (cm)</option>
          </select>
        </div>

        <div className="surface-card-alt p-3 my-2">
          <BodyCurveChart data={s.bodyHistory[metric]} labels={s.bodyHistory.labels} />
        </div>

        <div className="grid grid-cols-5 gap-1.5 text-center mt-3">
          {INPUTS.map(({ key, label, accent }) => (
            <div key={key} className="surface-card-alt p-2">
              <label className="text-[9px] opacity-65 block">{label}</label>
              <input
                type="number"
                step="0.1"
                value={inputs[key]}
                onChange={(e) => setInputs((v) => ({ ...v, [key]: e.target.value }))}
                className={`w-full bg-transparent text-center font-display font-bold text-xs outline-none mt-0.5${accent ? ' text-[#C8F526]' : ''}`}
              />
            </div>
          ))}
        </div>
        <button onClick={saveNewBodyMetrics} className="w-full mt-2.5 py-2 rounded-xl text-xs lime-btn">
          Simpan Log Ukuran Tubuh Hari Ini
        </button>

        <div className="grid grid-cols-2 gap-2.5 mt-3">
          <div className="surface-card-alt p-3">
            <div className="text-[11px] opacity-65">BMI Score</div>
            <div className="font-display font-bold text-lg mt-0.5">
              22.4 <span className="text-xs text-[#C8F526] font-normal">Normal</span>
            </div>
          </div>
          <div className="surface-card-alt p-3">
            <div className="text-[11px] opacity-65">Est. Body Fat</div>
            <div className="font-display font-bold text-lg mt-0.5">
              15.8% <span className="text-xs text-emerald-400 font-normal">Athletic</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fitness, Freshness & Nutritional Recovery Chart */}
      <div className="surface-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-bold">📈 Fitness, Freshness & Nutritional Recovery</h3>
            <p className="text-[11px] opacity-65">Kombinasi Beban Kardio/Gym vs Pemulihan Protein</p>
          </div>
          <span className="text-[11px] font-bold text-[#C8F526]">Form: +12 (Fresh)</span>
        </div>
        <svg viewBox="0 0 360 120" className="w-full h-28 surface-card-alt p-2 rounded-xl">
          <polyline fill="none" stroke="#C8F526" strokeWidth="2.5" points="15,90 70,78 130,64 190,58 250,45 310,36 345,28" />
          <polyline fill="none" stroke="#38BDF8" strokeWidth="2" strokeDasharray="4 3" points="15,82 70,86 130,72 190,68 250,55 310,48 345,42" />
          <text x="20" y="22" fill="#C8F526" fontSize="10" fontWeight="bold">
            — Fitness Score (74)
          </text>
          <text x="155" y="22" fill="#38BDF8" fontSize="10" fontWeight="bold">
            --- Protein Recovery (92%)
          </text>
        </svg>
      </div>
    </section>
  );
}
