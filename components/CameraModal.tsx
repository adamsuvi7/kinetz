'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { loadImageFile } from '@/lib/image';
import { useApp } from './AppProvider';

export default function CameraModal() {
  const { camera, closeCamera, toast, setBgImage, analyzeFood } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [mirror, setMirror] = useState(false);

  // WebRTC stream lives only while the modal is open; reopened on front/back switch.
  useEffect(() => {
    const video = videoRef.current;
    if (!camera || !video) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    Promise.resolve()
      .then(() =>
        navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1080 }, height: { ideal: 1920 } },
          audio: false,
        }),
      )
      .then((st) => {
        if (cancelled) return st.getTracks().forEach((t) => t.stop());
        stream = st;
        video.srcObject = st;
      })
      .catch(() => toast('Mengalihkan ke pemilih kamera native HP...'));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    };
  }, [camera, facing, toast]);

  const applyImage = (img: HTMLImageElement | HTMLCanvasElement, msg: string) => {
    const mode = camera;
    closeCamera();
    if (mode === 'food') return analyzeFood(img);
    if (img instanceof HTMLImageElement) return setBgImage(img, msg);
    const out = new Image();
    out.onload = () => setBgImage(out, msg);
    out.src = img.toDataURL('image/png');
  };

  const captureLivePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      toast('Silakan pilih foto dari tombol Kamera Native di bawah.');
      return;
    }
    const c = document.createElement('canvas');
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    const ctx = c.getContext('2d')!;
    if (mirror) {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    applyImage(c, 'Foto kamera berhasil ditangkap ke Studio IG 9:16!');
  };

  const handleNativePicker = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return closeCamera();
    try {
      applyImage(await loadImageFile(file), 'Foto berhasil dipasang ke kanvas 9:16!');
    } catch {
      closeCamera();
      toast('Foto gagal dibaca, coba file lain.');
    }
  };

  return (
    <div className={`fixed inset-0 z-50 bg-black/90 backdrop-blur-md ${camera ? 'flex' : 'hidden'} flex-col items-center justify-center p-4`}>
      <div className="w-full max-w-sm surface-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold">📷 In-App Camera (9:16 IG Story)</h3>
            <p className="text-[11px] opacity-65">Ambil foto langsung dari kamera HP kamu</p>
          </div>
          <button onClick={closeCamera} className="px-2.5 py-1 rounded-lg surface-card-alt text-xs font-bold">
            ✕
          </button>
        </div>

        <div className="relative w-full aspect-[9/16] max-h-[58vh] bg-black rounded-2xl overflow-hidden border border-white/15 mx-auto">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: mirror ? 'scaleX(-1)' : 'scaleX(1)' }}
          ></video>
          {/* 9:16 Safe Zone Guide Overlay */}
          <div className="absolute inset-4 border border-dashed border-[#C8F526]/45 rounded-xl pointer-events-none flex flex-col justify-between p-3">
            <span className="text-[10px] font-bold text-[#C8F526] bg-black/60 px-2 py-0.5 rounded self-start">KINETZ 9:16 GUIDE</span>
            <span className="text-[10px] font-bold text-white/80 bg-black/60 px-2 py-0.5 rounded self-center">Area Presisi Metrik Bawah</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
            className="px-3 py-2.5 rounded-xl text-xs surface-card-alt font-bold"
          >
            🔄 Putar Kamera
          </button>
          <button onClick={captureLivePhoto} className="flex-1 py-2.5 rounded-xl text-xs lime-btn">
            📸 Jepret Foto
          </button>
          <button onClick={() => setMirror((m) => !m)} className="px-3 py-2.5 rounded-xl text-xs surface-card-alt font-bold">
            🪞 Mirror
          </button>
        </div>

        <label className="block text-center text-[11px] opacity-75 underline cursor-pointer pt-1">
          Atau gunakan Kamera Native HP / File Picker
          <input type="file" accept="image/*" capture="environment" onChange={handleNativePicker} className="hidden" />
        </label>
      </div>
    </div>
  );
}
