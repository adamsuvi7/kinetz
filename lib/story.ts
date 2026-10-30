// Editable IG Story for a GPS ride: a list of draggable layers rendered onto a 1080×1920 (or 1080×1350) canvas.
// Layer coordinates live in a 1080×1920 frame. The 4:5 frame scales the whole layout uniformly (so nothing
// collides), and thumbnails render the same frame into a smaller canvas.
import { drawImageCover, drawRoundRectPath } from './draw';
import { LOGO_GREEN, MARK_H, MARK_W, drawMark } from './logo';
import {
  cyclingKcal, fitRoute, formatDuration, formatKm, formatRideDate, formatSpeed, rideStats,
  type Ride, type RideStats, type Segments,
} from './ride';

export type Swatch = 'white' | 'green' | 'lime' | 'orange' | 'black';
export type StatKey = 'distance' | 'moving' | 'avgSpeed' | 'maxSpeed' | 'elevation' | 'calories' | 'elapsed';
type Icon = 'pin' | 'bolt' | 'watch' | 'gauge' | 'mountain' | 'flame' | 'bike';

type Base = { id: string; x: number; y: number; visible: boolean };
export type TextLayer = Base & {
  kind: 'text';
  /** May contain line breaks. */
  text: string;
  /** Empty text falls back to the ride's name / date, so one layout works for every ride. */
  bind?: 'name' | 'date';
  size: number;
  style: 'plain' | 'pill' | 'outline';
  color: Swatch;
  align: 'left' | 'center' | 'right';
  bold: boolean;
  /** Letter spacing in em. */
  spacing?: number;
  /** Short brand-green bar under the text. */
  underline?: boolean;
};
export type RouteLayer = Base & { kind: 'route'; size: number; color: Swatch; markers: boolean };
export type StatsLayer = Base & {
  kind: 'stats';
  size: number;
  stats: StatKey[];
  layout: 'grid' | 'row' | 'column' | 'icons';
  color: Swatch;
};
export type BrandLayer = Base & { kind: 'brand'; size: number; color: Swatch; align?: 'left' | 'center' };
export type BadgeLayer = Base & { kind: 'badge'; text: string; sub: string; size: number; color: Swatch };
export type DecorLayer = Base & { kind: 'decor'; variant: 'stripes' | 'shade'; size: number; color: Swatch };
export type Layer = TextLayer | RouteLayer | StatsLayer | BrandLayer | BadgeLayer | DecorLayer;
export type Box = { x: number; y: number; w: number; h: number };

export const FRAME_W = 1080;
export const FRAME_H = 1920;
export const COLORS: Record<Swatch, string> = { white: '#FFFFFF', green: LOGO_GREEN, lime: '#C8F526', orange: '#FF6A1A', black: '#0E110F' };
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
const STAT_ICONS: Record<StatKey, Icon> = {
  distance: 'pin', moving: 'watch', elapsed: 'watch', avgSpeed: 'bolt', maxSpeed: 'gauge', elevation: 'mountain', calories: 'flame',
};
export const sentenceCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

const title = (p: Partial<TextLayer> = {}): TextLayer => ({
  id: 'title', kind: 'text', bind: 'name', text: '', x: 540, y: 290, size: 84, style: 'plain', color: 'white', align: 'center', bold: true, visible: true, ...p,
});
const date = (p: Partial<TextLayer> = {}): TextLayer => ({
  id: 'date', kind: 'text', bind: 'date', text: '', x: 540, y: 396, size: 32, style: 'plain', color: 'white', align: 'center', bold: false, visible: true, ...p,
});
const brand = (p: Partial<BrandLayer> = {}): BrandLayer => ({ id: 'brand', kind: 'brand', x: 540, y: 1530, size: 30, color: 'white', visible: true, ...p });
const tagline = (id: string, text: string, y: number, size: number): TextLayer => ({
  id, kind: 'text', text, x: 994, y, size, style: 'plain', color: 'white', align: 'right', bold: false, spacing: 0.3, underline: true, visible: true,
});

export type RideTemplate = { id: string; name: string; hint: string; transparent: boolean; layers: Layer[] };

/** Ready-made cycling layouts; every value is filled from the selected ride, then fully editable. */
export const RIDE_TEMPLATES: RideTemplate[] = [
  {
    id: 'sorotan',
    name: 'Sorotan',
    hint: 'Foto + statistik berikon',
    transparent: false,
    layers: [
      { id: 'shade', kind: 'decor', variant: 'shade', x: 0, y: 0, size: 1, color: 'black', visible: true },
      { id: 'stripes', kind: 'decor', variant: 'stripes', x: 0, y: 1722, size: 1, color: 'green', visible: true },
      brand({ x: 96, y: 96, size: 46, align: 'left' }),
      tagline('tag-top', 'MOVE BETTER\nLIVE STRONGER', 82, 20),
      { id: 'stats', kind: 'stats', x: 84, y: 380, size: 1, stats: ['distance', 'avgSpeed', 'moving'], layout: 'icons', color: 'white', visible: true },
      { id: 'route', kind: 'route', x: 290, y: 1250, size: 330, color: 'green', markers: true, visible: true },
      { id: 'badge', kind: 'badge', x: 82, y: 1500, text: 'Bersepeda', sub: 'OUTDOOR', size: 1, color: 'green', visible: true },
      tagline('tag-bottom', 'SMALL STEPS\nBIG PROGRESS', 1580, 24),
    ],
  },
  {
    id: 'klasik',
    name: 'Klasik',
    hint: 'Judul, rute, 4 statistik',
    transparent: false,
    layers: [
      title(),
      date(),
      { id: 'route', kind: 'route', x: 540, y: 830, size: 660, color: 'green', markers: true, visible: true },
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
      { id: 'route', kind: 'route', x: 540, y: 860, size: 900, color: 'green', markers: true, visible: true },
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
      { id: 'route', kind: 'route', x: 540, y: 700, size: 520, color: 'green', markers: true, visible: true },
      { id: 'hero', kind: 'stats', x: 150, y: 1010, size: 2, stats: ['distance'], layout: 'column', color: 'green', visible: true },
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
      { id: 'event', kind: 'text', text: 'CRITICAL MASS', x: 540, y: 290, size: 44, style: 'pill', color: 'green', align: 'center', bold: true, visible: true },
      title({ y: 400, size: 72 }),
      date({ y: 494, size: 30 }),
      { id: 'route', kind: 'route', x: 540, y: 930, size: 600, color: 'green', markers: true, visible: true },
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
      { id: 'route', kind: 'route', x: 540, y: 760, size: 560, color: 'green', markers: true, visible: true },
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

/** Line icons drawn in an s×s box at (x, y). */
function drawIcon(ctx: CanvasRenderingContext2D, icon: Icon, x: number, y: number, s: number, color: string) {
  const P = (px: number, py: number): [number, number] => [x + px * s, y + py * s];
  const line = (...pts: [number, number][]) => { ctx.moveTo(...pts[0]); pts.slice(1).forEach((p) => ctx.lineTo(...p)); };
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = s * 0.085;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (icon === 'pin') {
    ctx.moveTo(...P(0.5, 0.95));
    ctx.bezierCurveTo(...P(0.08, 0.52), ...P(0.12, 0.04), ...P(0.5, 0.04));
    ctx.bezierCurveTo(...P(0.88, 0.04), ...P(0.92, 0.52), ...P(0.5, 0.95));
    ctx.moveTo(...P(0.63, 0.38));
    ctx.arc(...P(0.5, 0.38), s * 0.13, 0, Math.PI * 2);
  } else if (icon === 'bolt') {
    line(P(0.6, 0.04), P(0.2, 0.56), P(0.5, 0.56), P(0.4, 0.96), P(0.8, 0.42), P(0.5, 0.42), P(0.6, 0.04));
  } else if (icon === 'watch') {
    ctx.arc(...P(0.5, 0.58), s * 0.36, 0, Math.PI * 2);
    line(P(0.38, 0.06), P(0.62, 0.06));
    line(P(0.5, 0.06), P(0.5, 0.22));
    line(P(0.5, 0.58), P(0.5, 0.38));
  } else if (icon === 'gauge') {
    ctx.arc(...P(0.5, 0.68), s * 0.42, Math.PI, Math.PI * 2);
    line(P(0.5, 0.68), P(0.74, 0.42));
  } else if (icon === 'mountain') {
    line(P(0.04, 0.86), P(0.38, 0.28), P(0.56, 0.58), P(0.68, 0.42), P(0.96, 0.86), P(0.04, 0.86));
  } else if (icon === 'flame') {
    ctx.moveTo(...P(0.5, 0.95));
    ctx.bezierCurveTo(...P(0.12, 0.88), ...P(0.18, 0.42), ...P(0.46, 0.05));
    ctx.bezierCurveTo(...P(0.52, 0.36), ...P(0.86, 0.44), ...P(0.82, 0.72));
    ctx.bezierCurveTo(...P(0.8, 0.88), ...P(0.64, 0.95), ...P(0.5, 0.95));
  } else {
    // bike
    ctx.moveTo(...P(0.42, 0.66));
    ctx.arc(...P(0.22, 0.66), s * 0.2, 0, Math.PI * 2);
    ctx.moveTo(...P(0.98, 0.66));
    ctx.arc(...P(0.78, 0.66), s * 0.2, 0, Math.PI * 2);
    line(P(0.22, 0.66), P(0.42, 0.36), P(0.62, 0.66), P(0.22, 0.66));
    line(P(0.42, 0.36), P(0.7, 0.36), P(0.78, 0.66));
    line(P(0.34, 0.28), P(0.48, 0.28));
    line(P(0.66, 0.26), P(0.7, 0.36));
  }
  ctx.stroke();
  ctx.restore();
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
    const r = lineWidth * 1.6;
    ctx.shadowBlur = 0;
    // Start: ring in the route color.
    ctx.lineWidth = lineWidth * 0.7;
    ctx.fillStyle = '#0E110F';
    ctx.beginPath(); ctx.arc(start.x, start.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // Finish: checkered flag disc.
    ctx.save();
    ctx.beginPath(); ctx.arc(end.x, end.y, r * 1.15, 0, Math.PI * 2); ctx.clip();
    const cell = (r * 2.3) / 4;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      ctx.fillStyle = (i + j) % 2 ? color : '#FFFFFF';
      ctx.fillRect(end.x - r * 1.15 + i * cell, end.y - r * 1.15 + j * cell, cell, cell);
    }
    ctx.restore();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = lineWidth * 0.35;
    ctx.beginPath(); ctx.arc(end.x, end.y, r * 1.15, 0, Math.PI * 2); ctx.stroke();
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
  const lines = text.split('\n');
  // Everything below (incl. measuring) changes letterSpacing; keep it from leaking into later layers.
  ctx.save();
  const font = (size: number) => `${layer.bold ? 800 : 600} ${size}px ${layer.bold ? DISPLAY : BODY}`;
  const spacing = (size: number) => `${(layer.spacing ?? 0) * size}px`;
  const measure = (size: number) => {
    ctx.font = font(size);
    ctx.letterSpacing = spacing(size);
    return Math.max(...lines.map((l) => ctx.measureText(l).width));
  };
  const padRatio = layer.style === 'plain' ? 0 : 0.6;
  // Shrink long text (e.g. a long ride name) so it never runs off the frame.
  const maxW =
    layer.align === 'center' ? FRAME_W - EDGE * 2 : layer.align === 'right' ? Math.max(layer.x, 0) - EDGE : FRAME_W - Math.max(layer.x, 0) - EDGE;
  const natural = measure(layer.size) + layer.size * padRatio * 2;
  const size = natural > maxW ? Math.max(14, (layer.size * maxW) / natural) : layer.size;

  const tw = measure(size);
  ctx.textBaseline = 'top';
  const lh = size * 1.32;
  const padX = size * padRatio;
  const padY = layer.style === 'plain' ? 0 : size * 0.32;
  const w = tw + padX * 2;
  const textH = size * 1.15 + (lines.length - 1) * lh;
  const h = textH + padY * 2;
  const left = layer.align === 'center' ? layer.x - w / 2 : layer.align === 'right' ? layer.x - w : layer.x;
  const y = layer.y;

  if (layer.style === 'pill') {
    ctx.fillStyle = color;
    drawRoundRectPath(ctx, left, y, w, h, Math.min(h / 2, size));
    ctx.fill();
  } else if (layer.style === 'outline') {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, size * 0.07);
    drawRoundRectPath(ctx, left, y, w, h, Math.min(h / 2, size));
    ctx.stroke();
  }

  if (layer.style === 'pill') ctx.fillStyle = layer.color === 'black' ? '#FFFFFF' : '#0E110F';
  else {
    ctx.fillStyle = color;
    ctx.globalAlpha = layer.bold ? 1 : 0.88;
    // Soft shadow keeps plain text readable on bright photos.
    if (layer.style === 'plain' && layer.color !== 'black') { ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'; ctx.shadowBlur = size * 0.25; }
  }
  lines.forEach((l, i) => {
    const lw = ctx.measureText(l).width;
    const lx = layer.align === 'center' ? left + (w - lw) / 2 : layer.align === 'right' ? left + w - padX - lw : left + padX;
    ctx.fillText(l, lx, y + padY + size * 0.08 + i * lh);
  });

  let boxH = h;
  if (layer.underline) {
    const barW = Math.max(40, size * 2.6);
    const barX = layer.align === 'right' ? left + w - barW : layer.align === 'center' ? left + (w - barW) / 2 : left;
    const barY = y + h + size * 0.9;
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.fillStyle = LOGO_GREEN;
    ctx.fillRect(barX, barY, barW, Math.max(3, size * 0.16));
    boxH = barY + Math.max(3, size * 0.16) - y;
  }
  ctx.restore();
  return { x: left, y, w, h: boxH };
}

function drawStats(ctx: CanvasRenderingContext2D, layer: StatsLayer, stats: RideStats, weightKg: number): Box {
  const s = layer.size;
  const n = layer.stats.length;
  const color = COLORS[layer.color];
  const muted = layer.color === 'black' ? 'rgba(14, 17, 15, 0.7)' : 'rgba(255, 255, 255, 0.72)';
  ctx.save();
  ctx.textBaseline = 'top';
  ctx.shadowColor = layer.color === 'black' ? 'transparent' : 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 14 * s;

  if (layer.layout === 'icons') {
    // Icon + sentence-case label + big value, one stat per row (like the Kinetz poster style).
    const rowH = 225 * s;
    const textX = layer.x + 74 * s;
    const maxW = FRAME_W - EDGE - textX;
    let right = 0;
    layer.stats.forEach((key, i) => {
      const y = layer.y + i * rowH;
      const { value, unit } = statValue(key, stats, weightKg);
      drawIcon(ctx, STAT_ICONS[key], layer.x, y - 2 * s, 46 * s, LOGO_GREEN);
      ctx.font = `600 ${36 * s}px ${BODY}`;
      ctx.fillStyle = layer.color === 'black' ? muted : 'rgba(255, 255, 255, 0.85)';
      const label = sentenceCase(STAT_LABELS[key]);
      ctx.fillText(label, textX, y);
      const labelW = ctx.measureText(label).width;
      ctx.font = `800 ${92 * s}px ${DISPLAY}`;
      const fullW = () => ctx.measureText(value).width + (unit ? 14 * s + ctx.measureText(unit).width * 0.46 : 0);
      const vs = 92 * s * Math.min(1, maxW / fullW());
      ctx.font = `800 ${vs}px ${DISPLAY}`;
      ctx.fillStyle = color;
      ctx.fillText(value, textX, y + 52 * s);
      const vw = ctx.measureText(value).width;
      let w = vw;
      if (unit) {
        ctx.font = `600 ${vs * 0.46}px ${BODY}`;
        ctx.fillText(unit, textX + vw + 14 * s, y + 52 * s + vs * 0.42);
        w += 14 * s + ctx.measureText(unit).width;
      }
      right = Math.max(right, textX + Math.max(labelW, w) - layer.x);
    });
    ctx.restore();
    return { x: layer.x, y: layer.y, w: right, h: n * rowH - 40 * s };
  }

  const cols = layer.layout === 'grid' ? Math.min(2, n) : layer.layout === 'row' ? n : 1;
  // Never let a block run past the right edge of the frame, wherever it was dragged.
  const width = Math.min(840 * s, FRAME_W - EDGE - layer.x);
  const colW = width / Math.max(cols, 1);
  const rowH = (layer.layout === 'column' ? 150 : 175) * s;
  let right = 0;
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

/** Logo lockup: K mark + KINETZ wordmark. `size` is the wordmark font size. */
function drawBrand(ctx: CanvasRenderingContext2D, layer: BrandLayer): Box {
  const markH = layer.size * 1.75;
  const markW = (MARK_W / MARK_H) * markH;
  const gap = layer.size * 0.55;
  ctx.save();
  ctx.font = `700 ${layer.size}px ${DISPLAY}`;
  ctx.letterSpacing = `${layer.size * 0.3}px`;
  ctx.textBaseline = 'middle';
  const wordW = ctx.measureText('KINETZ').width;
  const w = markW + gap + wordW;
  const left = layer.align === 'left' ? layer.x : layer.x - w / 2;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = layer.size * 0.3;
  drawMark(ctx, left, layer.y, markH);
  ctx.fillStyle = COLORS[layer.color];
  ctx.fillText('KINETZ', left + markW + gap, layer.y + markH / 2);
  ctx.restore();
  return { x: left, y: layer.y, w, h: markH };
}

function drawBadge(ctx: CanvasRenderingContext2D, layer: BadgeLayer): Box {
  const s = layer.size;
  const iconX = layer.x + 26 * s;
  const textX = layer.x + 112 * s;
  ctx.save();
  ctx.textBaseline = 'top';
  ctx.font = `600 ${34 * s}px ${BODY}`;
  const tw = ctx.measureText(layer.text).width;
  ctx.font = `600 ${20 * s}px ${BODY}`;
  ctx.letterSpacing = `${6 * s}px`;
  const sw = ctx.measureText(layer.sub).width;
  const w = Math.max(320 * s, textX - layer.x + Math.max(tw, sw) + 34 * s);
  const h = 116 * s;
  ctx.fillStyle = 'rgba(10, 14, 12, 0.45)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 2 * s;
  drawRoundRectPath(ctx, layer.x, layer.y, w, h, 26 * s);
  ctx.fill();
  ctx.stroke();
  drawIcon(ctx, 'bike', iconX, layer.y + 26 * s, 64 * s, COLORS[layer.color]);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillText(layer.sub, textX, layer.y + 70 * s);
  ctx.letterSpacing = '0px';
  ctx.font = `600 ${34 * s}px ${BODY}`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(layer.text, textX, layer.y + 24 * s);
  ctx.restore();
  return { x: layer.x, y: layer.y, w, h };
}

function drawStripes(ctx: CanvasRenderingContext2D, layer: DecorLayer): Box {
  const s = layer.size;
  const h = 198 * s, w = 200 * s, slant = 220 * s;
  const base = COLORS[layer.color];
  ctx.save();
  [0, 330 * s].forEach((dx, i) => {
    const x0 = layer.x + dx;
    const g = ctx.createLinearGradient(x0, layer.y, x0 - slant, layer.y + h);
    g.addColorStop(0, base);
    g.addColorStop(1, 'rgba(14, 40, 18, 0.9)');
    ctx.globalAlpha = i === 0 ? 1 : 0.75;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0, layer.y);
    ctx.lineTo(x0 + w, layer.y);
    ctx.lineTo(x0 + w - slant, layer.y + h);
    ctx.lineTo(x0 - slant, layer.y + h);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
  return { x: layer.x, y: layer.y, w: 530 * s, h };
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
  const layerTransform = () => ctx.setTransform(px * k, 0, 0, px * k, px * ox, 0);
  layerTransform();
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
        ctx.font = `600 ${Math.min(30, layer.size / 11)}px ${BODY}`;
        ctx.textAlign = 'center';
        ctx.fillText('Rute GPS tampil di sini', layer.x, layer.y);
        ctx.restore();
      }
      if (drawn || o.guides) b = box;
    } else if (layer.kind === 'stats') {
      if (stats && layer.stats.length) b = drawStats(ctx, layer, stats, o.weightKg);
    } else if (layer.kind === 'badge') {
      b = drawBadge(ctx, layer);
    } else if (layer.kind === 'decor') {
      if (layer.variant === 'stripes') b = drawStripes(ctx, layer);
      else {
        // Full-canvas legibility shade on the left; not draggable (no box), toggled from the editor.
        ctx.setTransform(px, 0, 0, px, 0, 0);
        const g = ctx.createLinearGradient(0, 0, w * 0.75, 0);
        g.addColorStop(0, 'rgba(6, 9, 7, 0.78)');
        g.addColorStop(1, 'rgba(6, 9, 7, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        layerTransform();
      }
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
