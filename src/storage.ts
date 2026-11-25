import type { Round } from './game';
import type { ComplementRound } from './complement';

type Completion = {
  problemIndex: number;
  addends: [number, number];
  completedAt: string;
  hintCount: number;
  elapsedMs: number;
};

const preview = /\/test\/(pr-\d+)\/$/.exec(import.meta.env.BASE_URL)?.[1];
const storagePrefix = import.meta.env.MODE === 'pages-test'
  ? ['block10.test', preview].filter(Boolean).join('.')
  : 'block10';
const soundKey = `${storagePrefix}.sound`;
const historyKey = `${storagePrefix}.history`;

export function readSound() {
  try {
    return localStorage.getItem(soundKey) !== 'off';
  } catch {
    return true;
  }
}

export function saveSound(enabled: boolean) {
  try {
    localStorage.setItem(soundKey, enabled ? 'on' : 'off');
  } catch {
    return;
  }
}

export function saveCompletion(round: Round) {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(historyKey) ?? '[]');
    const history: Completion[] = Array.isArray(saved) ? saved : [];
    history.push({
      problemIndex: round.index,
      addends: [round.first, round.second],
      completedAt: new Date().toISOString(),
      hintCount: round.hints,
      elapsedMs: Math.round(performance.now() - round.startedAt),
    });
    localStorage.setItem(historyKey, JSON.stringify(history));
  } catch {
    return;
  }
}

export function saveComplementCompletion(round: ComplementRound) {
  const key = `${storagePrefix}.${round.total === 10 ? 'makeTen' : 'make' + round.total}.history`;
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    const history = Array.isArray(saved) ? saved : [];
    history.push({
      first: round.first,
      choices: round.choices,
      attempts: round.attempts,
      attemptCount: round.attempts.length,
      hintCount: round.hintCount,
      elapsedMs: Math.round(performance.now() - round.startedAt),
      completedAt: new Date().toISOString(),
    });
    localStorage.setItem(key, JSON.stringify(history));
  } catch {
    return;
  }
}
