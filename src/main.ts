import './style.css';
import { enableSound, playSound } from './audio';
import { nextProblem, nextSlot, placeBlock, rowSize, startProblem, type Round } from './game';
import { readSound, saveCompletion, saveSound } from './storage';

function element<T extends HTMLElement = HTMLElement>(id: string) {
  return document.getElementById(id) as T;
}

const title = element('title');
const game = element('game');
const home = element<HTMLButtonElement>('home');
const sound = element<HTMLButtonElement>('sound');
const hint = element<HTMLButtonElement>('hint');
const next = element<HTMLButtonElement>('next');
const supply = element('supply');
const result = element('result');
const answer = element('answer');
const effects = element('effects');
const rows = [element('top-row'), element('bottom-row')];
const board = rows[0].parentElement!;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

const cells = rows.flatMap(row => Array.from({ length: rowSize }, () => {
  const cell = document.createElement('div');
  cell.className = 'cell';
  row.append(cell);
  return cell;
}));

const rainbow = document.createElement('div');
rainbow.className = 'ten-block';
rainbow.textContent = '10';
rainbow.hidden = true;
rows[0].append(rainbow);

let round: Round | undefined;
let soundEnabled = readSound();
let moving = false;
let hintTimer: number | undefined;

function showSound() {
  sound.setAttribute('aria-pressed', String(soundEnabled));
  element('sound-state').textContent = soundEnabled ? 'ON' : 'OFF';
}

function clearHint() {
  window.clearTimeout(hintTimer);
  game.querySelectorAll('.glow').forEach(item => item.classList.remove('glow'));
}

function describeBoard(current: Round) {
  const filled = nextSlot(current);
  const description = filled >= rowSize
    ? `にじの 10 が 1こ、2だんめに オレンジ ${filled - rowSize}こ`
    : `あお ${current.first}こ、オレンジ ${current.placed}こ`;
  board.setAttribute('aria-label', description);
}

function begin(index: number) {
  const current = startProblem(index, performance.now());
  round = current;
  moving = false;
  clearHint();
  effects.replaceChildren();
  title.hidden = true;
  game.hidden = false;
  document.body.classList.add('playing');
  home.hidden = false;
  hint.hidden = false;
  hint.disabled = false;
  next.hidden = true;
  result.hidden = true;
  supply.hidden = false;
  element('first').textContent = String(current.first);
  element('second').textContent = String(current.second);
  answer.textContent = '?';
  answer.classList.remove('solved');
  rows[0].classList.remove('merged');
  rows[1].classList.add('reserved');
  rainbow.hidden = true;
  cells.forEach((cell, cellIndex) => {
    cell.className = cellIndex < current.first ? 'cell block blue' : 'cell';
  });

  supply.replaceChildren();
  supply.style.setProperty('--supply-columns', String(Math.min(current.second, 5)));
  for (let index = 0; index < current.second; index += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'block orange';
    button.setAttribute('aria-label', `オレンジのブロック ${index + 1}`);
    button.addEventListener('click', () => void moveBlock(current, button));
    supply.append(button);
  }
  describeBoard(current);
  (supply.firstElementChild as HTMLElement).focus({ preventScroll: true });
}

function pause(milliseconds: number) {
  return new Promise<void>(resolve => window.setTimeout(resolve, reduceMotion.matches ? 0 : milliseconds));
}

function burst(target: HTMLElement, count: number) {
  if (reduceMotion.matches) return;

  const bounds = target.getBoundingClientRect();
  for (let index = 0; index < count; index += 1) {
    const star = document.createElement('span');
    const angle = index * Math.PI * 2 / count;
    star.className = 'particle';
    star.textContent = index % 2 ? '✦' : '★';
    star.style.left = `${bounds.left + bounds.width / 2}px`;
    star.style.top = `${bounds.top + bounds.height / 2}px`;
    star.style.setProperty('--x', `${Math.cos(angle) * bounds.width * (0.4 + index % 3 * 0.06)}px`);
    star.style.setProperty('--y', `${Math.sin(angle) * (48 + index % 3 * 17)}px`);
    star.style.setProperty('--hue', String([44, 52, 326, 190, 268][index % 5]));
    effects.append(star);
    window.setTimeout(() => star.remove(), 680);
  }
}

function fly(source: HTMLElement, destination: HTMLElement) {
  const from = source.getBoundingClientRect();
  const to = destination.getBoundingClientRect();
  const flyer = document.createElement('div');
  flyer.className = 'flyer block orange';
  flyer.style.left = `${from.left}px`;
  flyer.style.top = `${from.top}px`;
  flyer.style.width = `${from.width}px`;
  flyer.style.height = `${from.height}px`;
  flyer.style.setProperty('--dx', `${to.left - from.left}px`);
  flyer.style.setProperty('--dy', `${to.top - from.top}px`);
  flyer.style.setProperty('--sx', String(to.width / from.width));
  flyer.style.setProperty('--sy', String(to.height / from.height));
  effects.append(flyer);
  return flyer;
}

async function moveBlock(current: Round, button: HTMLButtonElement) {
  if (round !== current || moving || button.classList.contains('used')) return;

  moving = true;
  clearHint();
  enableSound(soundEnabled);
  const cell = cells[nextSlot(current)];
  const flyer = fly(button, cell);
  button.classList.add('used');
  await pause(210);
  flyer.remove();
  if (round !== current) return;

  const placement = placeBlock(current)!;
  cell.classList.add('block', 'orange', 'land');
  playSound('place');

  if (placement.madeTen) {
    if (current.first + current.second > rowSize) rows[1].classList.remove('reserved');
    rows[0].classList.add('flash');
    await pause(155);
    if (round !== current) return;
    rows[0].classList.remove('flash');

    rows[0].classList.add('merged');
    rainbow.hidden = false;
    burst(rows[0], 12);
    playSound('ten');
    if (placement.complete) await pause(280);
    if (round !== current) return;
  }

  describeBoard(current);
  if (placement.complete) {
    saveCompletion(current);
    answer.textContent = String(nextSlot(current));
    answer.classList.add('solved');
    supply.hidden = true;
    hint.hidden = true;
    result.hidden = false;
    next.hidden = false;
    cells.slice(0, nextSlot(current)).forEach(slot => slot.classList.add('celebrate'));
    burst(placement.madeTen ? board : result, 10);
    playSound('success');
    next.focus({ preventScroll: true });
  } else {
    supply.querySelector<HTMLButtonElement>('button:not(.used)')?.focus({ preventScroll: true });
  }
  moving = false;
}

element('play').addEventListener('click', () => {
  enableSound(soundEnabled);
  begin(0);
});

home.addEventListener('click', () => {
  round = undefined;
  clearHint();
  rows[0].classList.remove('flash');
  effects.replaceChildren();
  game.hidden = true;
  document.body.classList.remove('playing');
  home.hidden = true;
  title.hidden = false;
  element('play').focus({ preventScroll: true });
});

sound.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  enableSound(soundEnabled);
  saveSound(soundEnabled);
  showSound();
});

next.addEventListener('click', () => {
  if (round) begin(nextProblem(round.index));
});

hint.addEventListener('click', () => {
  if (!round || moving || round.placed === round.second) return;
  const block = supply.querySelector('button:not(.used)');
  clearHint();
  round.hints += 1;
  block?.classList.add('glow');
  cells[nextSlot(round)].classList.add('glow');
  hintTimer = window.setTimeout(clearHint, 1450);
});

showSound();
