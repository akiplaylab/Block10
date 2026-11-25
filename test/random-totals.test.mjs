import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createQuestionSource } from '../src/complement.ts';
import { defaultFavoriteTotals, defaultRandomTotals, drawTotal, mainTotal, parseTotalSelection, selectableTotals } from '../src/random-totals.ts';

test('ランダム出題は各候補に同じ幅の乱数区間を割り当てる', () => {
  const candidates = defaultRandomTotals;
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

test('保存値の個数、範囲、重複を検証する', () => {
  assert.deepEqual(parseTotalSelection(defaultFavoriteTotals, 2, mainTotal), [5, 20]);
  assert.deepEqual(parseTotalSelection(defaultRandomTotals, 3), [5, 15, 20]);
  assert.deepEqual(parseTotalSelection([2, 10, 20], 3), [2, 10, 20]);
  for (const value of [[1, 20], [2, 21], [2, 2], [2.5, 20], ['2', 20], [2], [2, 10, 20]]) {
    assert.equal(parseTotalSelection(value, 2, mainTotal), undefined);
  }
  assert.equal(parseTotalSelection([2, 10], 2, mainTotal), undefined);
});

test('旧範囲設定は限定ランダムの保存値として扱わない', () => {
  for (const value of [
    { preset: 'to-100' },
    { preset: 'standard', max: 20, kind: 'all' },
    { active: { preset: 'custom', min: 2, max: 30, step: 5 } },
  ]) {
    assert.deepEqual(parseTotalSelection(value, 3) ?? defaultRandomTotals, [5, 15, 20]);
  }
});

test('合計 2 の数字選択式でも 1、2、3 を表示する', () => {
  const question = createQuestionSource(2, () => 0);
  for (let index = 0; index < 5; index += 1) {
    const { first, answer, choices } = question(0);
    assert.deepEqual([first, answer], [1, 1]);
    assert.deepEqual([...choices].sort(), [1, 2, 3]);
  }
});

test('ブロック方式と数字入力では従来の候補を使う', () => {
  const question = createQuestionSource(2, () => 0);
  assert.deepEqual(question(0, false).choices, [1]);
});

test('すべての合計で加数を重複なく出題し、異なる選択肢を 3 個表示する', () => {
  for (const total of selectableTotals) {
    const question = createQuestionSource(total, () => 0);
    const seen = new Set();
    for (let index = 0; index < total - 1; index += 1) {
      const { first, answer, choices } = question(0);
      assert.equal(first + answer, total);
      assert.ok(first > 0 && answer > 0);
      assert.ok(choices.every(choice => choice >= 1 && choice <= Math.max(3, total - 1)));
      assert.equal(choices.length, 3);
      assert.equal(new Set(choices).size, 3);
      assert.equal(choices.filter(choice => choice === answer).length, 1);
      seen.add(first);
    }
    assert.equal(seen.size, total - 1);
  }
});
