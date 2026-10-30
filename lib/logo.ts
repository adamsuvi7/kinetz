// Kinetz "K" mark, traced from the brand logo (1254px artwork, mark cropped to its 409×354 bounding box).
// Shared by the React header logo, the story canvas and (copied verbatim) the Android vector icon.
export const LOGO_GREEN = '#7EEA3D';
export const LOGO_GRAY = '#323E3A';
export const MARK_W = 409;
export const MARK_H = 354;

export const MARK_PATHS = [
  { d: 'M0 66Q0 59 7 55L104 0L104 291L0 354Z', fill: LOGO_GREEN }, // stem
  { d: 'M123 136Q123 128 130 122L264 5Q269 1 277 1L409 1L123 221Z', fill: LOGO_GREEN }, // upper arm
  { d: 'M154 236Q151 232 156 228L219 188Q228 182 236 190L409 354L274 354Z', fill: LOGO_GRAY }, // leg
];

/** Draws the mark with its top-left at (x, y) and the given height. */
export function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, height: number) {
  const s = height / MARK_H;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  for (const p of MARK_PATHS) {
    ctx.fillStyle = p.fill;
    ctx.fill(new Path2D(p.d));
  }
  ctx.restore();
  return MARK_W * s;
}
