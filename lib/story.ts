// Editable IG Story for a GPS ride: a list of draggable layers rendered onto a 1080×1920 (or 1080×1350) canvas.
// Layer coordinates are stored for a 1920px-tall frame; the 4:5 frame maps y proportionally.
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

export const FRAME_H = 1920;
export const COLORS: Record<Swatch, string> = { white: '#FFFFFF', lime: '#C8F526', orange: '#FF6A1A', black: '#0E110F' };
const DISPLAY = '"Space Grotesk", sans-serif';
const BODY = '"Plus Jakarta Sans", sans-serif';
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

export const DEFAULT_LAYERS: Layer[] = [
  { id: 'title', kind: 'text', bind: 'name', text: '', x: 540, y: 290, size: 84, style: 'plain', color: 'white', align: 'center', bold: true, visible: true },
  { id: 'date', kind: 'text', bind: 'date', text: '', x: 540, y: 396, size: 32, style: 'plain', color: 'white', align: 'center', bold: false, visible: true },
  { id: 'route', kind: 'route', x: 540, y: 830, size: 660, color: 'lime', markers: true, visible: true },
  { id: 'stats', kind: 'stats', x: 120, y: 1210, size: 1, stats: ['distance', 'moving', 'avgSpeed', 'elevation'], layout: 'grid', color: 'white', visible: true },
  { id: 'brand', kind: 'brand', x: 540, y: 1530, size: 30, color: 'white', visible: true },
];

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

function textFor(layer: TextLayer, ride: Ride | null) {
  if (layer.text.trim()) return layer.text;
  if (!ride) return layer.bind === 'date' ? 'Tanggal ride' : layer.bind === 'name' ? 'Nama ride' : '';
  return layer.bind === 'name' ? ride.name : layer.bind === 'date' ? formatRideDate(ride.startedAt) : '';
}

function drawText(ctx: CanvasRenderingContext2D, layer: TextLayer, text: string, y: number): Box {
  const color = COLORS[layer.color];
  ctx.font = `${layer.bold ? 800 : 600} ${layer.size}px ${layer.bold ? DISPLAY : BODY}`;
  ctx.textBaseline = 'top';
  const tw = ctx.measureText(text).width;
  const padX = layer.style === 'plain' ? 0 : layer.size * 0.6;
  const padY = layer.style === 'plain' ? 0 : layer.size * 0.32;
  const w = tw + padX * 2;
  const h = layer.size * 1.15 + padY * 2;
  const left = layer.align === 'center' ? layer.x - w / 2 : layer.x;

  if (layer.style === 'pill') {
    ctx.fillStyle = color;
    drawRoundRectPath(ctx, left, y, w, h, h / 2);
    ctx.fill();
  } else if (layer.style === 'outline') {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, layer.size * 0.07);
    drawRoundRectPath(ctx, left, y, w, h, h / 2);
    ctx.stroke();
  }

  ctx.save();
  if (layer.style === 'pill') ctx.fillStyle = layer.color === 'black' ? '#FFFFFF' : '#0E110F';
  else {
    ctx.fillStyle = color;
    ctx.globalAlpha = layer.bold ? 1 : 0.85;
    // Soft shadow keeps plain text readable on bright photos.
    if (layer.style === 'plain') { ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'; ctx.shadowBlur = layer.size * 0.25; }
  }
  ctx.fillText(text, left + padX, y + padY + layer.size * 0.08);
  ctx.restore();
  return { x: left, y, w, h };
}

function drawStats(ctx: CanvasRenderingContext2D, layer: StatsLayer, stats: RideStats, weightKg: number, y: number): Box {
  const s = layer.size;
  const width = 840 * s;
  const n = layer.stats.length;
  const cols = layer.layout === 'grid' ? Math.min(2, n) : layer.layout === 'row' ? n : 1;
  const colW = width / Math.max(cols, 1);
  const rowH = (layer.layout === 'column' ? 150 : 175) * s;
  const valueSize = 72 * s;
  const color = COLORS[layer.color];
  const muted = layer.color === 'black' ? 'rgba(14, 17, 15, 0.7)' : 'rgba(255, 255, 255, 0.72)';

  ctx.save();
  ctx.textBaseline = 'top';
  ctx.shadowColor = layer.color === 'black' ? 'transparent' : 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 14 * s;
  layer.stats.forEach((key, i) => {
    const cx = layer.x + (i % cols) * colW;
    const cy = y + Math.floor(i / cols) * rowH;
    const { value, unit } = statValue(key, stats, weightKg);
    const maxW = colW - 16 * s; // shrink text that would run into the next column

    ctx.font = `700 ${24 * s}px ${BODY}`;
    const labelSize = 24 * s * Math.min(1, maxW / ctx.measureText(STAT_LABELS[key]).width);
    ctx.font = `700 ${labelSize}px ${BODY}`;
    ctx.fillStyle = muted;
    ctx.fillText(STAT_LABELS[key], cx, cy);

    const measure = (size: number) => {
      ctx.font = `800 ${size}px ${DISPLAY}`;
      const vw = ctx.measureText(value).width;
      ctx.font = `700 ${size * 0.42}px ${DISPLAY}`;
      return vw + (unit ? 10 * s + ctx.measureText(unit).width : 0);
    };
    const vs = valueSize * Math.min(1, maxW / measure(valueSize));
    ctx.fillStyle = color;
    ctx.font = `800 ${vs}px ${DISPLAY}`;
    ctx.fillText(value, cx, cy + 34 * s);
    if (unit) {
      const vw = ctx.measureText(value).width;
      ctx.font = `700 ${vs * 0.42}px ${DISPLAY}`;
      ctx.fillText(unit, cx + vw + 10 * s, cy + 34 * s + vs * 0.5);
    }
  });
  ctx.restore();
  return { x: layer.x, y, w: width, h: Math.ceil(n / Math.max(cols, 1)) * rowH };
}

function drawBrand(ctx: CanvasRenderingContext2D, layer: BrandLayer, y: number): Box {
  ctx.save();
  ctx.font = `800 ${layer.size}px ${DISPLAY}`;
  ctx.textBaseline = 'top';
  ctx.letterSpacing = `${layer.size * 0.28}px`;
  const w = ctx.measureText('KINETZ').width;
  ctx.fillStyle = COLORS[layer.color];
  ctx.globalAlpha = 0.9;
  ctx.fillText('KINETZ', layer.x - w / 2, y);
  ctx.restore();
  return { x: layer.x - w / 2, y, w, h: layer.size * 1.2 };
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

/** Renders the story and returns each visible layer's bounding box (canvas px) for hit-testing. */
export function renderRideStory(canvas: HTMLCanvasElement, o: RideStoryOptions): Record<string, Box> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return {};
  const w = canvas.width;
  const h = canvas.height;
  const ky = h / FRAME_H;
  const boxes: Record<string, Box> = {};
  const stats = o.ride ? rideStats(o.ride.segments) : null;
  ctx.clearRect(0, 0, w, h);

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

  for (const layer of o.layers) {
    if (!layer.visible) continue;
    const y = layer.y * ky;
    if (layer.kind === 'text') {
      const text = textFor(layer, o.ride);
      if (text) boxes[layer.id] = drawText(ctx, layer, text, y);
    } else if (layer.kind === 'route') {
      const box = { x: layer.x - layer.size / 2, y: y - layer.size / 2, w: layer.size, h: layer.size };
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
        ctx.fillText('Rute GPS tampil di sini', layer.x, y);
        ctx.restore();
      }
      boxes[layer.id] = box;
    } else if (layer.kind === 'stats') {
      if (stats && layer.stats.length) boxes[layer.id] = drawStats(ctx, layer, stats, o.weightKg, y);
    } else {
      boxes[layer.id] = drawBrand(ctx, layer, y);
    }
  }

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
  return boxes;
}
