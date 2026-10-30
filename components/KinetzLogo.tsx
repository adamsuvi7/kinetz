import { MARK_H, MARK_PATHS, MARK_W } from '@/lib/logo';

/** The K mark as inline SVG; `className` sets its size. */
export default function KinetzMark({ className }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${MARK_W} ${MARK_H}`} className={className} role="img" aria-label="Kinetz">
      {MARK_PATHS.map((p) => (
        <path key={p.d} d={p.d} fill={p.fill} />
      ))}
    </svg>
  );
}
