export const problems = [
  [1, 1], [2, 1], [2, 3], [3, 2], [4, 3], [5, 2], [7, 3], [6, 4],
  [8, 2], [9, 1], [9, 2], [8, 5], [7, 6], [9, 9], [3, 2],
] as const;

export const rowSize = 10;

export function startProblem(index: number, startedAt: number) {
  const [first, second] = problems[index];
  return { index, first, second, placed: 0, startedAt };
}

export type Round = ReturnType<typeof startProblem>;

export function nextSlot(round: Round) {
  return round.first + round.placed;
}

export function placeBlock(round: Round) {
  if (round.placed === round.second) return null;

  round.placed += 1;
  return {
    madeTen: nextSlot(round) === rowSize,
    complete: round.placed === round.second,
  };
}

export function nextProblem(index: number) {
  return (index + 1) % problems.length;
}
