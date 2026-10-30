'use client';

import { useApp } from './AppProvider';

export default function BeaconModal() {
  const { s, beaconOpen, setBeaconOpen } = useApp();

  const shareBeaconWhatsApp = () => {
    const text = encodeURIComponent(
      `🛰️ *KINETZ SAFELINK LIVE BEACON*\nSaya sedang berolahraga sekarang.\n📍 Lokasi GPS: -0.3051, 100.3692\n💚 Detak Jantung: ${s.heartRate} bpm\n⏱️ Status Diet: IF ${s.fastingProtocol}\n🔋 Baterai: 84%`,
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
    setBeaconOpen(false);
  };

  return (
    <div className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-sm ${beaconOpen ? 'flex' : 'hidden'} items-center justify-center p-4`}>
      <div className="w-full max-w-sm surface-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-400 beacon-dot"></span>
            <h3 className="text-sm font-extrabold">🛰️ Kinetz SafeLink (Bio-Beacon)</h3>
          </div>
          <button onClick={() => setBeaconOpen(false)} className="px-2.5 py-1 rounded-lg surface-card-alt text-xs font-bold">
            ✕
          </button>
        </div>
        <p className="text-xs opacity-80 leading-relaxed">
          Bagikan lokasi GPS <em>real-time</em>, detak jantung, sisa baterai, dan status puasa aktif ke kontak darurat saat berlari atau bersepeda.
        </p>
        <div className="surface-card-alt p-3 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span>📍 Koordinat GPS:</span>
            <strong className="text-[#C8F526]">-0.3051° S, 100.3692° E</strong>
          </div>
          <div className="flex justify-between">
            <span>💚 Detak Jantung:</span>
            <strong>142 bpm (Zona Aerobik)</strong>
          </div>
          <div className="flex justify-between">
            <span>⏱️ Status Metabolik:</span>
            <strong className="text-amber-400">{s.beaconFastingStatus}</strong>
          </div>
          <div className="flex justify-between">
            <span>🔋 Baterai Perangkat:</span>
            <strong>84% (Online)</strong>
          </div>
        </div>
        <button onClick={shareBeaconWhatsApp} className="w-full py-2.5 rounded-xl text-xs lime-btn">
          📲 Kirim Link Live Beacon ke WhatsApp
        </button>
      </div>
    </div>
  );
}
