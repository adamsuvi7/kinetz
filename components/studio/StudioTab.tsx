'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { AppState, StudioTemplate } from '@/lib/fitsync';
import { renderStudioCanvas } from '@/lib/canvas';
import { loadImageFile } from '@/lib/image';
import { useApp } from '../AppProvider';

const TEMPLATES: { tpl: StudioTemplate; label: string }[] = [
  { tpl: 'gym', label: '🏋️ Gym Volume & PR' },
  { tpl: 'run', label: '🏃 Strava Run GPS' },
  { tpl: 'cycle', label: '🚴 Cycling / Sport' },
  { tpl: 'meal', label: '🍽️ AI Meal & IF' },
  { tpl: 'recomp', label: '📏 Body & Trophy' },
];

export default function StudioTab() {
  const { s, set, toast, openCamera, setBgImage } = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const st = s.studio;
  const setStudio = (patch: Partial<AppState['studio']>) => set((p) => ({ ...p, studio: { ...p.studio, ...patch } }));

  // Redraw once web fonts arrive, otherwise the first render falls back to system fonts.
  useEffect(() => {
    document.fonts.ready.then(() => setFontsReady(true));
  }, []);

  useEffect(() => {
    if (canvasRef.current) renderStudioCanvas(canvasRef.current, s);
  }, [s, fontsReady]);

  const handleGalleryUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setBgImage(await loadImageFile(file), 'Foto berhasil dipasang ke kanvas 9:16!');
    } catch {
      toast('Foto gagal dibaca, coba file lain.');
    }
  };

  const downloadStudioImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `FITSYNC_${st.template}_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast('Gambar IG Story 1080x1920 berhasil diunduh!');
  };

  const shareToInstagramStory = () => {
    canvasRef.current?.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'fitsync-story.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'FitSync Activity Story', text: 'Latihan & Diet hari ini via FitSync!' });
        } catch {
          downloadStudioImage();
        }
      } else {
        downloadStudioImage();
      }
    }, 'image/png');
  };

  return (
    <section className={`space-y-4${s.activeTab === 'studio' ? '' : ' hidden'}`}>
      <div className="surface-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#C8F526] text-[#0E110F]">1080×1920 IG STORY ENGINE</span>
            <h2 className="text-base font-extrabold mt-1">Strava Social Share Studio</h2>
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

        {/* Precision Vertical Offset Slider for Lower 2x2 Metrics Grid */}
        <div className="surface-card-alt p-3 my-2 space-y-2">
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
          <div className="flex items-center justify-between text-[11px] opacity-75 pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={st.transparent} onChange={(e) => setStudio({ transparent: e.target.checked })} className="accent-[#C8F526]" />
              <span>Mode Stiker Transparan (PNG tanpa background)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={st.showBadge} onChange={(e) => setStudio({ showBadge: e.target.checked })} className="accent-[#C8F526]" />
              <span>Tampilkan Badge KOM/Trophy</span>
            </label>
          </div>
        </div>

        {/* Canvas Preview Container: 1080x1920 (9:16) or 1080x1350 (4:5) */}
        <div className="flex justify-center my-3">
          <div className="w-full max-w-[300px] rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-[#090C0A]">
            <canvas ref={canvasRef} width={1080} height={st.ratio === '9:16' ? 1920 : 1350} className="w-full h-auto block"></canvas>
          </div>
        </div>

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

        <div className="grid grid-cols-2 gap-2">
          <button onClick={shareToInstagramStory} className="py-3 rounded-xl text-xs lime-btn flex items-center justify-center gap-1.5">
            <span>📲</span>
            <span>Share ke IG Story</span>
          </button>
          <button
            onClick={downloadStudioImage}
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
