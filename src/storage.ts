import type { Round } from './game';

type Completion = {
  problemIndex: number;
  addends: [number, number];
  completedAt: string;
  hintCount: number;
  elapsedMs: number;
};

const soundKey = 'block10.sound';
const historyKey = 'block10.history';

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
