import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyInput } from '../src/complement.ts';

test('exact answers complete on the last digit', () => {
  assert.equal(classifyInput('4', 4), 'correct');
  assert.equal(classifyInput('1', 1), 'correct');
  assert.equal(classifyInput('13', 13), 'correct');
  assert.equal(classifyInput('10', 10), 'correct');
});

test('a matching first digit waits for the second digit', () => {
  assert.equal(classifyInput('1', 13), 'prefix');
  assert.equal(classifyInput('1', 10), 'prefix');
});

test('mismatches are rejected at either digit', () => {
  assert.equal(classifyInput('7', 13), 'incorrect');
  assert.equal(classifyInput('15', 13), 'incorrect');
  assert.equal(classifyInput('0', 4), 'incorrect');
  assert.equal(classifyInput('04', 4), 'incorrect');
});
