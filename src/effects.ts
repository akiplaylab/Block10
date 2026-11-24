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

export function fly(effects: HTMLElement, source: HTMLElement, destination: HTMLElement) {
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
