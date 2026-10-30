'use client';

import { useEffect, useRef } from 'react';
import type { Ride } from '@/lib/ride';
import { RIDE_TEMPLATES, renderRideStory, type RideTemplate } from '@/lib/story';

type Props = {
  activeId: string;
  onPick: (t: RideTemplate) => void;
  ride: Ride | null;
  weightKg: number;
  bgImage: HTMLImageElement | null;
  fontsReady: boolean;
};

/** Live previews of every cycling template, filled with the selected ride's real data. */
export default function TemplateGallery({ activeId, onPick, ride, weightKg, bgImage, fontsReady }: Props) {
  const refs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    RIDE_TEMPLATES.forEach((t, i) => {
      const c = refs.current[i];
      if (c) renderRideStory(c, { ride, layers: t.layers, weightKg, bgImage, transparent: t.transparent, guides: false, selectedId: null });
    });
  }, [ride, weightKg, bgImage, fontsReady]);

  return (
    <div className="my-2">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs font-bold">Template Otomatis</span>
        <span className="text-[10px] opacity-60">Terisi dari data ride, lalu bisa diedit</span>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {RIDE_TEMPLATES.map((t, i) => (
          <button key={t.id} onClick={() => onPick(t)} className="shrink-0 w-[84px] text-left" aria-pressed={t.id === activeId}>
            <div
              className={`rounded-xl overflow-hidden border-2 ${t.id === activeId ? 'border-[#C8F526]' : 'border-transparent'}`}
              style={t.transparent ? { backgroundImage: 'repeating-conic-gradient(#2a2f2c 0% 25%, #1b1f1d 0% 50%)', backgroundSize: '10px 10px' } : undefined}
            >
              <canvas
                ref={(el) => {
                  refs.current[i] = el;
                }}
                width={162}
                height={288}
                className="w-full h-auto block"
              />
            </div>
            <div className="text-[10px] font-extrabold mt-1 truncate">{t.name}</div>
            <div className="text-[9px] opacity-60 leading-tight line-clamp-2">{t.hint}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
