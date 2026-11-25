import type { AnswerMethod } from './storage';

export const minimumTotal = 2;
export const maximumTotal = 100;

export const randomMaximums = [5, 10, 20, 30, 50, 100] as const;
export const randomKinds = { all: 'すべて', five: '5 の倍数', ten: '10 の倍数' } as const;
type RandomMaximum = typeof randomMaximums[number];
type RandomKind = keyof typeof randomKinds;
type TotalRange = { min: number; max: number; step: number };
export type StandardTotals = { preset: 'standard'; max: RandomMaximum; kind: RandomKind };
export type CustomTotals = { preset: 'custom' } & TotalRange;
export type RandomTotals = StandardTotals | CustomTotals;
export const defaultRandomTotals: StandardTotals = { preset: 'standard', max: 20, kind: 'all' };
export const defaultCustomTotals: CustomTotals = { preset: 'custom', min: 2, max: 20, step: 1 };

const legacyPresets: ReadonlyMap<unknown, RandomTotals> = new Map<unknown, RandomTotals>([
  ['single-digit', { preset: 'custom', min: 2, max: 9, step: 1 }],
  ['two-digits', { preset: 'custom', min: 10, max: 99, step: 1 }],
  ['to-10', { preset: 'standard', max: 10, kind: 'all' }],
  ['to-20', defaultRandomTotals],
  ['to-100', { preset: 'standard', max: 100, kind: 'all' }],
  ['multiples-of-5', { preset: 'standard', max: 100, kind: 'five' }],
  ['multiples-of-10', { preset: 'standard', max: 100, kind: 'ten' }],
]);

export function totalLimit(method: AnswerMethod) {
  return method === 'blocks' ? 20 : maximumTotal;
}

export function candidateTotals({ min, max, step }: TotalRange) {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < minimumTotal ||
      max > maximumTotal || min > max || ![1, 5, 10].includes(step)) return [];
  return Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, index) => min + index * step);
}

export function configuredRange(config: RandomTotals) {
  if (config.preset === 'custom') return config;
  if (config.kind === 'five') return { min: 5, max: config.max, step: 5 };
  if (config.kind === 'ten') return { min: 10, max: config.max, step: 10 };
  return { min: minimumTotal, max: config.max, step: 1 };
}

export function parseRandomTotals(value: unknown): RandomTotals | undefined {
  if (typeof value !== 'object' || value === null || !('preset' in value)) return;
  const { preset } = value;
  if (preset === 'standard' && 'max' in value && 'kind' in value) {
    const { max: savedMax, kind } = value;
    const max = randomMaximums.find(option => option === savedMax);
    if (max && (kind === 'all' || kind === 'five' || kind === 'ten')) {
      const config: StandardTotals = { preset, max, kind };
      if (candidateTotals(configuredRange(config)).length) return config;
    }
  }
  if (preset !== 'custom') return legacyPresets.get(preset);
  if (preset !== 'custom' || !('min' in value) || !('max' in value) || !('step' in value)) return;
  const { min, max, step } = value;
  if (typeof min !== 'number' || typeof max !== 'number' || typeof step !== 'number') return;
  if (candidateTotals({ min, max, step }).length) return { preset, min, max, step };
}

export function drawTotal(candidates: readonly number[], random = Math.random) {
  return candidates[Math.floor(random() * candidates.length)];
}
