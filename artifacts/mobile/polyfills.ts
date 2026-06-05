/**
 * Global polyfills — must be imported before any library code runs.
 *
 * WeakRef: Added to Hermes in later releases. Older Android devices running
 * builds that bundle an older Hermes version will crash with
 * "Property 'WeakRef' doesn't exist" when any library (e.g. TanStack Query v5)
 * tries to use it. This polyfill provides a non-weak fallback: the target is
 * held strongly, so it won't be garbage-collected, but all API calls succeed
 * and functionality is preserved.
 */
if (typeof WeakRef === "undefined") {
  (global as any).WeakRef = class WeakRef<T extends object> {
    private _target: T;
    constructor(target: T) {
      this._target = target;
    }
    deref(): T {
      return this._target;
    }
  };
}

/**
 * FinalizationRegistry polyfill — companion to WeakRef. Libraries that use
 * WeakRef often also use FinalizationRegistry. Hermes versions that lack WeakRef
 * also lack FinalizationRegistry. This no-op polyfill prevents crashes; cleanup
 * callbacks simply never fire (acceptable since GC-based cleanup is always
 * best-effort).
 */
if (typeof FinalizationRegistry === "undefined") {
  (global as any).FinalizationRegistry = class FinalizationRegistry<T> {
    constructor(_callback: (heldValue: T) => void) {}
    register(_target: object, _heldValue: T, _unregisterToken?: object): void {}
    unregister(_unregisterToken: object): boolean {
      return false;
    }
  };
}
