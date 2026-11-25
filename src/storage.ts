import type { Round } from './game';
import type { ComplementRound } from './complement';
import { defaultRandomTotals, parseRandomTotals, type RandomTotals } from './random-totals';

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
const answerMethodKey = `${storagePrefix}.answerMethod`;
const randomTotalsKey = `${storagePrefix}.randomTotals`;

export type AnswerMethod = 'blocks' | 'choices' | 'input';

export function isAnswerMethod(value: unknown): value is AnswerMethod {
  return value === 'blocks' || value === 'choices' || value === 'input';
}

export function readAnswerMethod(): AnswerMethod {
  try {
    const value = localStorage.getItem(answerMethodKey);
    return isAnswerMethod(value) ? value : 'blocks';
  } catch {
    return 'blocks';
  }
}

export function saveAnswerMethod(method: AnswerMethod) {
  try {
    localStorage.setItem(answerMethodKey, method);
  } catch {
    return;
  }
}

export function readRandomTotals() {
  try {
    return parseRandomTotals(JSON.parse(localStorage.getItem(randomTotalsKey) ?? 'null')) ?? defaultRandomTotals;
  } catch {
    return defaultRandomTotals;
  }
}

export function saveRandomTotals(config: RandomTotals) {
  try {
    localStorage.setItem(randomTotalsKey, JSON.stringify(config));
  } catch {
    return;
  }
}

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

export function saveComplementCompletion(round: ComplementRound, randomMode = false) {
  const mode = randomMode ? 'random' : round.total === 10 ? 'makeTen' : 'make' + round.total;
  const key = `${storagePrefix}.${mode}.history`;
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    const history = Array.isArray(saved) ? saved : [];
    history.push({
      ...(randomMode ? { total: round.total } : {}),
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
