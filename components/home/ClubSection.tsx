'use client';

import { useApp } from '../AppProvider';

export default function ClubSection() {
  const { s, set, switchTab } = useApp();

  const toggleFeed = (idx: number, kind: 'kudos' | 'bump') =>
    set((p) => ({
      ...p,
      socialFeed: p.socialFeed.map((post, i) => {
        if (i !== idx) return post;
        if (kind === 'kudos') return { ...post, liked: !post.liked, kudos: post.kudos + (post.liked ? -1 : 1) };
        return { ...post, bumped: !post.bumped, fistbumps: post.fistbumps + (post.bumped ? -1 : 1) };
      }),
    }));

  return (
    <>
      {/* MONTHLY CHALLENGES TROPHY CABINET */}
      <div className="surface-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold">🏆 Monthly Challenges (Hybrid)</h3>
            <p className="text-[11px] opacity-65">Kumpulkan lencana & tempel ke IG Story 9:16</p>
          </div>
          <span className="text-[11px] font-bold text-[#C8F526]">3 Aktif</span>
        </div>
        <div className="space-y-3">
          {s.challenges.map((c) => {
            const pct = Math.min(100, Math.round((c.current / c.target) * 100));
            return (
              <div key={c.id} className="surface-card-alt p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold">{c.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#C8F526]/15 text-[#C8F526] font-bold">{c.badge}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/35 overflow-hidden">
                  <div className="h-full bg-[#C8F526]" style={{ width: `${pct}%` }}></div>
                </div>
                <div className="flex justify-between text-[10px] opacity-75">
                  <span>{`Progres: ${c.current} / ${c.target} ${c.unit}`}</span>
                  <strong>{pct}% Selesai</strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SOCIAL FEED: KUDOS & PR FISTBUMP */}
      <div className="surface-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold">🌐 Kinetz Club Feed (Kudos & PR)</h3>
            <p className="text-[11px] opacity-65">Berikan Kudos 👍 atau PR Fistbump 🔥 ke sesama atlet</p>
          </div>
          <button onClick={() => switchTab('studio')} className="text-[11px] font-bold text-[#C8F526]">
            + Post Story
          </button>
        </div>
        <div className="space-y-3">
          {s.socialFeed.map((post, idx) => (
            <div key={post.id} className="surface-card-alt p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-extrabold">{post.author}</div>
                  <div className="text-[10px] text-[#C8F526] font-semibold">{post.tag}</div>
                </div>
                <span className="text-[11px] font-display font-bold">{post.metric}</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button onClick={() => toggleFeed(idx, 'kudos')} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${post.liked ? 'lime-btn' : 'surface-card'}`}>
                  👍 Kudos ({post.kudos})
                </button>
                <button onClick={() => toggleFeed(idx, 'bump')} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${post.bumped ? 'lime-btn' : 'surface-card'}`}>
                  🔥 PR Bump ({post.fistbumps})
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
