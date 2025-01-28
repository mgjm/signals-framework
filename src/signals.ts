let pending = false;

const watcher = new Signal.subtle.Watcher(() => {
  if (!pending) {
    pending = true;
    queueMicrotask(() => {
      pending = false;
      flushPending();
    });
  }
});

function flushPending() {
  for (const signal of watcher.getPending()) {
    signal.get();
  }

  watcher.watch();
}

export function effect(cb: () => void) {
  let c = new Signal.Computed(() => cb());

  watcher.watch(c);

  c.get();

  return () => {
    watcher.unwatch(c);
  };
}
