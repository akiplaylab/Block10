import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyInput } from '../src/complement.ts';

test('exact answers complete on the last digit', () => {
  for (let answer = 1; answer < 20; answer += 1) {
    assert.equal(classifyInput(String(answer), answer), 'correct');
  }
});

test('a matching first digit waits for the second digit', () => {
  for (let answer = 10; answer < 20; answer += 1) {
    assert.equal(classifyInput('1', answer), 'prefix');
  }
});

test('mismatches are rejected at either digit', () => {
  assert.equal(classifyInput('7', 13), 'incorrect');
  assert.equal(classifyInput('15', 13), 'incorrect');
  assert.equal(classifyInput('0', 4), 'incorrect');
  assert.equal(classifyInput('04', 4), 'incorrect');
});
