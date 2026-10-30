// Editable IG Story for a GPS ride: a list of draggable layers rendered onto a 1080×1920 (or 1080×1350) canvas.
// Layer coordinates live in a 1080×1920 frame. The 4:5 frame scales the whole layout uniformly (so nothing
// collides), and thumbnails render the same frame into a smaller canvas.
import { drawImageCover, drawRoundRectPath } from './draw';
import {
  cyclingKcal, fitRoute, formatDuration, formatKm, formatRideDate, formatSpeed, rideStats,
  type Ride, type RideStats, type Segments,
} from './ride';

export type Swatch = 'white' | 'lime' | 'orange' | 'black';
export type StatKey = 'distance' | 'moving' | 'avgSpeed' | 'maxSpeed' | 'elevation' | 'calories' | 'elapsed';

type Base = { id: string; x: number; y: number; visible: boolean };
export type TextLayer = Base & {
  kind: 'text';
  text: string;
  /** Empty text falls back to the ride's name / date, so one layout works for every ride. */
  bind?: 'name' | 'date';
  size: number;
  style: 'plain' | 'pill' | 'outline';
  color: Swatch;
  align: 'left' | 'center';
  bold: boolean;
};
export type RouteLayer = Base & { kind: 'route'; size: number; color: Swatch; markers: boolean };
export type StatsLayer = Base & { kind: 'stats'; size: number; stats: StatKey[]; layout: 'grid' | 'row' | 'column'; color: Swatch };
export type BrandLayer = Base & { kind: 'brand'; size: number; color: Swatch };
export type Layer = TextLayer | RouteLayer | StatsLayer | BrandLayer;
export type Box = { x: number; y: number; w: number; h: number };

export const FRAME_W = 1080;
export const FRAME_H = 1920;
export const COLORS: Record<Swatch, string> = { white: '#FFFFFF', lime: '#C8F526', orange: '#FF6A1A', black: '#0E110F' };
const DISPLAY = '"Space Grotesk", sans-serif';
const BODY = '"Plus Jakarta Sans", sans-serif';
const EDGE = 48; // keep text this far from the frame edge
// Instagram draws its own UI over these bands of a 1080×1920 story.
const IG_TOP = 250;
const IG_BOTTOM = 340;

export const STAT_LABELS: Record<StatKey, string> = {
  distance: 'JARAK',
  moving: 'WAKTU BERGERAK',
  avgSpeed: 'KEC. RATA-RATA',
  maxSpeed: 'KEC. MAKS',
  elevation: 'ELEVASI',
  calories: 'KALORI (EST.)',
  elapsed: 'TOTAL WAKTU',
};

const title = (p: Partial<TextLayer> = {}): TextLayer => ({
  id: 'title', kind: 'text', bind: 'name', text: '', x: 540, y: 290, size: 84, style: 'plain', color: 'white', align: 'center', bold: true, visible: true, ...p,
});
const date = (p: Partial<TextLayer> = {}): TextLayer => ({
  id: 'date', kind: 'text', bind: 'date', text: '', x: 540, y: 396, size: 32, style: 'plain', color: 'white', align: 'center', bold: false, visible: true, ...p,
});
const brand = (p: Partial<BrandLayer> = {}): BrandLayer => ({ id: 'brand', kind: 'brand', x: 540, y: 1530, size: 30, color: 'white', visible: true, ...p });

export type RideTemplate = { id: string; name: string; hint: string; transparent: boolean; layers: Layer[] };

/** Ready-made cycling layouts; every value is filled from the selected ride, then fully editable. */
export const RIDE_TEMPLATES: RideTemplate[] = [
  {
    id: 'klasik',
    name: 'Klasik',
    hint: 'Judul, rute, 4 statistik',
    transparent: false,
    layers: [
      title(),
      date(),
      { id: 'route', kind: 'route', x: 540, y: 830, size: 660, color: 'lime', markers: true, visible: true },
      { id: 'stats', kind: 'stats', x: 120, y: 1210, size: 1, stats: ['distance', 'moving', 'avgSpeed', 'elevation'], layout: 'grid', color: 'white', visible: true },
      brand(),
    ],
  },
  {
    id: 'rute',
    name: 'Rute Besar',
    hint: 'Rute memenuhi layar',
    transparent: false,
    layers: [
      title({ x: 96, y: 290, size: 64, align: 'left' }),
      date({ x: 96, y: 374, size: 28, align: 'left' }),
      { id: 'route', kind: 'route', x: 540, y: 860, size: 900, color: 'lime', markers: true, visible: true },
      { id: 'stats', kind: 'stats', x: 96, y: 1350, size: 1.05, stats: ['distance', 'moving', 'avgSpeed'], layout: 'row', color: 'white', visible: true },
      brand(),
    ],
  },
  {
    id: 'angka',
    name: 'Angka Besar',
    hint: 'Jarak jadi pusat perhatian',
    transparent: false,
    layers: [
      title({ y: 300, size: 56 }),
      date({ y: 376, size: 28 }),
      { id: 'route', kind: 'route', x: 540, y: 700, size: 520, color: 'lime', markers: true, visible: true },
      { id: 'hero', kind: 'stats', x: 150, y: 1010, size: 2, stats: ['distance'], layout: 'column', color: 'lime', visible: true },
      { id: 'stats', kind: 'stats', x: 150, y: 1310, size: 0.85, stats: ['moving', 'avgSpeed', 'elevation'], layout: 'row', color: 'white', visible: true },
      brand(),
    ],
  },
  {
    id: 'event',
    name: 'Event Komunitas',
    hint: 'Label event + hashtag',
    transparent: false,
    layers: [
      { id: 'event', kind: 'text', text: 'CRITICAL MASS', x: 540, y: 290, size: 44, style: 'pill', color: 'lime', align: 'center', bold: true, visible: true },
      title({ y: 400, size: 72 }),
      date({ y: 494, size: 30 }),
      { id: 'route', kind: 'route', x: 540, y: 930, size: 600, color: 'lime', markers: true, visible: true },
      { id: 'stats', kind: 'stats', x: 120, y: 1300, size: 1, stats: ['distance', 'moving', 'avgSpeed'], layout: 'row', color: 'white', visible: true },
      { id: 'tag', kind: 'text', text: '#CriticalMass', x: 540, y: 1490, size: 34, style: 'plain', color: 'white', align: 'center', bold: false, visible: true },
      brand({ visible: false }),
    ],
  },
  {
    id: 'foto',
    name: 'Foto Latar',
    hint: 'Atas bersih untuk fotomu',
    transparent: false,
    layers: [
      { id: 'route', kind: 'route', x: 840, y: 470, size: 300, color: 'white', markers: true, visible: true },
      title({ x: 96, y: 1060, size: 72, align: 'left' }),
      date({ x: 96, y: 1150, size: 28, align: 'left' }),
      { id: 'stats', kind: 'stats', x: 96, y: 1240, size: 1, stats: ['distance', 'moving', 'avgSpeed', 'elevation'], layout: 'row', color: 'white', visible: true },
      brand(),
    ],
  },
  {
    id: 'stiker',
    name: 'Stiker',
    hint: 'PNG transparan, tempel di IG',
    transparent: true,
    layers: [
      title({ visible: false }),
      date({ visible: false }),
      { id: 'route', kind: 'route', x: 540, y: 760, size: 560, color: 'lime', markers: true, visible: true },
      { id: 'stats', kind: 'stats', x: 204, y: 1100, size: 0.8, stats: ['distance', 'moving', 'avgSpeed', 'elevation'], layout: 'grid', color: 'white', visible: true },
      brand({ y: 1420 }),
    ],
  },
];

export const DEFAULT_LAYERS = RIDE_TEMPLATES[0].layers;

export function statValue(key: StatKey, s: RideStats, weightKg: number): { value: string; unit: string } {
  switch (key) {
    case 'distance': return { value: formatKm(s.distanceM), unit: 'km' };
    case 'moving': return { value: formatDuration(s.movingSec), unit: '' };
    case 'elapsed': return { value: formatDuration(s.elapsedSec), unit: '' };
    case 'avgSpeed': return { value: formatSpeed(s.avgKmh), unit: 'km/jam' };
    case 'maxSpeed': return { value: formatSpeed(s.maxKmh), unit: 'km/jam' };
    case 'elevation': return { value: Math.round(s.elevGainM).toLocaleString('id-ID'), unit: 'm' };
    case 'calories': return { value: Math.round(cyclingKcal(s, weightKg)).toLocaleString('id-ID'), unit: 'kkal' };
  }
}

export function drawRoute(ctx: CanvasRenderingContext2D, segments: Segments, box: Box, color: string, lineWidth: number, markers: boolean) {
  const segs = fitRoute(segments, box.x, box.y, box.w, box.h).filter((s) => s.length > 0);
  if (segs.length === 0) return false;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = lineWidth * 2;
  // Pauses split segments; joining them keeps the line continuous like the real path ridden.
  ctx.beginPath();
  segs.flat().forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  if (markers) {
    const start = segs[0][0];
    const lastSeg = segs[segs.length - 1];
    const end = lastSeg[lastSeg.length - 1];
    ctx.shadowBlur = 0;
    ctx.lineWidth = lineWidth * 0.45;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#0E110F';
    ctx.beginPath(); ctx.arc(start.x, start.y, lineWidth * 1.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = color;
    ctx.strokeStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(end.x, end.y, lineWidth * 1.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  return true;
}

function textFor(layer: TextLayer, ride: Ride | null, guides: boolean) {
  if (layer.text.trim()) return layer.text;
  // Placeholders only guide the editor; they must never end up in an exported image.
  if (!ride) return guides ? (layer.bind === 'date' ? 'Tanggal ride' : layer.bind === 'name' ? 'Nama ride' : '') : '';
  return layer.bind === 'name' ? ride.name : layer.bind === 'date' ? formatRideDate(ride.startedAt) : '';
}

function drawText(ctx: CanvasRenderingContext2D, layer: TextLayer, text: string): Box {
  const color = COLORS[layer.color];
  const font = (size: number) => `${layer.bold ? 800 : 600} ${size}px ${layer.bold ? DISPLAY : BODY}`;
  const padRatio = layer.style === 'plain' ? 0 : 0.6;
  // Shrink long text (e.g. a long ride name) so it never runs off the frame.
  const maxW = layer.align === 'center' ? FRAME_W - EDGE * 2 : FRAME_W - Math.max(layer.x, 0) - EDGE;
  ctx.font = font(layer.size);
  const natural = ctx.measureText(text).width + layer.size * padRatio * 2;
  const size = natural > maxW ? Math.max(14, (layer.size * maxW) / natural) : layer.size;

  ctx.font = font(size);
  ctx.textBaseline = 'top';
  const tw = ctx.measureText(text).width;
  const padX = size * padRatio;
  const padY = layer.style === 'plain' ? 0 : size * 0.32;
  const w = tw + padX * 2;
  const h = size * 1.15 + padY * 2;
  const left = layer.align === 'center' ? layer.x - w / 2 : layer.x;
  const y = layer.y;

  if (layer.style === 'pill') {
    ctx.fillStyle = color;
    drawRoundRectPath(ctx, left, y, w, h, h / 2);
    ctx.fill();
  } else if (layer.style === 'outline') {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, size * 0.07);
    drawRoundRectPath(ctx, left, y, w, h, h / 2);
    ctx.stroke();
  }

  ctx.save();
  if (layer.style === 'pill') ctx.fillStyle = layer.color === 'black' ? '#FFFFFF' : '#0E110F';
  else {
    ctx.fillStyle = color;
    ctx.globalAlpha = layer.bold ? 1 : 0.85;
    // Soft shadow keeps plain text readable on bright photos.
    if (layer.style === 'plain' && layer.color !== 'black') { ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'; ctx.shadowBlur = size * 0.25; }
  }
  ctx.fillText(text, left + padX, y + padY + size * 0.08);
  ctx.restore();
  return { x: left, y, w, h };
}

function drawStats(ctx: CanvasRenderingContext2D, layer: StatsLayer, stats: RideStats, weightKg: number): Box {
  const s = layer.size;
  const n = layer.stats.length;
  const cols = layer.layout === 'grid' ? Math.min(2, n) : layer.layout === 'row' ? n : 1;
  // Never let a block run past the right edge of the frame, wherever it was dragged.
  const width = Math.min(840 * s, FRAME_W - EDGE - layer.x);
  const colW = width / Math.max(cols, 1);
  const rowH = (layer.layout === 'column' ? 150 : 175) * s;
  const color = COLORS[layer.color];
  const muted = layer.color === 'black' ? 'rgba(14, 17, 15, 0.7)' : 'rgba(255, 255, 255, 0.72)';
  let right = 0;

  ctx.save();
  ctx.textBaseline = 'top';
  ctx.shadowColor = layer.color === 'black' ? 'transparent' : 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 14 * s;
  layer.stats.forEach((key, i) => {
    const cx = layer.x + (i % cols) * colW;
    const cy = layer.y + Math.floor(i / cols) * rowH;
    const { value, unit } = statValue(key, stats, weightKg);
    const maxW = colW - 16 * s; // shrink text that would run into the next column

    ctx.font = `700 ${24 * s}px ${BODY}`;
    const labelSize = 24 * s * Math.min(1, maxW / ctx.measureText(STAT_LABELS[key]).width);
    ctx.font = `700 ${labelSize}px ${BODY}`;
    ctx.fillStyle = muted;
    ctx.fillText(STAT_LABELS[key], cx, cy);
    const labelW = ctx.measureText(STAT_LABELS[key]).width;

    const measure = (size: number) => {
      ctx.font = `800 ${size}px ${DISPLAY}`;
      const vw = ctx.measureText(value).width;
      ctx.font = `700 ${size * 0.42}px ${DISPLAY}`;
      return vw + (unit ? 10 * s + ctx.measureText(unit).width : 0);
    };
    const vs = 72 * s * Math.min(1, maxW / measure(72 * s));
    const valueW = measure(vs);
    ctx.fillStyle = color;
    ctx.font = `800 ${vs}px ${DISPLAY}`;
    ctx.fillText(value, cx, cy + 34 * s);
    if (unit) {
      const vw = ctx.measureText(value).width;
      ctx.font = `700 ${vs * 0.42}px ${DISPLAY}`;
      ctx.fillText(unit, cx + vw + 10 * s, cy + 34 * s + vs * 0.5);
    }
    right = Math.max(right, cx + Math.max(labelW, valueW) - layer.x);
  });
  ctx.restore();
  return { x: layer.x, y: layer.y, w: right, h: Math.ceil(n / Math.max(cols, 1)) * rowH };
}

function drawBrand(ctx: CanvasRenderingContext2D, layer: BrandLayer): Box {
  ctx.save();
  ctx.font = `800 ${layer.size}px ${DISPLAY}`;
  ctx.textBaseline = 'top';
  ctx.letterSpacing = `${layer.size * 0.28}px`;
  const w = ctx.measureText('KINETZ').width;
  ctx.fillStyle = COLORS[layer.color];
  ctx.globalAlpha = 0.9;
  ctx.fillText('KINETZ', layer.x - w / 2, layer.y);
  ctx.restore();
  return { x: layer.x - w / 2, y: layer.y, w, h: layer.size * 1.2 };
}

export type RideStoryOptions = {
  ride: Ride | null;
  layers: Layer[];
  weightKg: number;
  bgImage: HTMLImageElement | null;
  transparent: boolean;
  guides: boolean;
  selectedId: string | null;
};

/** Layout units per canvas pixel for a 1080-wide canvas of the given height (1 for 9:16, 1350/1920 for 4:5). */
export const frameScale = (canvasHeight: number) => canvasHeight / FRAME_H;

/** Renders the story and returns each visible layer's bounding box (in 1080-wide canvas px) for hit-testing. */
export function renderRideStory(canvas: HTMLCanvasElement, o: RideStoryOptions): Record<string, Box> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return {};
  const px = canvas.width / FRAME_W; // < 1 for thumbnails
  const w = FRAME_W;
  const h = canvas.height / px;
  const k = frameScale(h);
  const ox = (FRAME_W * (1 - k)) / 2;
  const boxes: Record<string, Box> = {};
  const stats = o.ride ? rideStats(o.ride.segments) : null;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(px, 0, 0, px, 0, 0);

  if (!o.transparent) {
    if (o.bgImage) {
      drawImageCover(ctx, o.bgImage, w, h);
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(8, 10, 9, 0.45)');
      g.addColorStop(0.35, 'rgba(8, 10, 9, 0.1)');
      g.addColorStop(0.6, 'rgba(8, 10, 9, 0.35)');
      g.addColorStop(1, 'rgba(8, 10, 9, 0.85)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    } else {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#0E1511');
      g.addColorStop(0.5, '#121D16');
      g.addColorStop(1, '#090D0A');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // Layers are drawn in frame units; for 4:5 the frame is shrunk and centered horizontally.
  ctx.setTransform(px * k, 0, 0, px * k, px * ox, 0);
  for (const layer of o.layers) {
    if (!layer.visible) continue;
    let b: Box | undefined;
    if (layer.kind === 'text') {
      const text = textFor(layer, o.ride, o.guides);
      if (text) b = drawText(ctx, layer, text);
    } else if (layer.kind === 'route') {
      const box = { x: layer.x - layer.size / 2, y: layer.y - layer.size / 2, w: layer.size, h: layer.size };
      const drawn = o.ride && drawRoute(ctx, o.ride.segments, box, COLORS[layer.color], Math.max(6, layer.size * 0.016), layer.markers);
      if (!drawn && o.guides) {
        ctx.save();
        ctx.setLineDash([18, 14]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.w, box.h);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.font = `600 30px ${BODY}`;
        ctx.textAlign = 'center';
        ctx.fillText('Rute GPS tampil di sini', layer.x, layer.y);
        ctx.restore();
      }
      if (drawn || o.guides) b = box;
    } else if (layer.kind === 'stats') {
      if (stats && layer.stats.length) b = drawStats(ctx, layer, stats, o.weightKg);
    } else {
      b = drawBrand(ctx, layer);
    }
    if (b) boxes[layer.id] = { x: ox + b.x * k, y: b.y * k, w: b.w * k, h: b.h * k };
  }

  ctx.setTransform(px, 0, 0, px, 0, 0);
  if (o.guides) {
    ctx.save();
    if (h === FRAME_H) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.fillRect(0, 0, w, IG_TOP);
      ctx.fillRect(0, h - IG_BOTTOM, w, IG_BOTTOM);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.font = `600 26px ${BODY}`;
      ctx.textAlign = 'center';
      ctx.fillText('Tertutup profil Instagram', w / 2, IG_TOP - 30);
      ctx.fillText('Tertutup kolom balas Instagram', w / 2, h - IG_BOTTOM + 52);
    }
    const sel = o.selectedId ? boxes[o.selectedId] : undefined;
    if (sel) {
      ctx.setLineDash([16, 10]);
      ctx.strokeStyle = '#C8F526';
      ctx.lineWidth = 4;
      ctx.strokeRect(sel.x - 14, sel.y - 14, sel.w + 28, sel.h + 28);
    }
    ctx.restore();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return boxes;
}
