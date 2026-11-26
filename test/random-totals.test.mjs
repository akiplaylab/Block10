import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createQuestionSource, equationFor, recordAttempt } from '../src/complement.ts';
import { defaultFavoriteTotals, defaultRandomTotals, drawTotal, mainTotal, parseRandomTotals, parseTotalSelection, selectableTotals } from '../src/random-totals.ts';

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

test('ランダム出題の保存値は重複のない 2〜3 種類を受け入れる', () => {
  assert.deepEqual(parseRandomTotals([2, 20]), [2, 20]);
  assert.deepEqual(parseRandomTotals(defaultRandomTotals), [5, 15, 20]);
  for (const value of [[5], [2, 5, 10, 20], [5, 5], [2, 5, 5], [1, 20], [2, 21]]) {
    assert.equal(parseRandomTotals(value), undefined);
  }
});

test('合計 2 を繰り返しても正の加数と選択肢が壊れない', () => {
  const question = createQuestionSource(2, () => 0);
  for (let index = 0; index < 5; index += 1) {
    const { known, answer, choices } = question(0);
    assert.deepEqual([known, answer, choices], [1, 1, [1]]);
  }
});

test('合計 20 でも加数を重複なく出題し、選択肢を範囲内に保つ', () => {
  const question = createQuestionSource(20, () => 0);
  const seen = new Set();
  for (let index = 0; index < 19; index += 1) {
    const { known, answer, choices } = question(0);
    assert.equal(known + answer, 20);
    assert.ok(known > 0 && answer > 0);
    assert.ok(choices.every(choice => choice >= 1 && choice <= 19));
    assert.equal(new Set(choices).size, 3);
    assert.ok(choices.includes(answer));
    seen.add(known);
  }
  assert.equal(seen.size, 19);
});

test('2〜20 の各組み合わせで足し算と引き算の第2項が一致し、誤答後も正解できる', () => {
  for (const total of selectableTotals) {
    const question = createQuestionSource(total, () => 0);
    for (let index = 1; index < total; index += 1) {
      const round = question(0);
      const addition = equationFor(round, 'addition');
      const subtraction = equationFor(round, 'subtraction');
      assert.deepEqual(addition, { first: round.known, symbol: '+', result: total });
      assert.deepEqual(subtraction, { first: total, symbol: '−', result: round.known });
      assert.equal(addition.first + round.answer, addition.result);
      assert.equal(subtraction.first - round.answer, subtraction.result);
      assert.ok(round.choices.includes(round.answer));
      assert.equal(recordAttempt(round, 0), false);
      assert.equal(recordAttempt(round, round.answer), true);
      assert.deepEqual(round.attempts, [
        { selected: 0, correct: false },
        { selected: round.answer, correct: true },
      ]);
    }
  }
});
