const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

export function pause(milliseconds: number) {
  return new Promise<void>(resolve => window.setTimeout(resolve, reduceMotion.matches ? 0 : milliseconds));
}

export function burst(effects: HTMLElement, target: HTMLElement, count: number) {
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

export async function fly(effects: HTMLElement, source: HTMLElement, destination: HTMLElement) {
  if (reduceMotion.matches) return;

  const from = source.getBoundingClientRect();
  const to = destination.getBoundingClientRect();
  const flyer = document.createElement('div');
  flyer.className = source.classList.contains('blue') ? 'flyer block blue' : 'flyer block orange';
  flyer.style.left = `${from.left}px`;
  flyer.style.top = `${from.top}px`;
  flyer.style.width = `${from.width}px`;
  flyer.style.height = `${from.height}px`;
  flyer.style.setProperty('--dx', `${to.left + to.width / 2 - (from.left + from.width / 2)}px`);
  flyer.style.setProperty('--dy', `${to.top + to.height / 2 - (from.top + from.height / 2)}px`);
  flyer.style.setProperty('--sx', String(to.width / from.width));
  flyer.style.setProperty('--sy', String(to.height / from.height));
  effects.append(flyer);
  try {
    await Promise.allSettled(flyer.getAnimations().map(animation => animation.finished));
  } finally {
    flyer.remove();
  }
}

export async function flyNumber(effects: HTMLElement, source: HTMLElement, destination: HTMLElement, value: string) {
  if (reduceMotion.matches) return;

  const from = source.getBoundingClientRect();
  const to = destination.getBoundingClientRect();
  const destinationStyle = getComputedStyle(destination);
  const flyer = document.createElement('span');
  flyer.className = 'number-flyer';
  flyer.textContent = value;
  flyer.style.left = `${to.x + to.width / 2}px`;
  flyer.style.top = `${to.y + to.height / 2}px`;
  flyer.style.fontFamily = destinationStyle.fontFamily;
  flyer.style.fontSize = destinationStyle.fontSize;
  flyer.style.fontWeight = destinationStyle.fontWeight;
  flyer.style.lineHeight = destinationStyle.lineHeight;
  flyer.style.color = destinationStyle.color;
  effects.append(flyer);

  const dx = from.x + from.width / 2 - (to.x + to.width / 2);
  const dy = from.y + from.height / 2 - (to.y + to.height / 2);
  const motion = flyer.animate([
    { transform: `translate(${dx}px, ${dy}px) translate(-50%, -50%)` },
    { transform: 'translate(-50%, -50%)' },
  ], { duration: 250, easing: 'cubic-bezier(.24,.78,.24,1)', fill: 'both' });
  source.classList.add('number-in-flight');
  try {
    await motion.finished.catch(() => {});
  } finally {
    source.classList.remove('number-in-flight');
    flyer.remove();
  }
}
