'use client';

import { formatKm, formatRideDate, rideStats, type Ride } from '@/lib/ride';
import { COLORS, STAT_LABELS, type Layer, type StatKey, type Swatch, type TextLayer } from '@/lib/story';

const LAYER_NAMES: Record<string, string> = {
  title: 'Judul', date: 'Tanggal', route: 'Rute GPS', stats: 'Statistik', hero: 'Angka utama', brand: 'Logo',
};
const SIZE_RANGE: Record<Layer['kind'], [number, number, number]> = {
  text: [18, 160, 2],
  route: [240, 1000, 10],
  stats: [0.6, 2.2, 0.05],
  brand: [16, 80, 1],
};
const MAX_STATS = 6;

type Props = {
  layers: Layer[];
  onChange: (layers: Layer[]) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  rides: Ride[];
  ride: Ride | null;
  onPickRide: (id: string) => void;
  onReset: () => void;
};

function Segmented<T extends string>({ value, options, onPick }: { value: T; options: [T, string][]; onPick: (v: T) => void }) {
  return (
    <div className="flex gap-1">
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onPick(v)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${value === v ? 'lime-btn' : 'surface-card'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

const layerName = (l: Layer) => LAYER_NAMES[l.id] ?? (l.kind === 'text' ? l.text || 'Teks' : l.id);

export default function RideStoryEditor({ layers, onChange, selectedId, onSelect, rides, ride, onPickRide, onReset }: Props) {
  const selected = layers.find((l) => l.id === selectedId) ?? null;
  const patch = (id: string, p: Partial<Layer>) => onChange(layers.map((l) => (l.id === id ? ({ ...l, ...p } as Layer) : l)));

  const addText = (preset: 'event' | 'text') => {
    const layer: TextLayer =
      preset === 'event'
        ? { id: `t${Date.now()}`, kind: 'text', text: 'CRITICAL MASS', x: 540, y: 480, size: 40, style: 'pill', color: 'lime', align: 'center', bold: true, visible: true }
        : { id: `t${Date.now()}`, kind: 'text', text: 'Teks baru', x: 540, y: 1080, size: 48, style: 'plain', color: 'white', align: 'center', bold: true, visible: true };
    onChange([...layers, layer]);
    onSelect(layer.id);
  };

  const toggleStat = (key: StatKey) => {
    if (selected?.kind !== 'stats') return;
    const has = selected.stats.includes(key);
    if (!has && selected.stats.length >= MAX_STATS) return;
    // Keep the canonical order so toggling doesn't shuffle the grid.
    const order = Object.keys(STAT_LABELS) as StatKey[];
    patch(selected.id, { stats: has ? selected.stats.filter((k) => k !== key) : order.filter((k) => k === key || selected.stats.includes(k)) });
  };

  return (
    <div className="space-y-3">
      {rides.length > 0 ? (
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-semibold opacity-75 shrink-0">Ride:</label>
          <select
            value={ride?.id ?? ''}
            onChange={(e) => onPickRide(e.target.value)}
            className="flex-1 min-w-0 surface-card-alt text-xs font-bold px-2.5 py-1.5 rounded-xl outline-none"
          >
            {rides.map((r) => (
              <option key={r.id} value={r.id}>
                {`${r.name} · ${formatKm(rideStats(r.segments).distanceM)} km · ${formatRideDate(r.startedAt)}`}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="surface-card-alt p-3 text-[11px] opacity-75">Belum ada ride. Rekam dulu di tab Ride, rute dan statistiknya otomatis masuk ke sini.</div>
      )}

      {/* Layer chips */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold opacity-75">Elemen (seret di pratinjau untuk memindah)</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {layers.map((l) => (
            <button
              key={l.id}
              onClick={() => onSelect(l.id === selectedId ? null : l.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold max-w-[140px] truncate ${l.id === selectedId ? 'lime-btn' : 'surface-card-alt'} ${l.visible ? '' : 'opacity-45 line-through'}`}
            >
              {layerName(l)}
            </button>
          ))}
          <button onClick={() => addText('event')} className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-dashed border-[color:var(--accent)] text-[color:var(--accent)]">
            + Label Event
          </button>
          <button onClick={() => addText('text')} className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-dashed border-[color:var(--text-muted)]">
            + Teks
          </button>
        </div>
      </div>

      {/* Selected layer controls */}
      {selected && (
        <div className="surface-card-alt p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold">{layerName(selected)}</span>
            <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
              <input type="checkbox" checked={selected.visible} onChange={(e) => patch(selected.id, { visible: e.target.checked })} className="accent-[#C8F526]" />
              Tampilkan
            </label>
          </div>

          {selected.kind === 'text' && (
            <input
              value={selected.text}
              onChange={(e) => patch(selected.id, { text: e.target.value })}
              placeholder={selected.bind === 'name' ? 'Kosongkan = nama ride' : selected.bind === 'date' ? 'Kosongkan = tanggal ride' : 'Tulis teks'}
              maxLength={60}
              className="w-full surface-card px-3 py-2 rounded-xl text-xs font-bold outline-none"
            />
          )}

          <div className="flex items-center gap-2">
            <span className="text-[11px] opacity-75 w-12">Ukuran</span>
            <input
              type="range"
              min={SIZE_RANGE[selected.kind][0]}
              max={SIZE_RANGE[selected.kind][1]}
              step={SIZE_RANGE[selected.kind][2]}
              value={selected.size}
              onChange={(e) => patch(selected.id, { size: parseFloat(e.target.value) })}
              className="flex-1 accent-[#C8F526]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] opacity-75 w-12">Warna</span>
            {(Object.keys(COLORS) as Swatch[]).map((c) => (
              <button
                key={c}
                onClick={() => patch(selected.id, { color: c })}
                aria-label={`Warna ${c}`}
                className={`w-7 h-7 rounded-full border-2 ${selected.color === c ? 'border-[#C8F526] scale-110' : 'border-white/20'}`}
                style={{ backgroundColor: COLORS[c] }}
              />
            ))}
          </div>

          {selected.kind === 'text' && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[11px] opacity-75 w-12">Gaya</span>
                <Segmented value={selected.style} options={[['plain', 'Polos'], ['pill', 'Label'], ['outline', 'Garis']]} onPick={(v) => patch(selected.id, { style: v })} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] opacity-75 w-12">Rata</span>
                <Segmented value={selected.align} options={[['left', 'Kiri'], ['center', 'Tengah']]} onPick={(v) => patch(selected.id, { align: v, x: v === 'center' ? 540 : 96 })} />
                <label className="flex items-center gap-1.5 text-[11px] cursor-pointer ml-auto">
                  <input type="checkbox" checked={selected.bold} onChange={(e) => patch(selected.id, { bold: e.target.checked })} className="accent-[#C8F526]" />
                  Tebal
                </label>
              </div>
            </>
          )}

          {selected.kind === 'route' && (
            <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
              <input type="checkbox" checked={selected.markers} onChange={(e) => patch(selected.id, { markers: e.target.checked })} className="accent-[#C8F526]" />
              Titik start & finish
            </label>
          )}

          {selected.kind === 'stats' && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[11px] opacity-75 w-12">Susunan</span>
                <Segmented value={selected.layout} options={[['grid', 'Grid'], ['row', 'Baris'], ['column', 'Kolom']]} onPick={(v) => patch(selected.id, { layout: v })} />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(STAT_LABELS) as StatKey[]).map((k) => (
                  <label key={k} className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                    <input type="checkbox" checked={selected.stats.includes(k)} onChange={() => toggleStat(k)} className="accent-[#C8F526]" />
                    {STAT_LABELS[k].toLowerCase().replace(/^./, (c) => c.toUpperCase())}
                  </label>
                ))}
              </div>
              <p className="text-[10px] opacity-55">Maks {MAX_STATS} statistik. Kalori adalah estimasi dari kecepatan rata-rata dan berat badan.</p>
            </>
          )}

          {selected.kind === 'text' && !selected.bind && (
            <button
              onClick={() => {
                onChange(layers.filter((l) => l.id !== selected.id));
                onSelect(null);
              }}
              className="text-[11px] text-red-300 font-bold"
            >
              Hapus elemen ini
            </button>
          )}
        </div>
      )}

      <button onClick={onReset} className="text-[11px] opacity-60 underline">
        Kembalikan ke template
      </button>
    </div>
  );
}
