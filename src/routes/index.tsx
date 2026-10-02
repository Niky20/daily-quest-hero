import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent, type MouseEvent } from "react";
import confetti from "canvas-confetti";
import { dayKey, levelInfo, STREAK_PENALTY, useGame } from "@/lib/game";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StreakForge — Gamified Daily Quest Planner" },
      { name: "description", content: "Turn your daily tasks into quests. Build streaks, claim rewards, earn XP and coins, and level up." },
      { property: "og:title", content: "StreakForge — Gamified Daily Quest Planner" },
      { property: "og:description", content: "Build streaks, claim rewards and level up your real life." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const CONFETTI = ["#ff4d8d", "#35e6ff", "#ffcf5c", "#9b6bff", "#34d399"];

function Index() {
  const { state, event, dismissEvent, addTask, toggle, remove, claim } = useGame();
  const [title, setTitle] = useState("");
  const [xp, setXp] = useState(30);
  const [floaters, setFloaters] = useState<{ id: number; text: string; x: number; y: number }[]>([]);
  const [levelUp, setLevelUp] = useState<number | null>(null);

  if (!state) return <div className="min-h-screen bg-void" />;

  const lvl = levelInfo(state.xp);
  const done = state.tasks.filter((t) => t.done).length;
  const today = dayKey();
  const claimedToday = state.lastStreakDay === today;

  const onAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask(title.trim().slice(0, 120), xp);
    setTitle("");
  };

  const onClaim = (id: string, e: MouseEvent<HTMLButtonElement>) => {
    const r = claim(id);
    if (!r) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const origin = { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight };
    confetti({ particleCount: 90, spread: 75, startVelocity: 38, origin, colors: CONFETTI });
    const fid = Date.now();
    setFloaters((f) => [...f, { id: fid, text: `+${r.xp} XP · +${r.coins} 🪙`, x: rect.left + rect.width / 2, y: rect.top }]);
    setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== fid)), 1400);
    if (r.leveledTo) {
      setLevelUp(r.leveledTo);
      setTimeout(() => {
        confetti({ particleCount: 160, spread: 120, origin: { y: 0.5 }, colors: CONFETTI, scalar: 1.2 });
      }, 250);
    }
  };

  // last 7 days
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const k = dayKey(d);
    return { k, label: d.toLocaleDateString("en", { weekday: "narrow" }), xp: state.history[k] ?? 0 };
  });
  const maxWeek = Math.max(60, ...week.map((w) => w.xp));

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-void text-ink">
      <div className="pointer-events-none absolute inset-0 bg-sky" />
      <div className="pointer-events-none absolute -right-32 -top-40 size-[440px] rounded-full bg-royal/25 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-40 -left-28 size-[460px] rounded-full bg-emerald/20 blur-[130px]" />
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <span className="animate-twinkle absolute left-[14%] top-[18%] size-1 rounded-full bg-ink/70" />
        <span className="animate-twinkle absolute left-[70%] top-[10%] size-1 rounded-full bg-emerald/70 [animation-delay:1s]" />
        <span className="animate-twinkle absolute left-[86%] top-[44%] size-1 rounded-full bg-royal/70 [animation-delay:2s]" />
        <span className="animate-twinkle absolute left-[40%] top-[70%] size-1 rounded-full bg-ink/60 [animation-delay:.5s]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-8 sm:px-5 sm:py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-brand text-lg font-extrabold text-void">✦</span>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight">StreakForge</h1>
              <p className="text-[11px] text-ink/40">daily quest log · lvl {lvl.level}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1.5 text-xs font-bold text-gold">🪙 {state.coins.toLocaleString()}</span>
            <span className="rounded-full border border-crimson/30 bg-crimson/10 px-3.5 py-1.5 text-xs font-bold text-crimson">🔥 {state.streak}</span>
          </div>
        </header>

        {/* Level bar */}
        <div className="glass-panel mt-6 p-5">
          <div className="flex items-center gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl border border-royal/40 bg-royal/15">
              <span className="font-mono text-2xl font-extrabold text-royal">{lvl.level}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="eyebrow">Level {lvl.level} · {state.xp.toLocaleString()} total XP</p>
                <span className="font-mono text-xs font-bold text-emerald">{lvl.into}/{lvl.need} XP</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-ink/10">
                <div className="h-full rounded-full bg-xp transition-all duration-700" style={{ width: `${(lvl.into / lvl.need) * 100}%` }} />
              </div>
              <p className="mt-1.5 text-[11px] text-ink/40">{lvl.need - lvl.into} XP to level {lvl.level + 1}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
          <aside className="lg:col-span-4">
            <div className="glass-panel p-6 shadow-royal">
              <p className="eyebrow">Current streak</p>
              <div className="mt-1 flex items-end gap-2">
                <span className="font-mono text-6xl font-extrabold leading-none text-crimson">{state.streak}</span>
                <span className="mb-1.5 text-sm font-semibold text-ink/50">{state.streak === 1 ? "day" : "days"}</span>
              </div>
              <p className="mt-3 text-xs text-ink/50">
                Best record <span className="font-mono font-bold text-emerald">{state.best}</span> · keep the flame alive
              </p>
              <div className="mt-6 grid grid-cols-7 gap-2">
                {week.map((w) => {
                  const isToday = w.k === today;
                  const hit = w.xp > 0;
                  return (
                    <div key={w.k} className="flex flex-col items-center gap-1">
                      <span
                        className={`grid aspect-square w-full place-items-center rounded-lg text-xs font-bold ${
                          hit ? "bg-streak text-ink" : isToday ? "border border-gold/40 bg-gold/15 text-gold" : "border border-ink/10 text-ink/25"
                        }`}
                      >
                        {hit ? "✓" : isToday ? "★" : "·"}
                      </span>
                      <span className="text-[10px] text-ink/35">{w.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className={`mt-5 flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] ${claimedToday ? "border-good/30 bg-good/10 text-good" : "border-bad/30 bg-bad/10 text-bad"}`}>
                <span>{claimedToday ? "✓" : "⚠"}</span>
                <span>
                  {claimedToday ? (
                    "Streak secured for today. See you tomorrow!"
                  ) : (
                    <>Miss a day and lose <span className="font-mono font-bold">{STREAK_PENALTY}</span> XP</>
                  )}
                </span>
              </div>
            </div>
          </aside>

          <main className="lg:col-span-8">
            <div className="glass-panel p-5 shadow-emerald sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="eyebrow">Today's quests</p>
                  <p className="text-lg font-extrabold">{done} of {state.tasks.length} cleared</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2.5 w-32 overflow-hidden rounded-full bg-ink/10 sm:w-40">
                    <div className="h-full rounded-full bg-xp transition-all duration-500" style={{ width: `${state.tasks.length ? (done / state.tasks.length) * 100 : 0}%` }} />
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald">{state.history[today] ?? 0} XP today</span>
                </div>
              </div>

              <ul className="mt-6 space-y-3">
                {state.tasks.length === 0 && (
                  <li className="rounded-2xl border border-dashed border-ink/15 px-4 py-6 text-center text-sm text-ink/40">No quests yet. Add your first one below.</li>
                )}
                {state.tasks.map((t) => {
                  const ready = t.done && !t.claimed;
                  return (
                    <li
                      key={t.id}
                      className={`group rounded-2xl border px-4 py-3.5 transition-colors ${
                        ready ? "border-emerald/30 bg-emerald/10" : t.claimed ? "border-good/25 bg-good/5" : "border-ink/10 bg-ink/5"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <button
                            onClick={() => toggle(t.id)}
                            disabled={t.claimed}
                            aria-label={t.done ? "Mark as not done" : "Mark as done"}
                            className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold transition ${
                              t.claimed ? "bg-good/20 text-good" : t.done ? "bg-emerald/20 text-emerald" : "border border-ink/20 hover:border-emerald"
                            }`}
                          >
                            {t.done ? "✓" : ""}
                          </button>
                          <p className={`min-w-0 break-words font-semibold ${t.claimed ? "text-ink/55 line-through" : ""}`}>{t.title}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {ready ? (
                            <button
                              onClick={(e) => onClaim(t.id, e)}
                              className="animate-claim rounded-full bg-claim px-5 py-2 text-sm font-extrabold text-ink"
                            >
                              Claim Reward ✦
                            </button>
                          ) : (
                            <span className={`font-mono text-[11px] font-bold ${t.claimed ? "text-gold" : "text-ink/40"}`}>
                              {t.claimed ? "Claimed" : `+${t.xp} XP`}
                            </span>
                          )}
                          {!t.claimed && (
                            <button
                              onClick={() => remove(t.id)}
                              aria-label="Delete quest"
                              className="rounded-md px-1.5 text-ink/30 opacity-100 transition hover:text-bad sm:opacity-0 sm:group-hover:opacity-100"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <form onSubmit={onAdd} className="mt-5 flex flex-col gap-2 rounded-2xl border border-dashed border-ink/15 px-4 py-3 sm:flex-row sm:items-center">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="+ Add a new daily quest…"
                  className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink/40 focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <select
                    value={xp}
                    onChange={(e) => setXp(Number(e.target.value))}
                    className="rounded-lg border border-ink/15 bg-popover px-2 py-1 font-mono text-xs text-ink"
                    aria-label="Difficulty"
                  >
                    <option value={15}>Easy · 15 XP</option>
                    <option value={30}>Normal · 30 XP</option>
                    <option value={50}>Hard · 50 XP</option>
                    <option value={80}>Epic · 80 XP</option>
                  </select>
                  <button type="submit" className="font-mono text-xs font-bold text-royal hover:text-emerald">Enter ↵</button>
                </div>
              </form>
              <p className="mt-3 text-[11px] text-ink/35">Quests reset every day. Claim at least one reward daily to grow your streak (+2 bonus XP per streak day).</p>
            </div>
          </main>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="glass-panel p-6">
            <p className="eyebrow">Weekly XP</p>
            <div className="mt-5 flex h-28 items-end justify-between gap-3">
              {week.map((w) => (
                <div key={w.k} className="flex flex-col items-center gap-2">
                  <span
                    className={`w-7 rounded-t-md ${w.k === today ? "bg-streak ring-2 ring-gold/40" : "bg-xp"}`}
                    style={{ height: `${Math.max(4, (w.xp / maxWeek) * 96)}px` }}
                    title={`${w.xp} XP`}
                  />
                  <span className={`text-[11px] ${w.k === today ? "font-bold text-gold" : "text-ink/40"}`}>{w.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-panel p-6">
            <p className="eyebrow">Recent rewards</p>
            <div className="mt-4 space-y-3">
              {state.rewards.length === 0 && <p className="text-sm text-ink/40">Complete a quest and claim your first reward.</p>}
              {state.rewards.slice(0, 4).map((r, i) => (
                <div key={r.id} className="flex items-center gap-3">
                  <span className={`grid size-9 place-items-center rounded-xl text-lg ${["bg-gold/15", "bg-royal/15", "bg-crimson/15", "bg-emerald/15"][i % 4]}`}>
                    {["🪙", "⚡", "🎁", "💎"][i % 4]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.title}</p>
                    <p className="text-[11px] text-ink/40">+{r.xp} XP · +{r.coins} coins</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {floaters.map((f) => (
        <span
          key={f.id}
          className="animate-float-up pointer-events-none fixed z-50 -translate-x-1/2 whitespace-nowrap font-mono text-sm font-bold text-gold"
          style={{ left: f.x, top: f.y }}
        >
          {f.text}
        </span>
      ))}

      {(levelUp || event) && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-void/70 p-4 backdrop-blur-sm">
          <div className="glass-panel animate-pop w-full max-w-sm p-8 text-center shadow-royal">
            {levelUp ? (
              <>
                <p className="eyebrow">Level up!</p>
                <p className="mt-2 font-mono text-7xl font-extrabold text-royal">{levelUp}</p>
                <p className="mt-3 text-sm text-ink/60">You're getting stronger. Keep the quests coming.</p>
                <button onClick={() => setLevelUp(null)} className="mt-6 rounded-full bg-claim px-6 py-2.5 text-sm font-extrabold text-ink shadow-claim">Continue ✦</button>
              </>
            ) : event ? (
              <>
                <p className="eyebrow">Streak broken</p>
                <p className="mt-2 text-5xl">💔</p>
                <p className="mt-3 text-sm text-ink/70">
                  Your {event.streak}-day streak ended. You lost <span className="font-mono font-bold text-bad">{event.lost} XP</span>.
                </p>
                <button onClick={dismissEvent} className="mt-6 rounded-full bg-claim px-6 py-2.5 text-sm font-extrabold text-ink shadow-claim">Start a new streak</button>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
