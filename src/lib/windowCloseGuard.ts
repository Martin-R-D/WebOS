// Guards live outside persisted window state and are removed when editors unmount.
const guards = new Map<string, () => boolean>();

export function registerCloseGuard(id: string, guard: () => boolean) {
  guards.set(id, guard);
  return () => {
    guards.delete(id);
  };
}

export function canCloseWindow(id: string): boolean {
  return guards.get(id)?.() ?? true;
}
