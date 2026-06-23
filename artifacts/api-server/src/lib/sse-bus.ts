type Listener = (data: object) => void;
const listeners = new Map<number, Set<Listener>>();

export function sseSubscribe(userId: number, cb: Listener): () => void {
  if (!listeners.has(userId)) listeners.set(userId, new Set());
  listeners.get(userId)!.add(cb);
  return () => {
    listeners.get(userId)?.delete(cb);
    if (listeners.get(userId)?.size === 0) listeners.delete(userId);
  };
}

export function sseEmit(userId: number, data: object) {
  listeners.get(userId)?.forEach(cb => {
    try { cb(data); } catch {}
  });
}
