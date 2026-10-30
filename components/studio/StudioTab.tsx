'use client';

import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent } from 'react';
import { last, type AppState, type StudioTemplate } from '@/lib/state';
import { renderStudioCanvas } from '@/lib/canvas';
import { loadImageFile } from '@/lib/image';
import { downloadCanvas, shareCanvas } from '@/lib/share';
import { RIDE_TEMPLATES, frameScale, renderRideStory, type Box, type Layer, type RideTemplate } from '@/lib/story';
import { useApp } from '../AppProvider';
import RideStoryEditor from './RideStoryEditor';
import TemplateGallery from './TemplateGallery';

const TEMPLATES: { tpl: StudioTemplate; label: string }[] = [
  { tpl: 'ride', label: '🚴 Ride GPS' },
  { tpl: 'gym', label: '🏋️ Gym Volume & PR' },
  { tpl: 'run', label: '🏃 Lari' },
  { tpl: 'cycle', label: '🎾 Multi-Sport' },
  { tpl: 'meal', label: '🍽️ AI Meal & IF' },
  { tpl: 'recomp', label: '📏 Body & Trophy' },
];

export default function StudioTab() {
  const { s, set, toast, openCamera, setBgImage } = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const st = s.studio;
  const isRide = st.template === 'ride';
  const setStudio = (patch: Partial<AppState['studio']>) => set((p) => ({ ...p, studio: { ...p.studio, ...patch } }));

  // Story layout is edited locally (drag = many updates) and synced to app state once it settles.
  const [layers, setLayers] = useState<Layer[]>(st.rideLayers);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const boxesRef = useRef<Record<string, Box>>({});
  const dragRef = useRef<{ id: string; px: number; py: number; x: number; y: number; box: Box } | null>(null);
  const ride = s.rides.find((r) => r.id === st.rideId) ?? s.rides[0] ?? null;
  const weightKg = last(s.bodyHistory.weight) || 72;

  useEffect(() => {
    const t = setTimeout(() => set((p) => (p.studio.rideLayers === layers ? p : { ...p, studio: { ...p.studio, rideLayers: layers } })), 300);
    return () => clearTimeout(t);
  }, [layers, set]);

  // Redraw once web fonts arrive, otherwise the first render falls back to system fonts.
  useEffect(() => {
    document.fonts.ready.then(() => setFontsReady(true));
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    if (isRide) {
      boxesRef.current = renderRideStory(c, { ride, layers, weightKg, bgImage: st.bgImage, transparent: st.transparent, guides: true, selectedId });
    } else {
      renderStudioCanvas(c, s);
    }
  }, [s, fontsReady, isRide, ride, layers, weightKg, selectedId, st.bgImage, st.transparent]);

  const toCanvas = (e: PointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * c.width) / r.width, y: ((e.clientY - r.top) * c.height) / r.height };
  };

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!isRide) return;
    const p = toCanvas(e);
    const pad = 24;
    const hit = [...layers].reverse().find((l) => {
      const b = boxesRef.current[l.id];
      return l.visible && b && p.x >= b.x - pad && p.x <= b.x + b.w + pad && p.y >= b.y - pad && p.y <= b.y + b.h + pad;
    });
    setSelectedId(hit?.id ?? null);
    if (!hit) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { id: hit.id, px: p.x, py: p.y, x: hit.x, y: hit.y, box: boxesRef.current[hit.id] };
  };

  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const c = e.currentTarget;
    const p = toCanvas(e);
    const k = frameScale(c.height);
    // Keep the layer's whole box inside the story so it can't be dragged off and lost.
    const clamp = (delta: number, lo: number, hi: number) => Math.min(Math.max(delta, Math.min(lo, hi)), Math.max(lo, hi));
    const dx = clamp(p.x - d.px, -d.box.x, c.width - d.box.x - d.box.w);
    const dy = clamp(p.y - d.py, -d.box.y, c.height - d.box.y - d.box.h);
    setLayers((ls) => ls.map((l) => (l.id === d.id ? { ...l, x: Math.round(d.x + dx / k), y: Math.round(d.y + dy / k) } : l)));
  };

  const endDrag = () => (dragRef.current = null);

  const applyTemplate = (t: RideTemplate) => {
    const current = RIDE_TEMPLATES.find((x) => x.id === st.rideTemplate);
    const edited = !current || JSON.stringify(current.layers) !== JSON.stringify(layers);
    if (edited && !window.confirm(`Pakai template "${t.name}"? Perubahan tata letak saat ini akan diganti.`)) return;
    setLayers(structuredClone(t.layers));
    setSelectedId(null);
    setStudio({ rideTemplate: t.id, transparent: t.transparent });
  };

  // Exports never include the editor guides or the selection outline.
  const exportCanvas = () => {
    const c = canvasRef.current!;
    if (!isRide) return c;
    const out = document.createElement('canvas');
    out.width = c.width;
    out.height = c.height;
    renderRideStory(out, { ride, layers, weightKg, bgImage: st.bgImage, transparent: st.transparent, guides: false, selectedId: null });
    return out;
  };

  const filename = () => `KINETZ_${st.template}_${Date.now()}.png`;

  const handleGalleryUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setBgImage(await loadImageFile(file), 'Foto berhasil dipasang ke kanvas story!');
    } catch {
      toast('Foto gagal dibaca, coba file lain.');
    }
  };

  const download = async () => {
    const r = await downloadCanvas(exportCanvas(), filename());
    if (r === 'downloaded') toast(`Gambar ${st.ratio === '9:16' ? '1080x1920' : '1080x1350'} berhasil diunduh!`);
  };

  const share = async () => {
    const r = await shareCanvas(exportCanvas(), filename());
    if (r === 'downloaded') toast('Berbagi tidak didukung di perangkat ini, gambar diunduh.');
  };

  return (
    <section className={`space-y-4${s.activeTab === 'studio' ? '' : ' hidden'}`}>
      <div className="surface-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#C8F526] text-[#0E110F]">
              {st.ratio === '9:16' ? '1080×1920 IG STORY' : '1080×1350 IG FEED'}
            </span>
            <h2 className="text-base font-extrabold mt-1">Story Studio</h2>
          </div>
          <div className="flex gap-1">
            {(['9:16', '4:5'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setStudio({ ratio: r })}
                className={`px-2.5 py-1 rounded-lg text-[11px] ${st.ratio === r ? 'lime-btn' : 'surface-card-alt font-bold'}`}
              >
                {r === '9:16' ? '9:16 Story' : '4:5 Feed'}
              </button>
            ))}
          </div>
        </div>

        {/* Template Selector Pills */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 my-1">
          {TEMPLATES.map(({ tpl, label }) => (
            <button
              key={tpl}
              onClick={() => setStudio({ template: tpl })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${st.template === tpl ? 'lime-btn' : 'surface-card-alt'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="surface-card-alt p-3 my-2 space-y-2">
          {!isRide && (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold">📐 Posisi Vertikal Blok Metrik Bawah:</span>
                <span className="font-display font-bold text-[#C8F526]">Lower Safe-Zone (Presisi)</span>
              </div>
              <input
                type="range"
                min="-140"
                max="90"
                step="5"
                value={st.hudOffsetY}
                onChange={(e) => setStudio({ hudOffsetY: parseInt(e.target.value, 10) || 0 })}
                className="w-full accent-[#C8F526]"
              />
            </>
          )}
          <div className="flex items-center justify-between gap-3 text-[11px] opacity-75 pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={st.transparent} onChange={(e) => setStudio({ transparent: e.target.checked })} className="accent-[#C8F526]" />
              <span>Stiker transparan (PNG tanpa background)</span>
            </label>
            {!isRide && (
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={st.showBadge} onChange={(e) => setStudio({ showBadge: e.target.checked })} className="accent-[#C8F526]" />
                <span>Badge Local Legend</span>
              </label>
            )}
          </div>
        </div>

        {isRide && (
          <TemplateGallery activeId={st.rideTemplate} onPick={applyTemplate} ride={ride} weightKg={weightKg} bgImage={st.bgImage} fontsReady={fontsReady} />
        )}

        {/* Canvas Preview: 1080x1920 (9:16) or 1080x1350 (4:5) */}
        <div className="flex justify-center my-3">
          <div
            className="w-full max-w-[300px] rounded-2xl overflow-hidden border border-white/15 shadow-2xl"
            style={st.transparent ? { backgroundImage: 'repeating-conic-gradient(#2a2f2c 0% 25%, #1b1f1d 0% 50%)', backgroundSize: '20px 20px' } : { backgroundColor: '#090C0A' }}
          >
            <canvas
              ref={canvasRef}
              width={1080}
              height={st.ratio === '9:16' ? 1920 : 1350}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              // Page scroll stays available until a layer is selected; then the canvas owns the touch for dragging.
              className={`w-full h-auto block${isRide ? (selectedId ? ' touch-none cursor-move' : ' touch-pan-y cursor-pointer') : ''}`}
            ></canvas>
          </div>
        </div>
        {isRide && <p className="text-center text-[10px] opacity-55 -mt-1 mb-3">Ketuk elemen untuk memilih, lalu seret untuk memindahkan.</p>}

        {isRide && (
          <div className="mb-3">
            <RideStoryEditor
              layers={layers}
              onChange={setLayers}
              selectedId={selectedId}
              onSelect={setSelectedId}
              rides={s.rides}
              ride={ride}
              onPickRide={(id) => setStudio({ rideId: id })}
              onReset={() => applyTemplate(RIDE_TEMPLATES.find((t) => t.id === st.rideTemplate) ?? RIDE_TEMPLATES[0])}
            />
          </div>
        )}

        {/* Camera / Upload / Export Controls */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button
            onClick={() => openCamera('studio')}
            className="py-2.5 rounded-xl text-xs surface-card-alt font-bold flex items-center justify-center gap-1.5 border border-[#C8F526]/40"
          >
            <span>📷</span>
            <span>Foto Kamera HP</span>
          </button>
          <label className="py-2.5 rounded-xl text-xs surface-card-alt font-bold flex items-center justify-center gap-1.5 cursor-pointer">
            <span>🖼️</span>
            <span>Pilih Foto Galeri</span>
            <input type="file" accept="image/*" onChange={handleGalleryUpload} className="hidden" />
          </label>
        </div>
        {st.bgImage && (
          <button onClick={() => setStudio({ bgImage: null })} className="w-full mb-2 text-[11px] opacity-60 underline">
            Hapus foto latar
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button onClick={share} className="py-3 rounded-xl text-xs lime-btn flex items-center justify-center gap-1.5">
            <span>📲</span>
            <span>Share ke IG Story</span>
          </button>
          <button
            onClick={download}
            className="py-3 rounded-xl text-xs surface-card-alt font-extrabold flex items-center justify-center gap-1.5 border border-white/15"
          >
            <span>⬇️</span>
            <span>Unduh Resolusi Penuh</span>
          </button>
        </div>
      </div>
    </section>
  );
}
