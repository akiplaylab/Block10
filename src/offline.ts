export function initializeOffline(title: HTMLElement) {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return;

  const workers = navigator.serviceWorker;
  const base = import.meta.env.BASE_URL;
  const script = new URL(base + 'service-worker.js', location.origin).href;
  const status = document.getElementById('offline-ready')!;
  const testOffline = document.getElementById('offline-test');
  const controlled = workers.controller?.scriptURL === script;
  let registration: ServiceWorkerRegistration | undefined;
  let reloadPending = false;
  let requestedWorker: ServiceWorker | undefined;

  function applyAtTitle() {
    if (title.hidden || document.visibilityState !== 'visible') return;
    if (reloadPending) {
      location.reload();
    } else if (registration?.waiting && registration.waiting !== requestedWorker) {
      requestedWorker = registration.waiting;
      requestedWorker.postMessage('activate-offline-update');
    }
  }

  function checkForUpdate() {
    applyAtTitle();
    if (document.visibilityState !== 'visible') return;

    void registration?.update().catch(() => {});
    if (testOffline) {
      void fetch(base, { cache: 'no-store' }).then(async response => {
        if (!response.ok) return;
        const latest = new DOMParser().parseFromString(await response.text(), 'text/html');
        if (!testOffline.hidden || !latest.getElementById('offline-test')) {
          reloadPending = true;
          applyAtTitle();
        }
      }).catch(() => {});
    }
  }

  workers.addEventListener('controllerchange', () => {
    if (workers.controller?.scriptURL !== script) return;
    reloadPending ||= controlled || Boolean(requestedWorker);
    applyAtTitle();
  });
  document.addEventListener('visibilitychange', checkForUpdate);
  window.addEventListener('online', checkForUpdate);
  window.addEventListener('pageshow', event => {
    if (event.persisted) checkForUpdate();
  });

  void workers.register(script, { scope: base, updateViaCache: 'none' }).then(current => {
    registration = current;
    function reflectState() {
      if (current.active?.state === 'activated') status.hidden = false;
      applyAtTitle();
    }
    function watchWorker() {
      const worker = current.installing ?? current.waiting ?? current.active;
      worker?.addEventListener('statechange', reflectState);
      reflectState();
    }
    current.addEventListener('updatefound', watchWorker);
    watchWorker();
    checkForUpdate();
  }).catch(() => {});

  return applyAtTitle;
}
