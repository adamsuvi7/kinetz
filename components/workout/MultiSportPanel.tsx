'use client';

import { useState } from 'react';
import { last } from '@/lib/fitsync';
import { useApp } from '../AppProvider';

export default function MultiSportPanel() {
  const { s, set, exportToStudio } = useApp();
  const [targetBurn, setTargetBurn] = useState('450');
  const bw = last(s.bodyHistory.weight) || 72;
  const sp = s.multiSports[s.selectedMultiSportIndex];

  // Kalori = MET * BB_kg * Durasi_jam
  const burned = Math.round(sp.met * bw * (s.multiDurationMin / 60));

  // Burn Target Router
  const targetKcal = Math.max(100, parseInt(targetBurn, 10) || 450);
  const runKm = (targetKcal / (bw * 1.036)).toFixed(1);
  const cycleKm = (targetKcal / (bw * 0.42)).toFixed(1);

  return (
    <>
      <div className="surface-card p-4">
        <h2 className="text-base font-extrabold mb-1">Multi-Sport & Court Tracker</h2>
        <p className="text-[11px] opacity-65 mb-3">Sepeda, Jalan, Hiking, Renang, hingga Olahraga Lapangan (Padel, Basket, Futsal)</p>

        <div className="grid grid-cols-3 gap-2 mb-3">
          {s.multiSports.map((m, i) => (
            <button
              key={m.id}
              onClick={() => set((p) => ({ ...p, selectedMultiSportIndex: i }))}
              className={`p-2.5 rounded-xl text-left border transition ${s.selectedMultiSportIndex === i ? 'lime-btn border-transparent' : 'surface-card-alt border-white/5'}`}
            >
              <div className="text-lg">{m.icon}</div>
              <div className="text-xs font-extrabold mt-1">{m.name}</div>
              <div className="text-[10px] opacity-75">METs {m.met}</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center my-3">
          <div className="surface-card-alt p-3">
            <div className="font-display font-bold text-base">{s.multiDurationMin} Min</div>
            <div className="text-[10px] opacity-65">Durasi Aktif</div>
          </div>
          <div className="surface-card-alt p-3">
            <div className="font-display font-bold text-base text-[#C8F526]">{sp.unit}</div>
            <div className="text-[10px] opacity-65">Avg Speed / Skor</div>
          </div>
          <div className="surface-card-alt p-3">
            <div className="font-display font-bold text-base text-amber-400">{burned} kcal</div>
            <div className="text-[10px] opacity-65">METs Burned</div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <label className="text-xs font-semibold opacity-75">Atur Durasi (Menit):</label>
          <input
            type="range"
            min="15"
            max="180"
            step="5"
            value={s.multiDurationMin}
            onChange={(e) => set((p) => ({ ...p, multiDurationMin: parseInt(e.target.value, 10) || 60 }))}
            className="flex-1 accent-[#C8F526]"
          />
        </div>

        <button onClick={() => exportToStudio('cycle')} className="w-full py-2.5 rounded-xl text-xs lime-btn">
          Bagikan Sesi Olahraga ke IG Story 9:16
        </button>
      </div>

      {/* Calorie-Target Route Planner ("Burn Target Router") */}
      <div className="surface-card p-4">
        <h3 className="text-sm font-bold mb-1">🧭 Perencana Rute Berbasis Target Kalori</h3>
        <p className="text-[11px] opacity-65 mb-3">Masukkan kalori yang ingin dibakar, sistem merancang jarak lari & sepeda otomatis</p>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="number"
            value={targetBurn}
            onChange={(e) => setTargetBurn(e.target.value)}
            className="w-28 surface-card-alt px-3 py-2 rounded-xl text-sm font-bold outline-none"
          />
          <span className="text-xs opacity-75">kkal ingin dibakar</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="surface-card-alt p-3">
            <div className="text-[10px] opacity-65">Rekomendasi Rute Lari</div>
            <div className="font-display font-bold text-base text-[#C8F526] mt-0.5">🏃 {runKm} KM</div>
            <div className="text-[10px] opacity-75">Est. {Math.round(Number(runKm) * 5.3)} menit</div>
          </div>
          <div className="surface-card-alt p-3">
            <div className="text-[10px] opacity-65">Rekomendasi Rute Sepeda</div>
            <div className="font-display font-bold text-base text-emerald-400 mt-0.5">🚴 {cycleKm} KM</div>
            <div className="text-[10px] opacity-75">Est. {Math.round((Number(cycleKm) / 25) * 60)} menit</div>
          </div>
        </div>
      </div>
    </>
  );
}
