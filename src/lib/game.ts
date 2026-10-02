import { useCallback, useEffect, useState } from "react";

export type Task = { id: string; title: string; xp: number; done: boolean; claimed: boolean };
export type Reward = { id: string; title: string; xp: number; coins: number; at: number };
export type GameState = {
  xp: number;
  coins: number;
  tasks: Task[];
  streak: number;
  best: number;
  lastStreakDay: string | null; // day a reward was last claimed
  today: string;
  history: Record<string, number>; // day -> xp earned
  rewards: Reward[];
};

export const STREAK_PENALTY = 120;
const KEY = "streakforge-v1";

export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b + "T00:00").getTime() - new Date(a + "T00:00").getTime()) / 86400000);

// Level n needs 100*n XP to advance
export function levelInfo(xp: number) {
  let level = 1;
  let rest = xp;
  while (rest >= level * 100) { rest -= level * 100; level++; }
  return { level, into: rest, need: level * 100 };
}

const uid = () => Math.random().toString(36).slice(2, 10);

const initial = (): GameState => ({
  xp: 0, coins: 0, streak: 0, best: 0, lastStreakDay: null, today: dayKey(), history: {}, rewards: [],
  tasks: [
    { id: uid(), title: "Drink a glass of water on waking", xp: 20, done: false, claimed: false },
    { id: uid(), title: "Deep work block — 60 minutes", xp: 50, done: false, claimed: false },
    { id: uid(), title: "30-minute workout", xp: 45, done: false, claimed: false },
    { id: uid(), title: "Read 20 pages", xp: 35, done: false, claimed: false },
  ],
});

export type DayEvent = { kind: "penalty"; lost: number; streak: number } | null;

function rollover(s: GameState): [GameState, DayEvent] {
  const today = dayKey();
  let event: DayEvent = null;
  let next = s;
  if (s.lastStreakDay && s.streak > 0 && daysBetween(s.lastStreakDay, today) > 1) {
    const lost = Math.min(s.xp, STREAK_PENALTY);
    event = { kind: "penalty", lost, streak: s.streak };
    next = { ...next, xp: s.xp - lost, streak: 0 };
  }
  if (s.today !== today) {
    next = { ...next, today, tasks: next.tasks.map((t) => ({ ...t, done: false, claimed: false })) };
  }
  return [next, event];
}

export function useGame() {
  const [state, setState] = useState<GameState | null>(null);
  const [event, setEvent] = useState<DayEvent>(null);

  useEffect(() => {
    let s: GameState;
    try { s = JSON.parse(localStorage.getItem(KEY) || "null") ?? initial(); } catch { s = initial(); }
    const [n, e] = rollover(s);
    setState(n);
    setEvent(e);
  }, []);

  useEffect(() => { if (state) localStorage.setItem(KEY, JSON.stringify(state)); }, [state]);

  const update = useCallback((fn: (s: GameState) => GameState) => setState((s) => (s ? fn(s) : s)), []);

  const addTask = (title: string, xp: number) =>
    update((s) => ({ ...s, tasks: [...s.tasks, { id: uid(), title, xp, done: false, claimed: false }] }));
  const toggle = (id: string) =>
    update((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id && !t.claimed ? { ...t, done: !t.done } : t)) }));
  const remove = (id: string) => update((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));

  const claim = (id: string) => {
    const s = state;
    if (!s) return null;
    const t = s.tasks.find((x) => x.id === id);
    if (!t || !t.done || t.claimed) return null;
    const today = dayKey();
    let { streak, best } = s;
    if (s.lastStreakDay !== today) {
      streak = s.lastStreakDay && daysBetween(s.lastStreakDay, today) === 1 ? streak + 1 : 1;
      best = Math.max(best, streak);
    }
    const bonus = Math.min(streak, 10) * 2; // streak bonus XP
    const xpGain = t.xp + bonus;
    const coins = Math.round(t.xp / 4) + Math.floor(Math.random() * 6);
    const before = levelInfo(s.xp).level;
    const after = levelInfo(s.xp + xpGain).level;
    setState({
      ...s,
      xp: s.xp + xpGain,
      coins: s.coins + coins,
      streak, best,
      lastStreakDay: today,
      history: { ...s.history, [today]: (s.history[today] ?? 0) + xpGain },
      rewards: [{ id: uid(), title: t.title, xp: xpGain, coins, at: Date.now() }, ...s.rewards].slice(0, 6),
      tasks: s.tasks.map((x) => (x.id === id ? { ...x, claimed: true } : x)),
    });
    return { xp: xpGain, coins, leveledTo: after > before ? after : null };
  };

  return { state, event, dismissEvent: () => setEvent(null), addTask, toggle, remove, claim };
}
