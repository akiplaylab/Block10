import './style.css';
import { isLanguage, translate, type Message } from './i18n';
import { enableSound, playSound } from './audio';
import { burst, fly, flyNumber, pause } from './effects';
import { blocksPerRow, classifyInput, createQuestionSource, equationFor, recordAttempt, type ComplementRound, type Operation } from './complement';
import { initializeOffline } from './offline';
import { renderOperator } from './operator-symbol';
import { defaultFavoriteTotals, defaultRandomTotals, drawTotal, mainTotal, maxRandomTotals, selectableTotals } from './random-totals';
import { defaultAnswerMethod, defaultOperation, defaultSound, isAnswerMethod, readAnswerMethod, readFavoriteTotals, readLanguage, readOperation, readRandomTotals, readSound, saveAnswerMethod, saveComplementCompletion, saveFavoriteTotals, saveLanguage, saveOperation, saveRandomTotals, saveSound, type AnswerMethod } from './storage';

function element<T extends HTMLElement = HTMLElement>(id: string) {
  return document.getElementById(id) as T;
}

const title = element('title');
const applyOfflineUpdate = initializeOffline(title);
const game = element('game');
const modes = element('modes');
const tenBlocks = element('ten-blocks');
const playTen = element<HTMLButtonElement>('play-ten');
const playRandom = element<HTMLButtonElement>('play-random');
const home = element<HTMLButtonElement>('home');
const settingsOpen = element<HTMLButtonElement>('settings-open');
const settings = element<HTMLDialogElement>('settings');
const operationSettings = element<HTMLFieldSetElement>('operation-settings');
const operations = settings.querySelectorAll<HTMLInputElement>('input[name="operation"]');
const answerOptions = settings.querySelectorAll<HTMLInputElement>('input[name="answer-method"]');
const resetOpen = element<HTMLButtonElement>('reset-open');
const resetSettings = element<HTMLDialogElement>('reset-settings');
const editor = element<HTMLDialogElement>('total-editor');
const editorNumbers = element('editor-numbers');
const editorCount = element('editor-count');
const editorEmptyNote = element('editor-empty-note');
const languageSelect = element<HTMLSelectElement>('language');
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
let language = readLanguage();
let feedbackMessage: 'tooMany' | 'tooFew' | undefined;
let clearTrial: (() => void) | undefined;

function t(key: Message, values?: Record<string, string | number>) {
  return translate(language, key, values);
}

function totalLabel(total: number) {
  return t(operation === 'subtraction' ? 'subtractTotal' : 'makeTotal', { total });
}

function quantityLabel(quantity: number) {
  return t(quantity === 1 ? 'oneBlock' : 'quantity', { quantity });
}

function supplyLabel() {
  if (game.dataset.method === 'input') return t('keypad');
  if (game.dataset.method === 'choices') return t('answerChoices');
  return t(operation === 'subtraction' ? 'removeBlocks' : 'addBlocks');
}

function showFeedback(message?: typeof feedbackMessage) {
  feedbackMessage = message;
  feedback.textContent = message ? t(message) : '';
}

function showLanguage() {
  document.documentElement.lang = language;
  languageSelect.value = language;
  document.querySelectorAll<HTMLElement>('[data-text]').forEach(node => {
    node.textContent = t(node.dataset.text as Message);
  });
  document.querySelectorAll<HTMLElement>('[data-label]').forEach(node => {
    node.setAttribute('aria-label', t(node.dataset.label as Message));
  });
  randomCard.lastElementChild!.setAttribute('aria-label', t('editRandom'));
  showSound();
  showOperation();
  showRandomMode();
  if (!round) return;

  showFeedback(feedbackMessage);
  if (board.classList.contains('merged')) {
    board.setAttribute('aria-label', t('rainbow', { number: rainbow.textContent ?? '' }));
  } else if (!board.hidden) {
    describeBoard(round);
  }
  supply.setAttribute('aria-label', supplyLabel());
  supply.querySelector('.keypad')?.setAttribute('aria-label', t('keypad'));
  supply.querySelectorAll<HTMLElement>('[data-quantity]').forEach(button => {
    button.setAttribute('aria-label', quantityLabel(Number(button.dataset.quantity)));
  });
}

function showSound() {
  sound.setAttribute('aria-pressed', String(soundEnabled));
  element('sound-state').textContent = soundEnabled ? t('on') : t('off');
}

function showScore() {
  score.textContent = `🌈 × ${collected}`;
}

function showOperation() {
  operations.forEach(option => { option.checked = option.value === operation; });
  document.body.dataset.operation = operation;
  const preview = equationFor({ total: 8, known: 3 }, operation);
  settings.querySelectorAll('[data-preview-first]').forEach(term => { term.textContent = String(preview.first); });
  settings.querySelectorAll('[data-preview-operator]').forEach(term => { term.textContent = preview.symbol; });
  settings.querySelectorAll('[data-preview-result]').forEach(term => { term.textContent = String(preview.result); });
  settings.querySelectorAll('.preview-tiles .slot').forEach(tile => {
    tile.classList.toggle('block', operation === 'subtraction');
    tile.classList.toggle('orange', operation === 'subtraction');
  });
  const known = 7;
  const missing = mainTotal - known;
  const { first, symbol, result } = equationFor({ total: mainTotal, known }, operation);
  element('preview-first').textContent = String(first);
  renderOperator(element('preview-operator'), symbol);
  element('preview-result').textContent = String(result);
  tenBlocks.replaceChildren(...Array.from({ length: mainTotal }, (_, index) =>
    makeBlock(index < known ? 'blue' : 'orange')));
  tenBlocks.setAttribute('aria-label', operation === 'subtraction'
    ? t('subtractPreview', { known, missing })
    : t('addPreview', { known, missing }));
  playTen.setAttribute('aria-label', totalLabel(mainTotal));
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
  return { button, number, blocks };
}

function makeChoice(current: ComplementRound, quantity: number) {
  let button: HTMLButtonElement;
  let number: HTMLElement;
  let blocks: HTMLElement[] = [];
  if (answerMethod === 'blocks') {
    ({ button, number, blocks } = makeNumberButton(quantity, 'orange'));
    for (const block of blocks) {
      block.classList.add('slot');
      if (operation === 'subtraction') block.classList.remove('block', 'orange');
    }
    button.dataset.quantity = String(quantity);
    button.setAttribute('aria-label', quantityLabel(quantity));
  } else {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice choice-number';
    button.textContent = String(quantity);
    number = button;
  }
  button.addEventListener('click', () => void choose(current, quantity, button, blocks, number));
  return button;
}

function makeKeypad(current: ComplementRound) {
  const keypad = document.createElement('div');
  keypad.className = 'keypad';
  keypad.tabIndex = -1;
  keypad.setAttribute('role', 'group');
  keypad.setAttribute('aria-label', t('keypad'));
  let value = '';

  function resetValue() {
    value = '';
    second.textContent = '?';
  }

  function addDigit(digit: string) {
    if (round !== current || phase !== 'choosing') return;
    if (!value) clearTrial?.();
    value += digit;
    const classification = classifyInput(value, current.answer);
    if (classification === 'prefix') {
      second.textContent = value;
      return;
    }
    const quantity = Number(value);
    if (classification === 'incorrect') resetValue();
    void choose(current, quantity, keypad);
  }

  for (const digit of '1234567890') {
    const key = document.createElement('button');
    key.type = 'button';
    key.className = 'utility';
    key.textContent = digit;
    key.addEventListener('click', () => addDigit(digit));
    keypad.append(key);
  }

  keypad.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    const key = event.key;
    if (/^[0-9]$/.test(key)) addDigit(key);
    else if (key === 'c' || key === 'C' || key === 'Delete') {
      if (phase === 'choosing') {
        clearTrial?.();
        resetValue();
      }
    } else return;
    event.preventDefault();
  });
  return keypad;
}

function setInputEnabled(enabled: boolean) {
  supply.querySelectorAll('button').forEach(button => {
    button.setAttribute('aria-disabled', String(!enabled));
  });
}

function describeBoard(current: ComplementRound) {
  board.setAttribute('aria-label', operation === 'subtraction'
    ? t('subtractBoard', { total: current.total, known: current.known })
    : t('addBoard', { known: current.known, answer: current.answer }));
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
  showFeedback();
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
    board.setAttribute('aria-label', t('rainbow', { number: rainbow.textContent ?? '' }));
    return;
  }
  second.textContent = '?';
  if (showBlocks) describeBoard(current);
  if (answerMethod === 'input') {
    supply.setAttribute('aria-label', t('keypad'));
    const keypad = makeKeypad(current);
    supply.replaceChildren(keypad);
    setInputEnabled(true);
    if (focus && !settings.open && !resetSettings.open) keypad.focus({ preventScroll: true });
    return;
  }
  supply.setAttribute('aria-label', supplyLabel());
  const choices = current.choices.map(quantity => makeChoice(current, quantity));
  supply.replaceChildren(...choices);
  setInputEnabled(true);
  if (focus) choices[0].focus({ preventScroll: true });
}

async function showBlockAttempt(current: ComplementRound, blocks: HTMLElement[], correct: boolean) {
  const subtracting = operation === 'subtraction';
  const boardBlocks = subtracting
    ? cells.slice(-blocks.length).reverse()
    : cells.slice(current.known, current.known + blocks.length);
  const choiceBlocks = blocks.slice(0, boardBlocks.length);
  const sources = subtracting ? boardBlocks : choiceBlocks;
  const destinations = subtracting ? choiceBlocks : boardBlocks;
  const sourceClasses = sources.map(source => source.className);
  const landing = correct ? 'land' : 'trial';
  const flights = sources.map((source, index) => fly(effects, source, destinations[index]));
  sources.forEach(source => source.classList.remove('block', 'orange', 'blue'));
  await Promise.all(flights);
  if (round === current) {
    destinations.forEach((destination, index) => {
      const color = sourceClasses[index].includes('blue') ? 'blue' : 'orange';
      destination.classList.add('block', color, landing);
    });
  }
  return () => {
    sources.forEach((source, index) => { source.className = sourceClasses[index]; });
    destinations.forEach(destination => { destination.className = 'slot'; });
  };
}

async function choose(current: ComplementRound, quantity: number, control: HTMLElement, blocks: HTMLElement[] = [], number?: HTMLElement) {
  if (round !== current || phase !== 'choosing') return;

  const enteredOnKeypad = game.dataset.method === 'input';
  clearTrial?.();
  phase = 'animating';
  setInputEnabled(false);
  enableSound(soundEnabled);
  const correct = recordAttempt(current, quantity);
  if (correct && !blocks.length) playSound('place');
  const [restoreBlocks] = await Promise.all([
    blocks.length ? showBlockAttempt(current, blocks, correct) : undefined,
    correct && number && flyNumber(effects, number, second, String(quantity)),
  ]);
  if (round !== current) return;

  if (!correct) {
    playSound('incorrect');
    const extra = quantity - current.answer;
    showFeedback(extra > 0 ? 'tooMany' : 'tooFew');
    if (blocks.length && operation === 'addition') {
      overflow.replaceChildren(...Array.from({ length: Math.max(0, extra) }, () => makeBlock('orange')));
    }
    control.classList.add('shake');
    const timer = window.setTimeout(() => clearTrial?.(), 950);
    clearTrial = () => {
      window.clearTimeout(timer);
      restoreBlocks?.();
      control.classList.remove('shake');
      showFeedback();
      overflow.replaceChildren();
      clearTrial = undefined;
    };
    phase = 'choosing';
    setInputEnabled(true);
    applyAnswerMethod();
    return;
  }

  second.textContent = String(quantity);
  second.classList.add('solved');
  if (blocks.length) {
    playSound('place');
    board.classList.add('flash');
    await pause(155);
    if (round !== current) return;

    board.classList.remove('flash');
    board.classList.add('merged');
    rainbow.hidden = false;
    board.setAttribute('aria-label', t('rainbow', { number: rainbow.textContent ?? '' }));
    burst(effects, board, 12);
  } else {
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
  if (enteredOnKeypad) {
    playSound('success');
    advanceRound(current);
    return;
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

function makeModeCard(play: HTMLButtonElement, favoriteIndex?: number) {
  const card = document.createElement('div');
  card.className = 'mode-card';
  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'utility edit-total';
  edit.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m4 16-1 5 5-1L21 7l-4-4zM14 6l4 4"/></svg>';
  edit.addEventListener('click', () => openTotalEditor(card, favoriteIndex));
  card.append(play, edit);
  return card;
}

const randomCard = makeModeCard(playRandom);
modes.append(randomCard);

const favoriteButtons = favoriteTotals.map((_, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'choice';
  button.addEventListener('click', () => {
    if (game.hidden) startMode(button, favoriteTotals[index]);
  });
  modes.insertBefore(makeModeCard(button, index), randomCard);
  return button;
});

function showFavorites() {
  favoriteButtons.forEach((button, index) => {
    const total = favoriteTotals[index];
    const { number, pieces } = makeNumberDisplay(total, 'blue');
    button.replaceChildren(number, pieces);
    button.nextElementSibling!.setAttribute('aria-label', t('editFavorite', { total }));
    button.setAttribute('aria-label', totalLabel(total));
  });
}

function showRandomMode() {
  const candidates = [...randomTotals].sort((a, b) => a - b);
  playRandom.setAttribute('aria-label', candidates.length ? t('randomList', { numbers: candidates.join(t('numberSeparator')) }) : t('random'));
  element('random-chips').replaceChildren(...candidates.map(total => {
    const chip = document.createElement('span');
    chip.textContent = String(total);
    return chip;
  }));
}

playRandom.addEventListener('click', () => {
  if (game.hidden && randomTotals.length) startMode(playRandom, drawTotal(randomTotals), [...randomTotals]);
});

function positionTotalEditor(card: HTMLElement) {
  const { clientWidth: width, clientHeight: height } = document.documentElement;
  const bounds = card.getBoundingClientRect();
  const gap = 16;
  const edge = 12;
  const above = bounds.top - gap;
  const below = height - bounds.bottom - gap;
  const placeAbove = above >= below;
  const editorWidth = editor.offsetWidth;
  const center = bounds.left + bounds.width / 2;
  const left = Math.max(edge, Math.min(center - editorWidth / 2, width - editorWidth - edge));
  editor.dataset.side = placeAbove ? 'above' : 'below';
  editor.style.left = left + 'px';
  editor.style.setProperty('--editor-arrow', center - left + 'px');
  editor.style.setProperty('--editor-anchor', (placeAbove ? height - above : bounds.bottom + gap) + 'px');
  editor.style.setProperty('--editor-height', Math.max(0, Math.max(above, below) - edge) + 'px');
}

function openTotalEditor(card: HTMLElement, favoriteIndex?: number) {
  const random = favoriteIndex === undefined;
  editorCount.hidden = !random;
  editorEmptyNote.hidden = !random;
  const buttons = selectableTotals.map(total => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'utility';
    button.textContent = String(total);
    button.addEventListener('click', () => {
      if (button.getAttribute('aria-disabled') === 'true') return;
      if (random) {
        randomTotals = randomTotals.includes(total)
          ? randomTotals.filter(candidate => candidate !== total)
          : [...randomTotals, total].sort((a, b) => a - b);
        saveRandomTotals(randomTotals);
        showRandomMode();
      } else {
        favoriteTotals[favoriteIndex] = total;
        saveFavoriteTotals(favoriteTotals);
        showFavorites();
      }
      refresh();
    });
    return button;
  });

  function refresh() {
    buttons.forEach((button, index) => {
      const total = selectableTotals[index];
      const pressed = random ? randomTotals.includes(total) : total === favoriteTotals[favoriteIndex];
      const unavailable = random
        ? !pressed && randomTotals.length === maxRandomTotals
        : total === mainTotal || (!pressed && favoriteTotals.includes(total));
      button.setAttribute('aria-pressed', String(pressed));
      button.setAttribute('aria-disabled', String(unavailable));
    });
    if (random) {
      editorCount.textContent = t('editorCount', { count: randomTotals.length, max: maxRandomTotals });
      editorEmptyNote.classList.toggle('invisible', randomTotals.length > 0);
    }
  }

  editorNumbers.replaceChildren(...buttons);
  refresh();
  card.classList.add('editing');
  editor.showModal();
  const reposition = () => positionTotalEditor(card);
  reposition();
  window.addEventListener('resize', reposition);
  editor.addEventListener('close', () => {
    if (random && !randomTotals.length) {
      randomTotals = [...defaultRandomTotals];
      saveRandomTotals(randomTotals);
      showRandomMode();
    }
    card.classList.remove('editing');
    window.removeEventListener('resize', reposition);
  }, { once: true });
}

home.addEventListener('click', () => {
  round = undefined;
  clearTrial?.();
  second.textContent = '?';
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
  operationSettings.hidden = resetOpen.hidden = !!round;
  showAnswerOptions();
  settings.showModal();
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
resetOpen.addEventListener('click', () => {
  if (!round) resetSettings.showModal();
});
element('reset-confirm').addEventListener('click', () => {
  if (round) return;
  setAnswerMethod(defaultAnswerMethod);
  showAnswerOptions();
  setSound(defaultSound);
  favoriteTotals = [...defaultFavoriteTotals];
  randomTotals = [...defaultRandomTotals];
  saveFavoriteTotals(favoriteTotals);
  saveRandomTotals(randomTotals);
  setOperation(defaultOperation);
  showRandomMode();
});

function advanceRound(current: ComplementRound) {
  begin(randomCandidates ? drawTotal(randomCandidates) : current.total);
}

next.addEventListener('click', () => {
  if (round && phase === 'complete') advanceRound(round);
});

function setOperation(value: Operation) {
  if (round) return;
  operation = value;
  saveOperation(operation);
  showOperation();
}

operations.forEach(option => {
  option.addEventListener('change', () => {
    if (option.checked) setOperation(option.value === 'subtraction' ? 'subtraction' : 'addition');
  });
});

languageSelect.addEventListener('change', () => {
  const selected = languageSelect.value;
  if (!isLanguage(selected)) return;
  language = selected;
  saveLanguage(language);
  showLanguage();
});

showLanguage();
