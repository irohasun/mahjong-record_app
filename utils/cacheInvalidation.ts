type Listener = () => void;

const gamesListeners: Set<Listener> = new Set();
const friendsListeners: Set<Listener> = new Set();
const groupsListeners: Set<Listener> = new Set();

/**
 * ゲームデータが変更された時に呼ぶ（追加・更新・削除時）
 */
export function notifyGamesChanged(): void {
  gamesListeners.forEach((listener) => listener());
}

/**
 * ゲームデータ変更を監視する
 * @returns unsubscribe function
 */
export function onGamesChanged(listener: Listener): () => void {
  gamesListeners.add(listener);
  return () => {
    gamesListeners.delete(listener);
  };
}

/**
 * フレンドデータが変更された時に呼ぶ
 */
export function notifyFriendsChanged(): void {
  friendsListeners.forEach((listener) => listener());
}

/**
 * フレンドデータ変更を監視する
 * @returns unsubscribe function
 */
export function onFriendsChanged(listener: Listener): () => void {
  friendsListeners.add(listener);
  return () => {
    friendsListeners.delete(listener);
  };
}

/**
 * グループデータが変更された時に呼ぶ
 */
export function notifyGroupsChanged(): void {
  groupsListeners.forEach((listener) => listener());
}

/**
 * グループデータ変更を監視する
 * @returns unsubscribe function
 */
export function onGroupsChanged(listener: Listener): () => void {
  groupsListeners.add(listener);
  return () => {
    groupsListeners.delete(listener);
  };
}
