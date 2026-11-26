import './style.css';
import { enableSound, playSound } from './audio';
import { burst, fly, flyNumber, pause } from './effects';
import { blocksPerRow, createQuestionSource, equationFor, recordAttempt, type ComplementRound, type Operation } from './complement';
import { initializeOffline } from './offline';
import { renderOperator } from './operator-symbol';
import { defaultFavoriteTotals, defaultRandomTotals, drawTotal, mainTotal, maxRandomTotals, minRandomTotals, parseRandomTotals, selectableTotals } from './random-totals';
import { defaultAnswerMethod, defaultSound, isAnswerMethod, readAnswerMethod, readFavoriteTotals, readOperation, readRandomTotals, readSound, saveAnswerMethod, saveComplementCompletion, saveFavoriteTotals, saveOperation, saveRandomTotals, saveSound, type AnswerMethod } from './storage';

function element<T extends HTMLElement = HTMLElement>(id: string) {
  return document.getElementById(id) as T;
}

const title = element('title');
const applyOfflineUpdate = initializeOffline(title);
const game = element('game');
const modes = element('modes');
const operations = title.querySelectorAll<HTMLInputElement>('input[name="operation"]');
const playTen = element<HTMLButtonElement>('play-ten');
const playRandom = element<HTMLButtonElement>('play-random');
const home = element<HTMLButtonElement>('home');
const settingsOpen = element<HTMLButtonElement>('settings-open');
const settings = element<HTMLDialogElement>('settings');
const answerOptions = settings.querySelectorAll<HTMLInputElement>('input[name="answer-method"]');
const resetSettings = element<HTMLDialogElement>('reset-settings');
const editor = element<HTMLDialogElement>('total-editor');
const editorNumbers = element('editor-numbers');
const editorCount = element('editor-count');
const editorSave = element<HTMLButtonElement>('editor-save');
const sound = element<HTMLButtonElement>('sound');
const next = element<HTMLButtonElement>('next');
const supply = element('supply');
const score = element('score');
const result = element('result');
const feedback = element('feedback');
const overflow = element('overflow');
const first = element('first');
const second = element('second');
const effects = element('effects');
const board = element('board');
const equation = game.querySelector<HTMLElement>('.equation')!;
const questions = new Map<number, ReturnType<typeof createQuestionSource>>();
const rainbow = document.createElement('div');
rainbow.className = 'rainbow-block';

let cells: HTMLElement[] = [];
let activeMode: HTMLButtonElement | undefined;
let randomCandidates: number[] | undefined;
let round: ComplementRound | undefined;
let phase: 'choosing' | 'animating' | 'complete' = 'choosing';
let collected = 0;
let operation = readOperation();
let soundEnabled = readSound();
let answerMethod = readAnswerMethod();
let favoriteTotals = readFavoriteTotals();
let randomTotals = readRandomTotals();
let clearTrial: (() => void) | undefined;

function showSound() {
  sound.setAttribute('aria-pressed', String(soundEnabled));
  element('sound-state').textContent = soundEnabled ? 'ON' : 'OFF';
}

function showScore() {
  score.textContent = `🌈 × ${collected}`;
}

function showOperation() {
  operations.forEach(option => { option.checked = option.value === operation; });
  document.body.dataset.operation = operation;
  const { first, symbol, result } = equationFor({ total: mainTotal, known: 7 }, operation);
  element('preview-first').textContent = String(first);
  renderOperator(element('preview-operator'), symbol);
  element('preview-result').textContent = String(result);
  playTen.setAttribute('aria-label', operation === 'subtraction' ? `${mainTotal} から ひく` : `${mainTotal} を つくる`);
  showFavorites();
}

function makeBlock(color: 'orange' | 'blue') {
  const block = document.createElement('span');
  block.className = 'block ' + color;
  return block;
}

function makeNumberDisplay(quantity: number, color: 'orange' | 'blue') {
  const number = document.createElement('span');
  number.className = 'choice-number';
  number.textContent = String(quantity);
  const pieces = document.createElement('span');
  pieces.className = 'choice-pieces';
  pieces.setAttribute('aria-hidden', 'true');
  const blocks = Array.from({ length: quantity }, () => makeBlock(color));
  pieces.append(...blocks);
  return { number, pieces, blocks };
}

function makeNumberButton(quantity: number, color: 'orange' | 'blue') {
  const { number, pieces, blocks } = makeNumberDisplay(quantity, color);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'choice';
  button.append(number, pieces);
  return { button, blocks };
}

function makeChoice(current: ComplementRound, quantity: number) {
  let button: HTMLButtonElement;
  let blocks: HTMLElement[] = [];
  if (answerMethod === 'blocks') {
    ({ button, blocks } = makeNumberButton(quantity, 'orange'));
    button.setAttribute('aria-label', quantity + 'こ');
  } else {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice choice-number';
    button.textContent = String(quantity);
  }
  button.addEventListener('click', () => void choose(current, quantity, button, blocks));
  return button;
}

function makeAnswerForm(current: ComplementRound) {
  const form = document.createElement('form');
  form.className = 'answer-form';
  form.tabIndex = -1;
  form.setAttribute('aria-label', '数字入力');
  const display = document.createElement('output');
  display.textContent = '?';
  display.setAttribute('aria-label', 'こたえ');
  form.append(display);

  const maxDigits = String(current.total - 1).length;
  let value = '';

  function resetValue() {
    value = '';
    display.textContent = '?';
  }

  function addDigit(digit: string) {
    if (phase !== 'choosing') return;
    if (value.length >= maxDigits) return;
    if (!value) clearTrial?.();
    value += digit;
    display.textContent = value;
  }

  for (const digit of '1234567890') {
    const key = document.createElement('button');
    key.type = 'button';
    key.className = 'utility';
    key.textContent = digit;
    key.addEventListener('click', () => addDigit(digit));
    form.append(key);
  }

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'utility';
  submit.textContent = 'OK';
  form.append(submit);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!value) return;
    if (await choose(current, Number(value), form) === false) resetValue();
  });
  form.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    const key = event.key;
    if (/^[0-9]$/.test(key)) addDigit(key);
    else if (key === 'c' || key === 'C' || key === 'Delete') {
      if (phase === 'choosing') {
        clearTrial?.();
        resetValue();
      }
    } else if (key === 'Enter') form.requestSubmit();
    else return;
    event.preventDefault();
  });
  return form;
}

function setInputEnabled(enabled: boolean) {
  supply.querySelectorAll('button').forEach(button => {
    button.setAttribute('aria-disabled', String(!enabled));
  });
}

function describeBoard(current: ComplementRound) {
  board.setAttribute('aria-label', operation === 'subtraction'
    ? `ブロック ${current.total}こ、あおを ${current.known}こ のこそう`
    : `あお ${current.known}こ、あき ${current.answer}マス`);
}

function boardCellClass(current: ComplementRound, index: number) {
  if (index < current.known) return 'slot block blue';
  return operation === 'subtraction' ? 'slot block orange' : 'slot';
}

function begin(total: number) {
  clearTrial?.();
  let source = questions.get(total);
  if (!source) {
    source = createQuestionSource(total);
    questions.set(total, source);
  }
  const current = source(performance.now());
  round = current;
  phase = 'choosing';

  effects.replaceChildren();
  feedback.textContent = '';
  overflow.replaceChildren();
  title.hidden = true;
  game.hidden = false;
  document.body.classList.add('playing');
  home.hidden = false;
  score.hidden = false;
  showScore();
  next.hidden = true;
  result.hidden = true;
  supply.hidden = false;
  const terms = equationFor(current, operation);
  first.textContent = String(terms.first);
  renderOperator(element('operator'), terms.symbol);
  second.textContent = '?';
  second.classList.remove('solved');
  element('answer').textContent = String(terms.result);
  game.style.setProperty('--rows', String(Math.ceil(total / blocksPerRow)));
  board.dataset.total = String(total);
  equation.classList.remove('flash');
  rainbow.textContent = String(terms.result);
  showAnswerMethod(current, true);
}

function showAnswerMethod(current: ComplementRound, focus = false) {
  clearTrial?.();
  game.dataset.method = answerMethod;
  const showBlocks = answerMethod === 'blocks';
  board.hidden = !showBlocks;
  const solved = phase === 'complete';
  board.classList.remove('flash');
  board.classList.toggle('merged', solved);
  rainbow.hidden = !solved;
  cells = Array.from({ length: showBlocks ? current.total : 0 }, (_, index) => {
    const cell = document.createElement('span');
    cell.className = boardCellClass(current, index);
    return cell;
  });
  board.replaceChildren(...cells, rainbow);
  if (solved) {
    board.setAttribute('aria-label', `にじの ${rainbow.textContent} が 1こ`);
    return;
  }
  if (showBlocks) describeBoard(current);
  if (answerMethod === 'input') {
    supply.setAttribute('aria-label', '数字入力');
    const form = makeAnswerForm(current);
    supply.replaceChildren(form);
    setInputEnabled(true);
    if (focus) form.focus({ preventScroll: true });
    return;
  }
  supply.setAttribute('aria-label', showBlocks
    ? operation === 'subtraction' ? 'とるブロック' : 'おくブロック'
    : 'こたえの せんたくし');
  const choices = current.choices.map(quantity => makeChoice(current, quantity));
  supply.replaceChildren(...choices);
  setInputEnabled(true);
  if (focus) choices[0].focus({ preventScroll: true });
}

async function showBlockAttempt(current: ComplementRound, blocks: HTMLElement[], correct: boolean) {
  if (operation === 'subtraction') {
    const removed = cells.slice(-blocks.length);
    removed.forEach(cell => cell.classList.add('removed'));
    await pause(210);
    return () => removed.forEach(cell => cell.classList.remove('removed'));
  }

  const destinations = cells.slice(current.known, current.known + blocks.length);
  const flyers = destinations.map((destination, index) => fly(effects, blocks[index], destination));
  await pause(210);
  flyers.forEach(flyer => flyer.remove());
  if (round === current) {
    destinations.forEach(cell => cell.classList.add('block', 'orange', correct ? 'land' : 'trial'));
  }
  return () => destinations.forEach(cell => { cell.className = 'slot'; });
}

async function choose(current: ComplementRound, quantity: number, control: HTMLElement, blocks: HTMLElement[] = []) {
  if (round !== current || phase !== 'choosing') return;

  clearTrial?.();
  phase = 'animating';
  setInputEnabled(false);
  enableSound(soundEnabled);
  const correct = recordAttempt(current, quantity);
  control.classList.add('chosen');
  const restoreBlocks = blocks.length ? await showBlockAttempt(current, blocks, correct) : undefined;
  if (round !== current) return;

  if (!correct) {
    playSound('incorrect');
    const extra = quantity - current.answer;
    feedback.textContent = extra > 0 ? 'ちょっと おおいね' : 'ちょっと たりないね';
    if (blocks.length && operation === 'addition') {
      overflow.replaceChildren(...Array.from({ length: Math.max(0, extra) }, () => makeBlock('orange')));
    }
    control.classList.add('shake');
    const timer = window.setTimeout(() => clearTrial?.(), 950);
    clearTrial = () => {
      window.clearTimeout(timer);
      restoreBlocks?.();
      control.classList.remove('chosen', 'shake');
      feedback.textContent = '';
      overflow.replaceChildren();
      clearTrial = undefined;
    };
    phase = 'choosing';
    setInputEnabled(true);
    applyAnswerMethod();
    return false;
  }

  playSound('place');
  if (blocks.length) {
    board.classList.add('flash');
    await pause(155);
    if (round !== current) return;

    board.classList.remove('flash');
    board.classList.add('merged');
    rainbow.hidden = false;
    board.setAttribute('aria-label', `にじの ${rainbow.textContent} が 1こ`);
    burst(effects, board, 12);
  } else {
    const source = control.querySelector('output') ?? control;
    await flyNumber(effects, source, second, source.textContent ?? String(quantity));
    if (round !== current) return;

    second.textContent = String(quantity);
    second.classList.add('solved');
    equation.classList.add('flash');
  }
  playSound('ten');
  await pause(280);
  if (round !== current) return;

  equation.classList.remove('flash');
  phase = 'complete';
  collected += 1;
  showScore();
  saveComplementCompletion(current, operation, !!randomCandidates);
  if (blocks.length) {
    second.textContent = String(quantity);
    second.classList.add('solved');
  }
  supply.hidden = true;
  result.hidden = false;
  next.hidden = false;
  if (blocks.length) burst(effects, result, 10);
  playSound('success');
  applyAnswerMethod();
  if (!settings.open) next.focus({ preventScroll: true });
}

function startMode(button: HTMLButtonElement, total: number, candidates?: number[]) {
  activeMode = button;
  randomCandidates = candidates;
  enableSound(soundEnabled);
  collected = 0;
  begin(total);
}

playTen.addEventListener('click', () => {
  if (game.hidden) startMode(playTen, mainTotal);
});

function makeModeCard(play: HTMLButtonElement, editTotal: () => void) {
  const card = document.createElement('div');
  card.className = 'mode-card';
  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'utility edit-total';
  edit.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m4 16-1 5 5-1L21 7l-4-4zM14 6l4 4"/></svg>';
  edit.addEventListener('click', editTotal);
  card.append(play, edit);
  return card;
}

const randomCard = makeModeCard(playRandom, () => openTotalEditor());
randomCard.lastElementChild!.setAttribute('aria-label', 'ランダムの かずを かえる');
modes.append(randomCard);

const favoriteButtons = favoriteTotals.map((_, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'choice';
  button.addEventListener('click', () => {
    if (game.hidden) startMode(button, favoriteTotals[index]);
  });
  modes.insertBefore(makeModeCard(button, () => openTotalEditor(index)), randomCard);
  return button;
});

function showFavorites() {
  favoriteButtons.forEach((button, index) => {
    const total = favoriteTotals[index];
    const { number, pieces } = makeNumberDisplay(total, 'blue');
    button.replaceChildren(number, pieces);
    button.nextElementSibling!.setAttribute('aria-label', total + ' の カードを かえる');
    button.setAttribute('aria-label', operation === 'subtraction' ? total + ' から ひく' : total + ' を つくる');
  });
}

function showRandomMode() {
  const candidates = [...randomTotals].sort((a, b) => a - b);
  playRandom.setAttribute('aria-label', 'ランダム ' + candidates.join('、'));
  element('random-chips').replaceChildren(...candidates.map(total => {
    const chip = document.createElement('span');
    chip.textContent = String(total);
    return chip;
  }));
}

playRandom.addEventListener('click', () => {
  if (game.hidden) startMode(playRandom, drawTotal(randomTotals), [...randomTotals]);
});

function openTotalEditor(favoriteIndex?: number) {
  const random = favoriteIndex === undefined;
  const selected = new Set(random ? randomTotals : [favoriteTotals[favoriteIndex]]);
  element('editor-title').textContent = random
    ? `あそびたい かずを ${minRandomTotals} ～ ${maxRandomTotals} つ えらんでね`
    : 'あそびたい かずを えらんでね';
  editorCount.hidden = !random;
  const buttons = selectableTotals.map(total => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'utility';
    button.textContent = String(total);
    button.addEventListener('click', () => {
      if (random) {
        if (!selected.delete(total) && selected.size < maxRandomTotals) selected.add(total);
      } else {
        selected.clear();
        selected.add(total);
      }
      refresh();
    });
    return button;
  });

  function refresh() {
    buttons.forEach((button, index) => {
      const total = selectableTotals[index];
      const pressed = selected.has(total);
      button.setAttribute('aria-pressed', String(pressed));
      button.disabled = random
        ? !pressed && selected.size === maxRandomTotals
        : total === mainTotal || (!pressed && favoriteTotals.includes(total));
    });
    editorCount.textContent = `${selected.size} つ えらんだよ`;
    editorSave.disabled = random && selected.size < minRandomTotals;
  }

  editorSave.onclick = () => {
    if (random) {
      const totals = parseRandomTotals([...selected].sort((a, b) => a - b));
      if (!totals) return;
      randomTotals = totals;
      saveRandomTotals(randomTotals);
      showRandomMode();
    } else {
      const [total] = selected;
      favoriteTotals[favoriteIndex] = total;
      saveFavoriteTotals(favoriteTotals);
      showFavorites();
    }
    editor.close();
  };
  editorNumbers.replaceChildren(...buttons);
  refresh();
  editor.showModal();
  editorNumbers.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
}

home.addEventListener('click', () => {
  round = undefined;
  clearTrial?.();
  effects.replaceChildren();
  game.hidden = true;
  document.body.classList.remove('playing');
  home.hidden = true;
  score.hidden = true;
  title.hidden = false;
  activeMode?.focus({ preventScroll: true });
  applyOfflineUpdate?.();
});

settingsOpen.addEventListener('click', () => {
  showAnswerOptions();
  settings.showModal();
  settings.querySelector<HTMLInputElement>('input:checked')?.focus();
});

settings.addEventListener('change', event => {
  const option = event.target;
  if (option instanceof HTMLInputElement && option.checked && isAnswerMethod(option.value)) {
    setAnswerMethod(option.value);
  }
});

function showAnswerOptions() {
  answerOptions.forEach(option => { option.checked = option.value === answerMethod; });
}

function applyAnswerMethod() {
  if (round && phase !== 'animating' && game.dataset.method !== answerMethod) {
    showAnswerMethod(round);
  }
}

function setAnswerMethod(method: AnswerMethod) {
  answerMethod = method;
  saveAnswerMethod(method);
  applyAnswerMethod();
}

function setSound(enabled: boolean) {
  soundEnabled = enabled;
  enableSound(soundEnabled);
  saveSound(soundEnabled);
  showSound();
}

sound.addEventListener('click', () => setSound(!soundEnabled));
element('reset-open').addEventListener('click', () => resetSettings.showModal());
element('reset-confirm').addEventListener('click', () => {
  setAnswerMethod(defaultAnswerMethod);
  showAnswerOptions();
  setSound(defaultSound);
  favoriteTotals = [...defaultFavoriteTotals];
  randomTotals = [...defaultRandomTotals];
  saveFavoriteTotals(favoriteTotals);
  saveRandomTotals(randomTotals);
  showFavorites();
  showRandomMode();
});

next.addEventListener('click', () => {
  if (round && phase === 'complete') begin(randomCandidates ? drawTotal(randomCandidates) : round.total);
});

operations.forEach(option => {
  option.addEventListener('change', () => {
    operation = option.value === 'subtraction' ? 'subtraction' : 'addition';
    saveOperation(operation);
    showOperation();
  });
});

showSound();
showOperation();
showRandomMode();
