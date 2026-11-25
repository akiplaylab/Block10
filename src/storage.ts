import type { ComplementRound, Operation } from './complement';
import { defaultFavoriteTotals, defaultRandomTotals, mainTotal, parseTotalSelection } from './random-totals';

const preview = /\/test\/(pr-\d+)\/$/.exec(import.meta.env.BASE_URL)?.[1];
const storagePrefix = import.meta.env.MODE === 'pages-test'
  ? ['block10.test', preview].filter(Boolean).join('.')
  : 'block10';
const soundKey = `${storagePrefix}.sound`;
const answerMethodKey = `${storagePrefix}.answerMethod`;
const favoriteTotalsKey = `${storagePrefix}.favoriteTotals`;
const randomTotalsKey = `${storagePrefix}.randomTotals`;
const operationKey = `${storagePrefix}.operation`;

export function readOperation(): Operation {
  try {
    return localStorage.getItem(operationKey) === 'subtraction' ? 'subtraction' : 'addition';
  } catch {
    return 'addition';
  }
}

export function saveOperation(operation: Operation) {
  try {
    localStorage.setItem(operationKey, operation);
  } catch {
    return;
  }
}

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

export function readFavoriteTotals() {
  return readTotals(favoriteTotalsKey, defaultFavoriteTotals, mainTotal);
}

export function readRandomTotals() {
  return readTotals(randomTotalsKey, defaultRandomTotals);
}

function readTotals(key: string, defaults: readonly number[], excluded?: number) {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    return parseTotalSelection(saved, defaults.length, excluded) ?? [...defaults];
  } catch {
    return [...defaults];
  }
}

export function saveFavoriteTotals(totals: readonly number[]) {
  saveTotals(favoriteTotalsKey, totals);
}

export function saveRandomTotals(totals: readonly number[]) {
  saveTotals(randomTotalsKey, totals);
}

function saveTotals(key: string, totals: readonly number[]) {
  try {
    localStorage.setItem(key, JSON.stringify(totals));
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

export function saveComplementCompletion(round: ComplementRound, operation: Operation, randomMode: boolean) {
  const mode = randomMode ? 'random' : round.total === 10 ? 'makeTen' : 'make' + round.total;
  const key = operation === 'subtraction'
    ? `${storagePrefix}.subtraction.${mode}.history`
    : `${storagePrefix}.${mode}.history`;
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    const history = Array.isArray(saved) ? saved : [];
    history.push({
      ...(randomMode ? { total: round.total } : {}),
      operation,
      first: round.known,
      choices: round.choices,
      attempts: round.attempts,
      attemptCount: round.attempts.length,
      elapsedMs: Math.round(performance.now() - round.startedAt),
      completedAt: new Date().toISOString(),
    });
    localStorage.setItem(key, JSON.stringify(history));
  } catch {
    return;
  }
}
