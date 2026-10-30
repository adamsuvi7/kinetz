'use client';

import { useEffect, useRef, useState } from 'react';
import { isNative, openLocationSettings, startGps, type GpsError } from '@/lib/gps';
import {
  SPORT_MAX_SPEED_MS, currentKmh, filterFix, defaultRideName, formatClock, formatDuration, formatKm, formatPace, formatRideDate, formatSpeed,
  rideStats, type FilterState, type Ride, type Segments, type Sport,
} from '@/lib/ride';
import { drawRoute } from '@/lib/story';
import { BUILD } from '@/lib/updater';
import { useApp } from '../AppProvider';

const GPS_ERROR_TEXT: Record<GpsError, string> = {
  denied: 'Izin lokasi belum lengkap. Buka Setelan → Izin → Lokasi, pilih "Izinkan saat aplikasi digunakan" dan aktifkan "Gunakan lokasi akurat".',
  disabled: 'Lokasi (GPS) di HP sedang mati. Nyalakan Lokasi dari panel notifikasi, lalu tekan Coba lagi.',
  unavailable: 'Sinyal GPS tidak tersedia. Coba di area terbuka.',
  insecure: 'GPS browser hanya jalan lewat HTTPS atau localhost.',
};

function RouteCanvas({ segments, width, height, className }: { segments: Segments; width: number; height: number; className: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    ctx.fillStyle = '#0B110E';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = 'rgba(200, 245, 38, 0.07)';
    ctx.lineWidth = 1;
    for (let x = 0; x < c.width; x += 28) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.height); ctx.stroke(); }
    for (let y = 0; y < c.height; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke(); }
    const pad = Math.min(c.width, c.height) * 0.12;
    drawRoute(ctx, segments, { x: pad, y: pad, w: c.width - pad * 2, h: c.height - pad * 2 }, '#C8F526', Math.max(3, c.width / 110), true);
  }, [segments]);
  return <canvas ref={ref} width={width} height={height} className={className}></canvas>;
}

function RideCard({ ride }: { ride: Ride }) {
  const { set, toast, exportToStudio } = useApp();
  const st = rideStats(ride.segments, ride.sport);

  const remove = () => {
    if (!window.confirm(`Hapus "${ride.name}"? Data GPS ride ini tidak bisa dikembalikan.`)) return;
    set((p) => ({ ...p, rides: p.rides.filter((r) => r.id !== ride.id), studio: p.studio.rideId === ride.id ? { ...p.studio, rideId: null } : p.studio }));
    toast('Ride dihapus');
  };

  return (
    <div className="surface-card-alt p-3 flex gap-3">
      <RouteCanvas segments={ride.segments} width={160} height={160} className="w-20 h-20 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <input
          defaultValue={ride.name}
          onBlur={(e) => {
            const name = e.target.value.trim() || defaultRideName(ride.startedAt, ride.sport);
            e.target.value = name;
            set((p) => ({ ...p, rides: p.rides.map((r) => (r.id === ride.id ? { ...r, name } : r)) }));
          }}
          aria-label="Nama ride"
          className="w-full bg-transparent text-sm font-extrabold outline-none border-b border-transparent focus:border-[#C8F526]/50"
        />
        <div className="text-[10px] opacity-65">{formatRideDate(ride.startedAt)}</div>
        <div className="flex gap-3 text-[11px]">
          <span><strong className="font-display">{formatKm(st.distanceM)}</strong> km</span>
          <span><strong className="font-display">{formatDuration(st.movingSec)}</strong></span>
          {ride.sport === 'run' ? (
            <span><strong className="font-display">{formatPace(st.avgKmh)}</strong> /km</span>
          ) : (
            <span><strong className="font-display">{formatSpeed(st.avgKmh)}</strong> km/jam</span>
          )}
        </div>
        <div className="flex gap-2 pt-0.5">
          <button
            onClick={() => {
              set((p) => ({ ...p, studio: { ...p.studio, rideId: ride.id } }));
              exportToStudio('ride');
            }}
            className="px-3 py-1.5 rounded-lg text-[11px] lime-btn"
          >
            Buat Story
          </button>
          <button onClick={remove} className="px-3 py-1.5 rounded-lg text-[11px] surface-card font-bold opacity-75">
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RideTab() {
  const { s, set, toast, exportToStudio } = useApp();
  const [acc, setAcc] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<GpsError | null>(null);
  const [gpsAttempt, setGpsAttempt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const active = s.activeRide;
  const status = active?.status ?? 'idle';
  // Sport for the next recording; defaults to whatever was recorded last.
  const [pick, setPick] = useState<Sport>(() => s.rides[0]?.sport ?? 'ride');
  const activeRef = useRef(active);
  activeRef.current = active;

  // Coming back from Android settings (permission or Location switched on): try again without extra taps.
  useEffect(() => {
    if (!gpsError || gpsError === 'insecure') return;
    const onVisible = () => document.visibilityState === 'visible' && setGpsAttempt((n) => n + 1);
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [gpsError]);

  // GPS stream runs whenever a ride is recording, also after an app restart mid-ride.
  useEffect(() => {
    if (status !== 'recording') return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    // Smoothing state lives here (not in React state) so StrictMode's double-run updaters can't advance it twice.
    let filter: FilterState = null;
    let last = activeRef.current?.segments.at(-1)?.at(-1);
    const maxSpeedMs = SPORT_MAX_SPEED_MS[activeRef.current?.sport ?? 'ride'];
    setGpsError(null);
    startGps(
      (p) => {
        setAcc(p.acc);
        setGpsError(null);
        const r = filterFix(filter, last, p, maxSpeedMs);
        filter = r.state;
        if (!r.point) return;
        const point = r.point;
        last = point;
        set((prev) => {
          const a = prev.activeRide;
          if (!a || a.status !== 'recording') return prev;
          const seg = a.segments[a.segments.length - 1];
          return { ...prev, activeRide: { ...a, segments: [...a.segments.slice(0, -1), [...seg, point]] } };
        });
      },
      setGpsError,
    )
      .then((fn) => (cancelled ? fn() : (stop = fn)))
      .catch(() => setGpsError('unavailable'));
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [status, set, gpsAttempt]);

  useEffect(() => {
    if (status !== 'recording') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status]);

  const start = () => {
    const t = Date.now();
    setAcc(null);
    set((p) => ({ ...p, activeRide: { startedAt: t, sport: pick, status: 'recording', segments: [[]], elapsedBefore: 0, resumedAt: t } }));
  };

  const pause = () =>
    set((p) => {
      const a = p.activeRide;
      if (!a) return p;
      return { ...p, activeRide: { ...a, status: 'paused', elapsedBefore: a.elapsedBefore + (Date.now() - a.resumedAt) / 1000 } };
    });

  const resume = () =>
    set((p) => {
      const a = p.activeRide;
      if (!a) return p;
      // New segment: the distance covered while paused is not part of the ride.
      return { ...p, activeRide: { ...a, status: 'recording', resumedAt: Date.now(), segments: [...a.segments, []] } };
    });

  const discard = () => {
    if (!window.confirm('Buang ride ini? Rekaman GPS-nya akan hilang.')) return;
    set((p) => ({ ...p, activeRide: null }));
  };

  const finish = () => {
    if (!active) return;
    const segments = active.segments.filter((seg) => seg.length > 0);
    if (segments.flat().length < 2) {
      if (window.confirm('Belum ada titik GPS yang terekam. Buang ride ini?')) set((p) => ({ ...p, activeRide: null }));
      return;
    }
    const ride: Ride = { id: String(active.startedAt), name: defaultRideName(active.startedAt, sport), startedAt: active.startedAt, segments, sport };
    set((p) => ({ ...p, activeRide: null, rides: [ride, ...p.rides], studio: { ...p.studio, rideId: ride.id } }));
    toast(`${ride.name} tersimpan · ${formatKm(rideStats(segments).distanceM)} km`);
  };

  const sport: Sport = active?.sport ?? pick;
  const isRun = sport === 'run';
  const segments = active?.segments ?? [];
  const st = rideStats(segments, sport);
  const elapsed = active ? active.elapsedBefore + (status === 'recording' ? Math.max(0, now - active.resumedAt) / 1000 : 0) : 0;
  const hasFix = segments.some((seg) => seg.length > 0);
  const lastFix = segments.flat().at(-1);
  // Signal lost: don't keep showing the last speed forever.
  const liveKmh = status === 'recording' && lastFix && now - lastFix.t < 15_000 ? currentKmh(segments) : 0;

  const gpsChip = gpsError
    ? { text: 'GPS bermasalah', cls: 'bg-red-500/20 text-red-300' }
    : status !== 'recording'
      ? { text: status === 'paused' ? 'Dijeda' : 'GPS siap', cls: 'bg-black/40 text-white/80' }
      : acc == null
        ? { text: 'Mencari sinyal GPS…', cls: 'bg-amber-400/20 text-amber-300' }
        : { text: `GPS ±${Math.round(acc)} m`, cls: acc <= 15 ? 'bg-[#C8F526]/20 text-[#C8F526]' : 'bg-amber-400/20 text-amber-300' };

  return (
    <section className={`space-y-4${s.activeTab === 'ride' ? '' : ' hidden'}`}>
      <div className="surface-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#C8F526] text-[#0E110F]">{isRun ? 'GPS RUN' : 'GPS RIDE'}</span>
            <h2 className="text-base font-extrabold mt-1">{isRun ? 'Rekam Lari' : 'Rekam Gowes'}</h2>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${gpsChip.cls}`}>
            {status === 'recording' && !gpsError && <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5 beacon-dot"></span>}
            {gpsChip.text}
          </span>
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0B100D]">
          <RouteCanvas segments={segments} width={440} height={230} className="w-full h-48 block" />
          {!hasFix && (
            <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-white/60 px-6 text-center">
              {status === 'idle' ? 'Tekan Mulai, rute GPS kamu tergambar di sini secara langsung.' : 'Menunggu titik GPS pertama…'}
            </div>
          )}
        </div>

        {gpsError && (
          <div className="mt-3 surface-card-alt p-3 text-[11px] space-y-2">
            <p>{GPS_ERROR_TEXT[gpsError]}</p>
            {status === 'recording' && gpsError !== 'insecure' && (
              <div className="flex gap-2">
                {gpsError === 'denied' && isNative() && (
                  <button onClick={() => openLocationSettings()} className="px-2.5 py-1 rounded-lg lime-btn">
                    Buka Setelan
                  </button>
                )}
                <button onClick={() => setGpsAttempt((n) => n + 1)} className="px-2.5 py-1 rounded-lg surface-card font-bold">
                  Coba lagi
                </button>
              </div>
            )}
          </div>
        )}

        <div className="text-center mt-4">
          <div className="font-display font-bold text-5xl text-[#C8F526] leading-none">{formatKm(st.distanceM)}</div>
          <div className="text-[10px] opacity-65 mt-1 tracking-wider">KILOMETER</div>
        </div>

        <div className="grid grid-cols-3 gap-2 my-4 text-center">
          {[
            { v: formatClock(elapsed), l: 'Waktu' },
            isRun ? { v: formatPace(liveKmh), l: 'Pace /km' } : { v: formatSpeed(liveKmh), l: 'Kec. km/jam' },
            isRun ? { v: formatPace(st.avgKmh), l: 'Pace rata-rata' } : { v: formatSpeed(st.avgKmh), l: 'Rata-rata' },
            { v: formatDuration(st.movingSec), l: 'Bergerak' },
            isRun ? { v: formatPace(st.maxKmh), l: 'Pace terbaik' } : { v: formatSpeed(st.maxKmh), l: 'Maks km/jam' },
            { v: `${Math.round(st.elevGainM)} m`, l: 'Elevasi' },
          ].map((x) => (
            <div key={x.l} className="surface-card-alt p-2.5">
              <div className="font-display font-bold text-base">{x.v}</div>
              <div className="text-[10px] opacity-65">{x.l}</div>
            </div>
          ))}
        </div>

        {status === 'idle' ? (
          <>
            <div className="grid grid-cols-2 gap-1.5 p-1 surface-card-alt rounded-2xl mb-2">
              {([['ride', '🚴 Gowes'], ['run', '🏃 Lari']] as const).map(([v, label]) => (
                <button key={v} onClick={() => setPick(v)} className={`py-2 rounded-xl text-xs font-bold ${pick === v ? 'lime-btn' : 'opacity-75'}`}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={start} className="w-full py-3 rounded-xl text-sm lime-btn">
              {isRun ? '▶ Mulai Lari' : '▶ Mulai Gowes'}
            </button>
          </>
        ) : (
          <div className="flex gap-2">
            {status === 'recording' ? (
              <button onClick={pause} className="flex-1 py-3 rounded-xl text-sm surface-card-alt font-bold border border-[#C8F526]/40">
                ⏸ Jeda
              </button>
            ) : (
              <button onClick={resume} className="flex-1 py-3 rounded-xl text-sm lime-btn">
                ▶ Lanjut
              </button>
            )}
            <button onClick={finish} className="flex-1 py-3 rounded-xl text-sm surface-card-alt font-bold">
              ■ Selesai
            </button>
          </div>
        )}
        {status === 'paused' && (
          <button onClick={discard} className="w-full mt-2 text-[11px] opacity-60 underline">
            Buang ride ini
          </button>
        )}

        <p className="text-[10px] opacity-55 mt-3 leading-relaxed">
          {isNative()
            ? 'Rekaman tetap berjalan saat layar terkunci; notifikasi "Kinetz merekam ride" tampil selama ride aktif.'
            : 'Di browser, biarkan layar tetap menyala selama ride. Pakai aplikasi Android Kinetz untuk merekam dengan layar terkunci.'}
          {BUILD > 0 && ` · Build ${BUILD}`}
        </p>
      </div>

      <div className="surface-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold">Riwayat Aktivitas</h3>
            <p className="text-[11px] opacity-65">Ketuk nama untuk mengganti, lalu buat story dari rute aslinya</p>
          </div>
          {s.rides.length > 0 && (
            <button onClick={() => exportToStudio('ride')} className="text-[11px] font-bold text-[#C8F526]">
              Editor Story →
            </button>
          )}
        </div>
        {s.rides.length === 0 ? (
          <div className="surface-card-alt p-4 text-center text-[11px] opacity-70">Belum ada ride tersimpan.</div>
        ) : (
          <div className="space-y-2.5">
            {s.rides.map((r) => (
              <RideCard key={r.id} ride={r} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
