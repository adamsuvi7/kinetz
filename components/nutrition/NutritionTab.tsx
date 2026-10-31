'use client';

import { formatNumberID, todayKey } from '@/lib/state';
import { useApp } from '../AppProvider';

const PRESET_CARDS = [
  { icon: '🍗🍚', label: 'Ayam Bakar + Nasi', meta: '540 kcal • 46g P' },
  { icon: '🥩🥗', label: 'Sirloin Steak + Telur', meta: '610 kcal • 54g P' },
  { icon: '🐟🌶️', label: 'Ikan Bakar + Tempe', meta: '480 kcal • 42g P' },
];


export default function NutritionTab() {
  const { s, set, toast, openCamera, exportToStudio } = useApp();
  const tdeeIn = s.tdeeInputs;
  const m = s.activeMeal;
  const pct = Math.round(m.scale * 100);
  const cal = Math.round(m.baseCal * m.scale);
  const prot = Math.round(m.baseProt * m.scale);

  const scanPresetMeal = (idx: number) => {
    const pm = s.presetMeals[idx];
    set((p) => ({
      ...p,
      activeMeal: { ...p.activeMeal, title: pm.title, baseCal: pm.cal, baseProt: pm.prot, baseCarb: pm.carb, baseFat: pm.fat, scale: 1.0 },
    }));
    toast(`AI Vision berhasil memindai: ${pm.title}`);
  };

  const logCurrentAiMeal = () => {
    set((p) => {
      const day = todayKey();
      const cur = p.dietLog[day] ?? { kcal: 0, protein: 0 };
      return { ...p, dietLog: { ...p.dietLog, [day]: { kcal: cur.kcal + cal, protein: cur.protein + prot } } };
    });
    toast(`+${cal} kcal & +${prot}g Protein tercatat ke target harian!`);
  };

  const recalcTdee = (next: typeof tdeeIn) => {
    const w = parseFloat(next.weight) || 72;
    const h = parseFloat(next.height) || 173;
    const goalDelta = parseInt(next.goal, 10) || 0;
    // Mifflin-St Jeor (age 24 male baseline)
    const bmr = Math.round(10 * w + 6.25 * h - 5 * 24 + 5);
    const maintenance = Math.round(bmr * 1.5);
    set((p) => ({ ...p, tdeeInputs: next, bmr, tdee: maintenance + goalDelta, targetProtein: Math.round(w * 2.1) }));
  };

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const firstWeekday = (new Date(now.getFullYear(), now.getMonth(), 1).getDay() + 6) % 7; // Monday first
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const key = todayKey(new Date(now.getFullYear(), now.getMonth(), i + 1));
    const d = s.dietLog[key];
    const logged = !!d && d.kcal > 0;
    return { day: i + 1, key, logged, onTarget: logged && Math.abs(d.kcal - s.tdee) <= s.tdee * 0.1 && d.protein >= s.targetProtein };
  });

  return (
    <section className={`tab-grid${s.activeTab === 'nutrition' ? '' : ' hidden'}`}>
      {/* AI Food Vision Scanner */}
      <div className="surface-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#C8F526] text-[#0E110F]">AI VISION SCANNER</span>
            <h2 className="text-base font-extrabold mt-1">Foto Makanan → Hitung Kalori & Protein</h2>
          </div>
          <button onClick={() => openCamera('food')} className="px-3 py-1.5 rounded-xl text-xs lime-btn">
            📷 Foto Piring
          </button>
        </div>

        <p className="text-[11px] opacity-65 mb-2">Coba pindai instan makanan atau unggah foto makananmu:</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {PRESET_CARDS.map((c, i) => (
            <button key={c.label} onClick={() => scanPresetMeal(i)} className="surface-card-alt p-2.5 text-left hover:border-[#C8F526]">
              <div className="text-base">{c.icon}</div>
              <div className="text-[11px] font-bold mt-1">{c.label}</div>
              <div className="text-[10px] text-[#C8F526]">{c.meta}</div>
            </button>
          ))}
        </div>

        {/* AI Detection Breakdown Box + Portion Quick Adjust */}
        <div className="surface-card-alt p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-extrabold">{m.title}</div>
              <div className="text-[11px] opacity-70">{m.note}</div>
            </div>
            <span className="font-display font-bold text-sm text-[#C8F526]">{cal} kcal</span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span>
              🥩 Protein: <strong>{prot}g</strong>
            </span>
            <span>
              🍚 Karbo: <strong>{Math.round(m.baseCarb * m.scale)}g</strong>
            </span>
            <span>
              🥑 Lemak: <strong>{Math.round(m.baseFat * m.scale)}g</strong>
            </span>
          </div>

          {/* Portion Multiplier Slider (50%–200%) */}
          <div className="pt-1">
            <div className="flex justify-between text-[11px] mb-1">
              <span>Koreksi Porsi Gramasi:</span>
              <strong className="text-[#C8F526]">{`${pct}% (${m.scale.toFixed(1)}x Porsi)`}</strong>
            </div>
            <input
              type="range"
              min="50"
              max="200"
              step="10"
              value={pct}
              onChange={(e) => set((p) => ({ ...p, activeMeal: { ...p.activeMeal, scale: (parseInt(e.target.value, 10) || 100) / 100 } }))}
              className="w-full accent-[#C8F526]"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={logCurrentAiMeal} className="flex-1 py-2 rounded-xl text-xs lime-btn">
              + Catat ke Kalori Harian
            </button>
            <button onClick={() => exportToStudio('meal')} className="px-3 py-2 rounded-xl text-xs surface-card font-bold">
              Share IG
            </button>
          </div>
        </div>
      </div>

      {/* TDEE & MACRO CALCULATOR (Mifflin-St Jeor) */}
      <div className="surface-card p-4">
        <h3 className="text-sm font-bold mb-2">⚙️ Kalkulator TDEE & Target Protein (Mifflin-St Jeor)</h3>
        <div className="grid grid-cols-3 gap-2 text-xs mb-2.5">
          <div>
            <label className="text-[10px] opacity-65 block mb-1">Berat (kg)</label>
            <input
              type="number"
              value={tdeeIn.weight}
              onChange={(e) => recalcTdee({ ...tdeeIn, weight: e.target.value })}
              className="w-full surface-card-alt px-2.5 py-1.5 rounded-lg font-bold outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] opacity-65 block mb-1">Tinggi (cm)</label>
            <input
              type="number"
              value={tdeeIn.height}
              onChange={(e) => recalcTdee({ ...tdeeIn, height: e.target.value })}
              className="w-full surface-card-alt px-2.5 py-1.5 rounded-lg font-bold outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] opacity-65 block mb-1">Tujuan Diet</label>
            <select
              value={tdeeIn.goal}
              onChange={(e) => recalcTdee({ ...tdeeIn, goal: e.target.value })}
              className="w-full surface-card-alt px-2 py-1.5 rounded-lg font-bold outline-none"
            >
              <option value="-400">Cutting (-400)</option>
              <option value="0">Maintenance</option>
              <option value="250">Lean Bulk (+250)</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs surface-card-alt p-2.5">
          <div>
            <div className="text-[10px] opacity-65">BMR Basal</div>
            <div className="font-display font-bold text-sm">{formatNumberID(s.bmr)} kcal</div>
          </div>
          <div>
            <div className="text-[10px] opacity-65">Target Kalori</div>
            <div className="font-display font-bold text-sm text-[#C8F526]">{formatNumberID(s.tdee)} kcal</div>
          </div>
          <div>
            <div className="text-[10px] opacity-65">Target Protein</div>
            <div className="font-display font-bold text-sm text-emerald-400">{s.targetProtein}g / hari</div>
          </div>
        </div>
      </div>

      {/* MONTHLY CALENDAR: days with food logged, from the diet log */}
      <div className="surface-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-extrabold">Kalender Makan</h3>
          <span className="text-xs px-2.5 py-1 rounded-full surface-card-alt font-semibold">
            📅 {now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold opacity-60 mb-2">
          {['S', 'S', 'R', 'K', 'J', 'S', 'M'].map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
          {Array.from({ length: firstWeekday }, (_, i) => <div key={`pad${i}`} />)}
          {monthDays.map(({ day, key, logged, onTarget }) => (
            <div
              key={key}
              title={logged ? `${formatNumberID(s.dietLog[key].kcal)} kcal · ${s.dietLog[key].protein} g protein` : undefined}
              className={`h-9 rounded-full flex items-center justify-center font-bold ${
                onTarget ? 'bg-[#438257] text-white shadow' : logged ? 'bg-[#438257]/40' : 'surface-card-alt opacity-70'
              } ${key === todayKey() ? 'ring-2 ring-[#C8F526]' : ''}`}
            >
              {day}
            </div>
          ))}
        </div>
        <p className="text-[10px] opacity-55 mt-2">Hijau penuh = kalori dalam ±10% target dan protein tercapai. Hijau muda = makan tercatat.</p>

        <div className="grid grid-cols-2 gap-2.5 mt-3">
          <div className="pill-stat p-3">
            <div className="text-[10px] opacity-65">Hari tercatat</div>
            <div className="font-display font-bold text-base">
              {monthDays.filter((d) => d.logged).length} / {now.getDate()}
            </div>
          </div>
          <div className="pill-stat p-3">
            <div className="text-[10px] opacity-65">Hari sesuai target</div>
            <div className="font-display font-bold text-base">{monthDays.filter((d) => d.onTarget).length}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
