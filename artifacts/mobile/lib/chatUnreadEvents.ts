/**
 * Shared in-memory store for the total unread chat count.
 *
 * The ChatsScreen (index.tsx) is the source of truth — it pushes the latest
 * total whenever its `chats` state changes.  The tab bar (_tabLayout.tsx)
 * subscribes to get instant badge updates without waiting for SQLite reads.
 */

type Listener = (count: number) => void;

let _count = 0;
const _listeners = new Set<Listener>();

/** Get the current in-memory total unread count. */
export function getTotalUnread(): number {
  return _count;
}

/** Set a new total and notify all subscribers. Call this from ChatsScreen. */
export function setTotalUnread(count: number): void {
  _count = count;
  _listeners.forEach(fn => fn(count));
}

/**
 * Subscribe to unread count changes.
 * The listener is called immediately with the current value, then on every
 * subsequent change.
 * Returns an unsubscribe function.
 */
export function subscribeUnread(fn: Listener): () => void {
  fn(_count);
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
