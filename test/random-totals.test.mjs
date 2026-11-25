import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createQuestionSource } from '../src/complement.ts';
import { candidateTotals, configuredRange, drawTotal, parseRandomTotals, totalLimit } from '../src/random-totals.ts';

test('ランダム出題は各候補に同じ幅の乱数区間を割り当てる', () => {
  const candidates = candidateTotals({ min: 2, max: 24, step: 5 });
  assert.deepEqual(candidates, [2, 7, 12, 17, 22]);
  const drawsPerCandidate = 100;
  const samples = candidates.length * drawsPerCandidate;
  const counts = new Map();
  for (let index = 0; index < samples; index += 1) {
    const total = drawTotal(candidates, () => (index + 0.5) / samples);
    counts.set(total, (counts.get(total) ?? 0) + 1);
  }
  assert.deepEqual([...counts], candidates.map(total => [total, drawsPerCandidate]));
  assert.equal(drawTotal([], () => 0), undefined);
});

test('候補の境界と不正な保存値を検証する', () => {
  const config = parseRandomTotals({ preset: 'to-100' });
  const candidates = candidateTotals(configuredRange(config));
  assert.equal(candidates.length, 99);
  assert.equal(drawTotal(candidates, () => 0), 2);
  assert.equal(drawTotal(candidates, () => 0.9999), 100);
  for (const [min, max, step] of [[1, 10, 1], [2, 101, 1], [15, 10, 1], [2, 10, 0], [2, 10, 2], [2.5, 10, 5], [2, NaN, 1], ['', 20, 1]]) {
    assert.deepEqual(candidateTotals({ min, max, step }), []);
    assert.equal(parseRandomTotals({ preset: 'custom', min, max, step }), undefined);
  }
  assert.deepEqual(parseRandomTotals({ preset: 'custom', min: 100, max: 100, step: 10 }),
    { preset: 'custom', min: 100, max: 100, step: 10 });
  assert.equal(parseRandomTotals({ preset: 'constructor' }), undefined);
  assert.deepEqual(['blocks', 'choices', 'input'].map(totalLimit), [20, 100, 100]);
});

test('通常設定は上限までの倍数を使い、候補が空になる組み合わせを拒否する', () => {
  const config = { preset: 'standard', max: 30, kind: 'five' };
  assert.deepEqual(parseRandomTotals(config), config);
  assert.deepEqual(candidateTotals(configuredRange(config)), [5, 10, 15, 20, 25, 30]);
  assert.equal(parseRandomTotals({ preset: 'standard', max: 5, kind: 'ten' }), undefined);
});

test('旧プリセットとカスタムの候補を移行後も維持する', () => {
  const expected = {
    'single-digit': { min: 2, max: 9, step: 1 },
    'to-10': { min: 2, max: 10, step: 1 },
    'to-20': { min: 2, max: 20, step: 1 },
    'two-digits': { min: 10, max: 99, step: 1 },
    'multiples-of-5': { min: 5, max: 100, step: 5 },
    'multiples-of-10': { min: 10, max: 100, step: 10 },
    'to-100': { min: 2, max: 100, step: 1 },
  };
  for (const [preset, range] of Object.entries(expected)) {
    const config = parseRandomTotals({ preset });
    assert.deepEqual(candidateTotals(configuredRange(config)), candidateTotals(range));
  }
  const custom = { preset: 'custom', min: 7, max: 24, step: 5 };
  assert.deepEqual(parseRandomTotals(custom), custom);
});

test('合計 2 を繰り返しても正の加数と選択肢が壊れない', () => {
  const question = createQuestionSource(2, () => 0);
  for (let index = 0; index < 5; index += 1) {
    const { first, answer, choices } = question(0);
    assert.deepEqual([first, answer, choices], [1, 1, [1]]);
  }
});

test('合計 100 でも加数を重複なく出題し、選択肢を範囲内に保つ', () => {
  const question = createQuestionSource(100, () => 0);
  const seen = new Set();
  for (let index = 0; index < 99; index += 1) {
    const { first, answer, choices } = question(0);
    assert.equal(first + answer, 100);
    assert.ok(first > 0 && answer > 0);
    assert.ok(choices.every(choice => choice >= 1 && choice <= 99));
    assert.equal(new Set(choices).size, 3);
    assert.ok(choices.includes(answer));
    seen.add(first);
  }
  assert.equal(seen.size, 99);
});
