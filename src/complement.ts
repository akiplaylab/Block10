export const blocksPerRow = 5;

export type Operation = 'addition' | 'subtraction';

export function equationFor({ total, known }: Pick<ComplementRound, 'total' | 'known'>, operation: Operation) {
  return operation === 'subtraction'
    ? { first: total, symbol: '−', result: known }
    : { first: known, symbol: '+', result: total };
}

export function recordAttempt(round: ComplementRound, selected: number) {
  const correct = selected === round.answer;
  round.attempts.push({ selected, correct });
  return correct;
}

function shuffle<T>(values: readonly T[], random: () => number) {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  return shuffled;
}

export function createQuestionSource(total: number, random = Math.random) {
  const quantities = Array.from({ length: total - 1 }, (_, index) => index + 1);
  let deck: number[] = [];
  let previous: number | undefined;

  return (startedAt: number) => {
    if (deck.length === 0) {
      deck = shuffle(quantities, random);
      if (deck.length > 1 && deck[0] === previous) {
        const swap = 1 + Math.floor(random() * (deck.length - 1));
        [deck[0], deck[swap]] = [deck[swap], deck[0]];
      }
    }

    const known = deck.shift()!;
    previous = known;
    const answer = total - known;
    const fewer = shuffle(quantities.filter(quantity => quantity < answer), random);
    const more = shuffle(quantities.filter(quantity => quantity > answer), random);
    const distractors = fewer.length && more.length
      ? [fewer[0], more[0]]
      : [...fewer, ...more].slice(0, 2);

    return {
      total,
      known,
      answer,
      choices: shuffle([answer, ...distractors], random),
      attempts: [] as Attempt[],
      startedAt,
    };
  };
}

type Attempt = { selected: number; correct: boolean };
export type ComplementRound = ReturnType<ReturnType<typeof createQuestionSource>>;
