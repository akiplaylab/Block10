import type { AnswerMethod } from './storage';

export const minimumTotal = 2;
export const maximumTotal = 100;

export const randomPresets = {
  'single-digit': { label: '1 桁', min: 2, max: 9, step: 1 },
  'to-10': { label: '10 まで', min: 2, max: 10, step: 1 },
  'to-20': { label: '20 まで', min: 2, max: 20, step: 1 },
  'two-digits': { label: '2 桁', min: 10, max: 99, step: 1 },
  'multiples-of-5': { label: '5 の倍数', min: 5, max: 100, step: 5 },
  'multiples-of-10': { label: '10 の倍数', min: 10, max: 100, step: 10 },
  'to-100': { label: '100 まで', min: 2, max: 100, step: 1 },
} as const;

type Preset = keyof typeof randomPresets;
type TotalRange = { min: number; max: number; step: number };
export type RandomTotals = { preset: Preset } | ({ preset: 'custom' } & TotalRange);
export const defaultRandomTotals: RandomTotals = { preset: 'to-20' };

export function totalLimit(method: AnswerMethod) {
  return method === 'blocks' ? 20 : maximumTotal;
}

export function candidateTotals({ min, max, step }: TotalRange) {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < minimumTotal ||
      max > maximumTotal || min > max || ![1, 5, 10].includes(step)) return [];
  return Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, index) => min + index * step);
}

export function configuredRange(config: RandomTotals) {
  return config.preset === 'custom' ? config : randomPresets[config.preset];
}

export function parseRandomTotals(value: unknown): RandomTotals | undefined {
  if (typeof value !== 'object' || value === null || !('preset' in value)) return;
  const { preset } = value;
  if (typeof preset !== 'string') return;
  if (Object.prototype.hasOwnProperty.call(randomPresets, preset)) return { preset: preset as Preset };
  if (preset !== 'custom' || !('min' in value) || !('max' in value) || !('step' in value)) return;
  const { min, max, step } = value;
  if (typeof min !== 'number' || typeof max !== 'number' || typeof step !== 'number') return;
  if (candidateTotals({ min, max, step }).length) return { preset, min, max, step };
}

export function drawTotal(candidates: readonly number[], random = Math.random) {
  return candidates[Math.floor(random() * candidates.length)];
}
