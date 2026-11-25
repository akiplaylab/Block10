export const totals = [5, 10, 20] as const;
export type Total = (typeof totals)[number];
export const blocksPerRow = 5;

function shuffle<T>(values: readonly T[], random: () => number) {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  return shuffled;
}

export function createQuestionSource(total: Total, random = Math.random) {
  const quantities = Array.from({ length: total - 1 }, (_, index) => index + 1);
  let deck: number[] = [];
  let previous: number | undefined;

  return (startedAt: number) => {
    if (deck.length === 0) {
      deck = shuffle(quantities, random);
      if (deck[0] === previous) {
        const swap = 1 + Math.floor(random() * (deck.length - 1));
        [deck[0], deck[swap]] = [deck[swap], deck[0]];
      }
    }

    const first = deck.shift()!;
    previous = first;
    const answer = total - first;
    const fewer = shuffle(quantities.filter(quantity => quantity < answer), random);
    const more = shuffle(quantities.filter(quantity => quantity > answer), random);
    const distractors = fewer.length && more.length
      ? [fewer[0], more[0]]
      : [...fewer, ...more].slice(0, 2);

    return {
      total,
      first,
      answer,
      choices: shuffle([answer, ...distractors], random),
      attempts: [] as Attempt[],
      hintCount: 0,
      startedAt,
    };
  };
}

type Attempt = { selected: number; correct: boolean };
export type ComplementRound = ReturnType<ReturnType<typeof createQuestionSource>>;
