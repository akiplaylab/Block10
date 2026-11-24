import './style.css';
import { burst, fly, pause } from './effects';
import { enableSound, playSound } from './audio';
import { nextProblem, nextSlot, placeBlock, rowSize, startProblem, type Round } from './game';
import { readSound, saveCompletion, saveSound } from './storage';

function element<T extends HTMLElement = HTMLElement>(id: string) {
  return document.getElementById(id) as T;
}

const title = element('title');
const game = element('game');
game.querySelector('.feedback')?.remove();
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

async function moveBlock(current: Round, button: HTMLButtonElement) {
  if (round !== current || moving || button.classList.contains('used')) return;

  moving = true;
  clearHint();
  enableSound(soundEnabled);
  const cell = cells[nextSlot(current)];
  const flyer = fly(effects, button, cell);
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
    burst(effects, rows[0], 12);
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
    burst(effects, placement.madeTen ? board : result, 10);
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
