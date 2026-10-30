'use client';

import { useApp } from '../AppProvider';

export default function KomPanel() {
  const { s } = useApp();
  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-base font-extrabold">👑 Papan Peringkat Segmen (KOM & Iron Legend)</h2>
          <p className="text-[11px] opacity-65">Kompetisi rute tercepat (KOM/QOM), Local Legend 90 Hari & Rasio Kekuatan Gym</p>
        </div>
      </div>
      <div className="space-y-3 mt-3">
        {s.segments.map((seg) => (
          <div key={seg.name} className="surface-card-alt p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold">{seg.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C8F526]/20 text-[#C8F526] font-bold">
                👑 Local Legend ({seg.legendCount}x / 90d)
              </span>
            </div>
            <div className="text-[11px] opacity-70">{seg.dist}</div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
              <span>
                Rekor KOM: <strong>{seg.kom}</strong>
              </span>
              <span className="text-[#C8F526] font-bold">Waktu Kamu: {seg.userBest}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
