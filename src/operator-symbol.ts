const paths = {
  '+': 'M5 12h14M12 5v14',
  '−': 'M5 12h14',
  '=': 'M5 9h14M5 15h14',
};

type OperatorSymbol = keyof typeof paths;

export function renderOperator(container: HTMLElement, symbol: OperatorSymbol) {
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');

  const path = document.createElementNS(namespace, 'path');
  path.setAttribute('d', paths[symbol]);
  svg.append(path);

  const text = document.createElement('span');
  text.className = 'operator-text';
  text.textContent = symbol;
  container.classList.add('operator-symbol');
  container.replaceChildren(text, svg);
}

for (const container of document.querySelectorAll<HTMLElement>('[data-operator]')) {
  const symbol = container.dataset.operator;
  if (symbol === '+' || symbol === '−' || symbol === '=') renderOperator(container, symbol);
}
