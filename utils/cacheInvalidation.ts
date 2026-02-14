type Listener = () => void;

const listeners: Set<Listener> = new Set();

/**
 * ゲームデータが変更された時に呼ぶ（追加・更新・削除時）
 */
export function notifyGamesChanged(): void {
  listeners.forEach((listener) => listener());
}

/**
 * ゲームデータ変更を監視する
 * @returns unsubscribe function
 */
export function onGamesChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
