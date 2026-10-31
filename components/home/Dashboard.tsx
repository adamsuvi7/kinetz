'use client';

import { useState } from 'react';
import { bmi, bmiClass, bodyFatPct, energyBalance, goalEta, logStreak, trendPerWeek } from '@/lib/progress';
import { rideStats } from '@/lib/ride';
import { activeDays, currentWeight, dietToday, formatNumberID, lastDays, todayKey, type BodyMetric } from '@/lib/state';
import { Bars, Line, Ring } from '../charts';
import { useApp } from '../AppProvider';

const BODY_FIELDS: { key: BodyMetric; label: string }[] = [
  { key: 'weight', label: 'Berat (kg)' },
  { key: 'waist', label: 'Pinggang' },
  { key: 'thigh', label: 'Paha' },
  { key: 'arm', label: 'Lengan' },
  { key: 'chest', label: 'Dada' },
];
const AGE = 24; // same baseline the TDEE calculator uses

const dayLabel = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString('id-ID', { weekday: 'short' });
const dateLabel = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
const signed = (v: number, digits = 1) => `${v > 0 ? '+' : ''}${v.toFixed(digits).replace('.', ',')}`;

function Card({ title, hint, children, className = '' }: { title: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`surface-card p-4 ${className}`}>
      <div className="mb-2">
        <h3 className="text-sm font-bold">{title}</h3>
        {hint && <p className="text-[11px] opacity-65">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone?: 'good' | 'warn' }) {
  return (
    <div className="surface-card-alt p-3">
      <div className={`font-display font-bold text-lg leading-tight ${tone === 'good' ? 'text-[color:var(--accent)]' : tone === 'warn' ? 'text-amber-400' : ''}`}>{value}</div>
      <div className="text-[10px] opacity-65 mt-0.5">{label}</div>
    </div>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-[11px] opacity-65 surface-card-alt p-3">{children}</p>;

export default function Dashboard() {
  const { s, set, toast, switchTab } = useApp();
  const latest = s.bodyLog[s.bodyLog.length - 1];
  const [inputs, setInputs] = useState<Record<BodyMetric, string>>(() =>
    Object.fromEntries(BODY_FIELDS.map(({ key }) => [key, latest ? String(latest[key]) : key === 'weight' ? s.tdeeInputs.weight : ''])) as Record<BodyMetric, string>,
  );
  const [metric, setMetric] = useState<BodyMetric>('waist');

  const days7 = lastDays(7);
  const today = dietToday(s);
  const eb = energyBalance(days7, s.dietLog, s.tdee);
  const proteinHit = days7.filter((d) => (s.dietLog[d]?.protein ?? 0) >= s.targetProtein).length;
  const streak = logStreak(s.dietLog, lastDays(90));

  const weight = currentWeight(s);
  const trend = trendPerWeek(s.bodyLog);
  const eta = goalEta(weight, s.goalWeight, trend);
  const height = parseFloat(s.tdeeInputs.height) || 173;
  const bmiV = bmi(weight, height);
  const bf = bodyFatPct(bmiV, AGE);
  // More than ~1% of body weight per week tends to cost muscle, not just fat.
  const tooFast = trend != null && trend < -0.01 * weight;

  const kmByDay = days7.map((d) =>
    s.rides.filter((r) => todayKey(new Date(r.startedAt)) === d).reduce((a, r) => a + rideStats(r.segments, r.sport).distanceM / 1000, 0),
  );
  const gymSessions = s.gymLog.slice(-8);
  const active = activeDays(s, 7);

  const saveBody = () => {
    const vals = Object.fromEntries(BODY_FIELDS.map(({ key }) => [key, parseFloat(inputs[key])])) as Record<BodyMetric, number>;
    if (!(vals.weight > 20 && vals.weight < 400)) return toast('Isi berat badan yang valid');
    const prev = s.bodyLog[s.bodyLog.length - 1];
    // Fields left empty keep the last measured value, so weighing yourself alone doesn't wipe the tape measurements.
    const entry = { date: todayKey(), ...Object.fromEntries(BODY_FIELDS.map(({ key }) => [key, vals[key] > 0 ? vals[key] : prev?.[key] ?? 0])) } as typeof s.bodyLog[number];
    set((p) => {
      const log = p.bodyLog[p.bodyLog.length - 1]?.date === entry.date ? p.bodyLog.slice(0, -1) : p.bodyLog;
      return { ...p, bodyLog: [...log, entry] };
    });
    toast('Ukuran tubuh hari ini tersimpan');
  };

  const insights: string[] = [];
  if (eb.loggedDays) {
    const diff = eb.avgKcal - s.tdee;
    insights.push(
      `Rata-rata asupan ${formatNumberID(eb.avgKcal)} kcal/hari (${signed(diff, 0)} dari target) di ${eb.loggedDays} hari tercatat; setara ${signed(eb.fatKg, 2)} kg lemak.`,
    );
    insights.push(`Target protein ${s.targetProtein} g tercapai ${proteinHit} dari ${eb.loggedDays} hari tercatat.`);
  }
  if (trend != null) {
    insights.push(
      `Berat ${trend < 0 ? 'turun' : 'naik'} ${Math.abs(trend).toFixed(2).replace('.', ',')} kg/minggu` +
        (eta ? `; target ${s.goalWeight} kg sekitar ${eta.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}.` : '.'),
    );
    if (tooFast) insights.push('Penurunan lebih dari 1% berat badan per minggu: pertimbangkan naikkan kalori sedikit agar massa otot terjaga.');
  }
  if (active) insights.push(`${active} dari 7 hari terakhir aktif (ride/lari, gym, atau makan tercatat).`);

  return (
    <div className="tab-grid">
      <Card title="Progres Diet Hari Ini" hint={`Target ${formatNumberID(s.tdee)} kcal · ${s.targetProtein} g protein`}>
        <div className="grid grid-cols-2 gap-3 py-1">
          <Ring value={today.kcal} max={s.tdee} label="Kalori" sub={`${formatNumberID(today.kcal)} / ${formatNumberID(s.tdee)} kcal`} />
          <Ring value={today.protein} max={s.targetProtein} label="Protein" sub={`${today.protein} / ${s.targetProtein} g`} />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Stat value={eb.loggedDays ? `${signed(eb.balance / 1000, 1)}k` : '–'} label="Defisit/surplus 7 hari (kcal)" tone={eb.balance < 0 ? 'good' : eb.balance > 0 ? 'warn' : undefined} />
          <Stat value={`${streak} hari`} label="Beruntun catat makan" />
        </div>
        {!eb.loggedDays && (
          <button onClick={() => switchTab('nutrition')} className="w-full mt-3 py-2 rounded-xl text-xs lime-btn">
            Catat makan pertama
          </button>
        )}
      </Card>

      <Card title="Kalori 7 Hari" hint="Batang oranye = di atas target">
        {eb.loggedDays ? (
          <Bars data={days7.map((d) => ({ label: dayLabel(d), value: s.dietLog[d]?.kcal ?? null }))} target={s.tdee} overColor="#F59E0B" format={(v) => formatNumberID(v)} />
        ) : (
          <Empty>Belum ada makanan tercatat minggu ini. Catat makan di tab Diet untuk melihat grafik.</Empty>
        )}
      </Card>

      <Card title="Protein 7 Hari" hint={`Target ${s.targetProtein} g/hari`}>
        {eb.loggedDays ? (
          <Bars data={days7.map((d) => ({ label: dayLabel(d), value: s.dietLog[d]?.protein ?? null }))} target={s.targetProtein} format={(v) => `${Math.round(v)}g`} />
        ) : (
          <Empty>Grafik protein muncul setelah makanan tercatat.</Empty>
        )}
      </Card>

      <Card title="Berat Badan" hint={`Target ${s.goalWeight} kg`}>
        {s.bodyLog.length >= 2 ? (
          <Line data={s.bodyLog.slice(-12).map((e) => ({ label: dateLabel(e.date), value: e.weight }))} goal={s.goalWeight} format={(v) => `${v.toFixed(1)}`} />
        ) : (
          <Empty>Simpan berat badan minimal 2 kali (beda hari) untuk melihat tren.</Empty>
        )}
        <div className="grid grid-cols-3 gap-2 mt-2">
          <Stat value={`${weight.toFixed(1)}`} label="Berat kini (kg)" />
          <Stat value={signed(weight - s.goalWeight)} label="Ke target (kg)" />
          <Stat value={trend != null ? signed(trend, 2) : '–'} label="Laju kg/minggu" tone={tooFast ? 'warn' : trend != null && Math.sign(trend) === Math.sign(s.goalWeight - weight) ? 'good' : undefined} />
          <Stat value={eta ? eta.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '–'} label="Estimasi capai target" />
          <Stat value={bmiV.toFixed(1)} label={`BMI · ${bmiClass(bmiV)}`} />
          <Stat value={`${bf.toFixed(0)}%`} label="Lemak tubuh (est.)" />
        </div>
      </Card>

      <Card title="Catat Ukuran Tubuh" hint="Satu entri per hari; kosongkan yang tidak diukur">
        <div className="grid grid-cols-5 gap-1.5 text-center">
          {BODY_FIELDS.map(({ key, label }) => (
            <label key={key} className="surface-card-alt p-2">
              <span className="text-[9px] opacity-65 block">{label}</span>
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                value={inputs[key]}
                onChange={(e) => setInputs((v) => ({ ...v, [key]: e.target.value }))}
                className="w-full bg-transparent text-center font-display font-bold text-xs outline-none mt-0.5"
              />
            </label>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2.5">
          <button onClick={saveBody} className="flex-1 py-2 rounded-xl text-xs lime-btn">
            Simpan Hari Ini
          </button>
          <label className="surface-card-alt px-2.5 py-1.5 rounded-xl text-[11px] flex items-center gap-1.5">
            Target
            <input
              type="number"
              step="0.5"
              inputMode="decimal"
              value={s.goalWeight}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (v > 20 && v < 400) set((p) => ({ ...p, goalWeight: v }));
              }}
              className="w-12 bg-transparent font-display font-bold outline-none"
              aria-label="Target berat badan (kg)"
            />
            kg
          </label>
        </div>
      </Card>

      <Card title="Lingkar Tubuh" hint="Tren ukuran (cm)">
        <div className="flex gap-1 mb-2">
          {BODY_FIELDS.slice(1).map(({ key, label }) => (
            <button key={key} onClick={() => setMetric(key)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${metric === key ? 'lime-btn' : 'surface-card-alt'}`}>
              {label}
            </button>
          ))}
        </div>
        {s.bodyLog.filter((e) => e[metric] > 0).length >= 2 ? (
          <>
            <Line data={s.bodyLog.filter((e) => e[metric] > 0).slice(-12).map((e) => ({ label: dateLabel(e.date), value: e[metric] }))} format={(v) => v.toFixed(1)} height={130} />
            <p className="text-[11px] opacity-70 mt-1">
              Sejak awal: <strong>{signed(s.bodyLog.filter((e) => e[metric] > 0).slice(-1)[0][metric] - s.bodyLog.filter((e) => e[metric] > 0)[0][metric])} cm</strong>
            </p>
          </>
        ) : (
          <Empty>Ukur minimal 2 kali untuk melihat tren lingkar tubuh.</Empty>
        )}
      </Card>

      <Card title="Aktivitas 7 Hari" hint={`${active}/7 hari aktif`}>
        {kmByDay.some((v) => v > 0) ? (
          <Bars data={days7.map((d, i) => ({ label: dayLabel(d), value: kmByDay[i] || null }))} format={(v) => v.toFixed(1)} height={130} />
        ) : (
          <Empty>Belum ada ride/lari minggu ini.</Empty>
        )}
        <div className="mt-3">
          <div className="text-[11px] font-bold mb-1 opacity-80">Volume gym per sesi (kg)</div>
          {gymSessions.length ? (
            <Bars data={gymSessions.map((g) => ({ label: dateLabel(g.date), value: g.volume }))} format={(v) => `${(v / 1000).toFixed(1)}t`} height={120} />
          ) : (
            <Empty>Simpan sesi di tab Workout → Gym untuk melihat perkembangan volume.</Empty>
          )}
        </div>
      </Card>

      <Card title="Analisis Progres" hint="Dihitung dari data yang kamu catat">
        {insights.length ? (
          <ul className="space-y-2">
            {insights.map((t) => (
              <li key={t} className="surface-card-alt p-3 text-xs leading-relaxed">{t}</li>
            ))}
          </ul>
        ) : (
          <Empty>Catat makan, berat badan, atau rekam ride; analisis muncul otomatis dari datamu.</Empty>
        )}
      </Card>
    </div>
  );
}
