// Canvas engines ported 1:1 from prototype-reference.html (run route map + IG Story studio).
import {
  type AppState,
  computePaceString,
  formatDurationMMSS,
  formatNumberID,
  gymCompletedSets,
  gymPrCount,
  gymTotalVolume,
  last,
} from './state';

import { drawImageCover, drawRoundRectPath } from './draw';

type Metric = { label: string; value: string; highlight: boolean };

export function renderRunRouteCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Dark topo grid background
  ctx.fillStyle = '#0B110E';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(200, 245, 38, 0.07)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 28) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += 28) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // 3D Elevation Profile Silhouette at Bottom
  ctx.fillStyle = 'rgba(67, 130, 87, 0.28)';
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, h - 35);
  ctx.quadraticCurveTo(w * 0.25, h - 68, w * 0.5, h - 42);
  ctx.quadraticCurveTo(w * 0.75, h - 85, w, h - 48);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // GPS Route Loop with KM Markers
  const pts = [
    { x: 58, y: 155, label: 'START' },
    { x: 115, y: 74, label: '1K' },
    { x: 215, y: 48, label: '2K' },
    { x: 325, y: 72, label: '3K' },
    { x: 378, y: 145, label: '4K' },
    { x: 235, y: 172, label: '5K' },
    { x: 78, y: 162, label: 'FIN' },
  ];

  // Glow route stroke
  ctx.save();
  ctx.strokeStyle = '#C8F526';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(200, 245, 38, 0.75)';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();

  // KM Marker Pins
  pts.forEach((p, idx) => {
    ctx.fillStyle = idx === 0 ? '#FFFFFF' : '#C8F526';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 9px Plus Jakarta Sans';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(p.label, p.x - 10, p.y - 10);
  });
}

/**
 * Precision 2x2 metrics grid in the Lower Safe-Zone (Y ≈ 1395 on a 1920px canvas),
 * leaving breathing room above it.
 */
function drawPrecision2x2Grid(ctx: CanvasRenderingContext2D, w: number, h: number, metrics: Metric[], offsetY: number) {
  const baseGridTop = (h === 1920 ? 1395 : 940) + offsetY;
  const leftX = 96;
  const col2X = 576;
  const rowGap = 175;

  // Subtle precision glass backing card
  ctx.save();
  ctx.fillStyle = 'rgba(11, 15, 13, 0.72)';
  drawRoundRectPath(ctx, 64, baseGridTop - 58, w - 128, 370, 36);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200, 245, 38, 0.22)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Precision Crosshair Dividers
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(w / 2, baseGridTop - 32);
  ctx.lineTo(w / 2, baseGridTop + 282);
  ctx.moveTo(96, baseGridTop + 125);
  ctx.lineTo(w - 96, baseGridTop + 125);
  ctx.stroke();

  metrics.forEach((m, idx) => {
    const isRight = idx % 2 === 1;
    const isBottom = idx >= 2;
    const x = isRight ? col2X : leftX;
    const y = baseGridTop + (isBottom ? rowGap : 0);

    ctx.fillStyle = 'rgba(243, 247, 244, 0.72)';
    ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(m.label.toUpperCase(), x, y);

    ctx.fillStyle = m.highlight ? '#C8F526' : '#FFFFFF';
    ctx.font = '800 68px "Space Grotesk", sans-serif';
    ctx.fillText(m.value, x, y + 74);
  });
  ctx.restore();
}

export function renderStudioCanvas(canvas: HTMLCanvasElement, s: AppState) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const { transparent, showBadge, hudOffsetY, bgImage, template } = s.studio;

  ctx.clearRect(0, 0, w, h);

  // 1. Background Layer (unless Transparent Sticker Mode is ON)
  if (!transparent) {
    if (bgImage) {
      drawImageCover(ctx, bgImage, w, h);
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(10, 14, 12, 0.55)');
      grad.addColorStop(0.45, 'rgba(10, 14, 12, 0.18)');
      grad.addColorStop(0.75, 'rgba(10, 14, 12, 0.75)');
      grad.addColorStop(1, 'rgba(10, 14, 12, 0.95)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    } else {
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, '#0E1511');
      bgGrad.addColorStop(0.5, '#121D16');
      bgGrad.addColorStop(1, '#090D0A');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Subtle athletic grid lines
      ctx.strokeStyle = 'rgba(200, 245, 38, 0.05)';
      ctx.lineWidth = 2;
      for (let x = 0; x < w; x += 90) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 90) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    }
  }

  // 2. Top Brand Header (Safe Zone Y = 120)
  ctx.fillStyle = '#C8F526';
  drawRoundRectPath(ctx, 84, 108, 230, 54, 27);
  ctx.fill();
  ctx.fillStyle = '#0E110F';
  ctx.font = '800 25px "Space Grotesk", sans-serif';
  ctx.fillText('⚡ KINETZ', 112, 144);

  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`IF ${s.fastingProtocol}`, 336, 143);

  // Optional KOM / Trophy Badge on Top Right
  if (showBadge) {
    ctx.fillStyle = 'rgba(200, 245, 38, 0.16)';
    drawRoundRectPath(ctx, w - 360, 104, 276, 60, 30);
    ctx.fill();
    ctx.strokeStyle = '#C8F526';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#C8F526';
    ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('👑 LOCAL LEGEND', w - 332, 142);
  }

  // 3. Center Visual Hero
  let titleText = `${s.currentSplit.toUpperCase()} DAY SESSION`;
  let subText = 'HYPERTROPHY & PROGRESSIVE OVERLOAD';
  let metrics4: Metric[];

  if (template === 'gym') {
    metrics4 = [
      { label: 'TOTAL VOLUME', value: `${formatNumberID(gymTotalVolume(s.gymSets))} KG`, highlight: true },
      { label: 'COMPLETED SETS', value: `${gymCompletedSets(s.gymSets)} SETS`, highlight: false },
      { label: 'PERSONAL RECORDS', value: `${gymPrCount(s.gymSets)} NEW PR 🔥`, highlight: true },
      { label: 'ACTIVE CALORIES', value: `${s.activeCalories} KCAL`, highlight: false },
    ];

    // Center Minimalist Barbell / Muscle Ring Graphic
    ctx.save();
    ctx.strokeStyle = 'rgba(200, 245, 38, 0.28)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.42, 190, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 64px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(titleText, w / 2, h * 0.41);
    ctx.fillStyle = '#C8F526';
    ctx.font = '700 28px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(subText, w / 2, h * 0.41 + 52);
    ctx.restore();
  } else if (template === 'run') {
    const run = s.runData;
    titleText = run.title.toUpperCase();
    subText = `+${run.elevationM}M ELEVATION`;
    metrics4 = [
      { label: 'DISTANCE', value: `${run.distanceKm.toFixed(2)} KM`, highlight: true },
      { label: 'AVG PACE', value: `${computePaceString(run.distanceKm, run.movingSeconds)} /KM`, highlight: false },
      { label: 'MOVING TIME', value: formatDurationMMSS(run.movingSeconds), highlight: true },
      { label: 'CADENCE / HR', value: `${run.cadence} SPM`, highlight: false },
    ];

    // Big Neon GPS Route Polyline in Center
    ctx.save();
    const routePts = [
      { x: 260, y: h * 0.46 },
      { x: 350, y: h * 0.33 },
      { x: 560, y: h * 0.3 },
      { x: 780, y: h * 0.35 },
      { x: 830, y: h * 0.47 },
      { x: 540, y: h * 0.51 },
      { x: 290, y: h * 0.47 },
    ];
    ctx.strokeStyle = '#C8F526';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(200, 245, 38, 0.8)';
    ctx.shadowBlur = 28;
    ctx.beginPath();
    routePts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 54px "Space Grotesk", sans-serif';
    ctx.fillText(titleText, w / 2, h * 0.24);
    ctx.restore();
  } else if (template === 'cycle') {
    const sp = s.multiSports[s.selectedMultiSportIndex];
    titleText = sp.name.toUpperCase();
    metrics4 = [
      { label: 'ACTIVE DURATION', value: `${s.multiDurationMin} MIN`, highlight: true },
      { label: 'PERFORMANCE', value: sp.unit.toUpperCase(), highlight: false },
      // Kalori = MET * BB_kg * Durasi_jam, same as the Multi-Sport panel
      { label: 'METS BURNED', value: `${Math.round(sp.met * (last(s.bodyHistory.weight) || 72) * (s.multiDurationMin / 60))} KCAL`, highlight: true },
      { label: 'HEART RATE', value: `${s.heartRate} BPM`, highlight: false },
    ];
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 62px "Space Grotesk", sans-serif';
    ctx.fillText(`${sp.icon} ${titleText}`, w / 2, h * 0.42);
    ctx.restore();
  } else if (template === 'meal') {
    const m = s.activeMeal;
    metrics4 = [
      { label: 'MEAL CALORIES', value: `${Math.round(m.baseCal * m.scale)} KCAL`, highlight: true },
      { label: 'HIGH PROTEIN', value: `${Math.round(m.baseProt * m.scale)}G PROT`, highlight: true },
      { label: 'FASTING WINDOW', value: `IF ${s.fastingProtocol}`, highlight: false },
      { label: 'DAILY TARGET', value: `${s.consumedProtein}/${s.targetProtein}G`, highlight: false },
    ];
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 48px "Space Grotesk", sans-serif';
    ctx.fillText(m.title.toUpperCase(), w / 2, h * 0.42);
    ctx.restore();
  } else {
    const waist = s.bodyHistory.waist;
    const waistDelta = last(waist) - waist[0];
    const consistency = Math.round(s.weeklyConsistency.reduce((a, d) => a + d.pct, 0) / s.weeklyConsistency.length);
    metrics4 = [
      { label: 'CURRENT WEIGHT', value: `${last(s.bodyHistory.weight)} KG`, highlight: false },
      { label: 'WAIST DELTA', value: `${waistDelta > 0 ? '+' : ''}${waistDelta.toFixed(1)} CM`, highlight: true },
      { label: 'WAIST SIZE', value: `${last(waist)} CM`, highlight: false },
      { label: 'CONSISTENCY', value: `${consistency}% WEEK`, highlight: true },
    ];
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 58px "Space Grotesk", sans-serif';
    ctx.fillText('BODY RECOMPOSITION', w / 2, h * 0.42);
    ctx.restore();
  }

  // 4. Precision 2x2 Grid in the Lower Safe-Zone
  drawPrecision2x2Grid(ctx, w, h, metrics4, hudOffsetY);

  // 5. Bottom Watermark Signature
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('KINETZ', w / 2, h - 48);
  ctx.textAlign = 'left';
}
