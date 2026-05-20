type Listener = () => void;
const listeners = new Set<Listener>();

export function onShortsRefresh(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitShortsRefresh() {
  listeners.forEach((fn) => fn());
}
