import './style.css';
import { enableSound, playSound } from './audio';
import { burst, fly, pause } from './effects';
import { rowSize } from './game';
import { createQuestionSource, type MakeTenRound } from './make-ten';
import { readSound, saveMakeTenCompletion, saveSound } from './storage';

function element<T extends HTMLElement = HTMLElement>(id: string) {
  return document.getElementById(id) as T;
}

const title = element('title');
const game = element('game');
const play = element<HTMLButtonElement>('play');
const home = element<HTMLButtonElement>('home');
const sound = element<HTMLButtonElement>('sound');
const hint = element<HTMLButtonElement>('hint');
const next = element<HTMLButtonElement>('next');
const supply = element('supply');
const score = element('score');
const result = element('result');
const feedback = element('feedback');
const overflow = element('overflow');
const first = element('first');
const second = element('second');
const effects = element('effects');
const row = element('top-row');
const board = row.parentElement!;
const question = createQuestionSource();

game.classList.add('make-ten');
const cells = Array.from({ length: rowSize }, () => {
  const cell = document.createElement('div');
  row.append(cell);
  return cell;
});
const rainbow = document.createElement('div');
rainbow.className = 'ten-block';
rainbow.textContent = '10';
rainbow.hidden = true;
row.append(rainbow);

let round: MakeTenRound | undefined;
let phase: 'choosing' | 'animating' | 'complete' = 'choosing';
let collected = 0;
let soundEnabled = readSound();
let hintTimer: number | undefined;

function showSound() {
  sound.setAttribute('aria-pressed', String(soundEnabled));
  element('sound-state').textContent = soundEnabled ? 'ON' : 'OFF';
}

function showScore() {
  score.textContent = `🌈 × ${collected}`;
}

function clearHint() {
  window.clearTimeout(hintTimer);
  cells.forEach(cell => cell.classList.remove('glow'));
}

function orangeBlock() {
  const block = document.createElement('span');
  block.className = 'block orange';
  return block;
}

function makeChoice(current: MakeTenRound, quantity: number) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'choice';
  button.setAttribute('aria-label', `${quantity}こ`);

  const number = document.createElement('span');
  number.className = 'choice-number';
  number.textContent = String(quantity);
  const pieces = document.createElement('span');
  pieces.className = 'choice-pieces';
  pieces.setAttribute('aria-hidden', 'true');
  const blocks = Array.from({ length: quantity }, orangeBlock);
  pieces.append(...blocks);
  button.append(number, pieces);
  button.addEventListener('click', () => void choose(current, quantity, button, blocks));
  return button;
}

function setInputEnabled(enabled: boolean) {
  hint.setAttribute('aria-disabled', String(!enabled));
  supply.querySelectorAll('button').forEach(button => {
    button.setAttribute('aria-disabled', String(!enabled));
  });
}

function describeBoard(current: MakeTenRound) {
  board.setAttribute('aria-label', `あお ${current.first}こ、あき ${current.answer}マス`);
}

function begin() {
  const current = question(performance.now());
  round = current;
  phase = 'choosing';

  clearHint();
  effects.replaceChildren();
  feedback.textContent = '';
  overflow.replaceChildren();
  title.hidden = true;
  game.hidden = false;
  document.body.classList.add('playing');
  home.hidden = false;
  score.hidden = false;
  showScore();
  hint.hidden = false;
  next.hidden = true;
  result.hidden = true;
  supply.hidden = false;
  first.textContent = String(current.first);
  second.textContent = '?';
  second.classList.remove('solved');
  element('answer').textContent = String(rowSize);
  row.classList.remove('merged', 'flash');
  rainbow.hidden = true;
  cells.forEach((cell, index) => {
    cell.className = index < current.first ? 'cell block blue' : 'cell';
  });
  describeBoard(current);
  const choices = current.choices.map(quantity => makeChoice(current, quantity));
  supply.replaceChildren(...choices);
  setInputEnabled(true);
  choices[0].focus({ preventScroll: true });
}

async function choose(current: MakeTenRound, quantity: number, button: HTMLButtonElement, blocks: HTMLElement[]) {
  if (round !== current || phase !== 'choosing') return;

  phase = 'animating';
  clearHint();
  setInputEnabled(false);
  enableSound(soundEnabled);
  const correct = quantity === current.answer;
  current.attempts.push({ selected: quantity, correct });

  const destinations = cells.slice(current.first, current.first + quantity);
  const flyers = destinations.map((destination, index) => fly(effects, blocks[index], destination));
  button.classList.add('chosen');
  await pause(210);
  flyers.forEach(flyer => flyer.remove());
  if (round !== current) return;

  destinations.forEach(cell => cell.classList.add('block', 'orange', correct ? 'land' : 'trial'));
  if (!correct) {
    const extra = quantity - current.answer;
    feedback.textContent = extra > 0 ? 'ちょっと おおいね' : 'ちょっと たりないね';
    overflow.replaceChildren(...Array.from({ length: Math.max(0, extra) }, orangeBlock));
    await new Promise<void>(resolve => window.setTimeout(resolve, 950));
    if (round !== current) return;

    destinations.forEach(cell => { cell.className = 'cell'; });
    button.classList.remove('chosen');
    feedback.textContent = '';
    overflow.replaceChildren();
    phase = 'choosing';
    setInputEnabled(true);
    return;
  }

  playSound('place');
  row.classList.add('flash');
  await pause(155);
  if (round !== current) return;

  row.classList.remove('flash');
  row.classList.add('merged');
  rainbow.hidden = false;
  board.setAttribute('aria-label', 'にじの 10 が 1こ');
  burst(effects, row, 12);
  playSound('ten');
  await pause(280);
  if (round !== current) return;

  phase = 'complete';
  collected += 1;
  showScore();
  saveMakeTenCompletion(current);
  second.textContent = String(quantity);
  second.classList.add('solved');
  supply.hidden = true;
  hint.hidden = true;
  result.hidden = false;
  next.hidden = false;
  burst(effects, result, 10);
  playSound('success');
  next.focus({ preventScroll: true });
}

play.addEventListener('click', () => {
  if (!game.hidden) return;
  enableSound(soundEnabled);
  collected = 0;
  begin();
});

home.addEventListener('click', () => {
  round = undefined;
  clearHint();
  effects.replaceChildren();
  game.hidden = true;
  document.body.classList.remove('playing');
  home.hidden = true;
  score.hidden = true;
  title.hidden = false;
  play.focus({ preventScroll: true });
});

sound.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  enableSound(soundEnabled);
  saveSound(soundEnabled);
  showSound();
});

next.addEventListener('click', () => {
  if (round && phase === 'complete') begin();
});

hint.addEventListener('click', () => {
  if (!round || phase !== 'choosing') return;
  clearHint();
  round.hintCount += 1;
  cells.slice(round.first).forEach(cell => cell.classList.add('glow'));
  hintTimer = window.setTimeout(clearHint, 1450);
});

showSound();
