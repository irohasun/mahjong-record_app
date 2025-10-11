import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { LocalStorageService } from '@/services/LocalStorageService';

/**
 * アカウントに紐づくアプリデータを全削除するサービス
 * - auth.users 自体の削除は行わない（サーバー側権限が必要なため）
 */
export class DeletionService {
  static async deleteAllUserData(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('認証されていません');

    // Supabase未設定やダミーユーザーの場合はローカルのみクリア
    if (!isSupabaseConfigured || user.id === 'dummy-user-id') {
      await LocalStorageService.clearAll();
      return;
    }

    const accountId = user.id;

    // ユーザーの全ゲームID
    const { data: games, error: gamesErr } = await supabase
      .from('games')
      .select('id')
      .eq('account_id', accountId);
    if (gamesErr) throw gamesErr;
    const gameIds = (games || []).map((g: any) => g.id);

    if (gameIds.length > 0) {
      // 依存関係順で削除
      const { error: rrErr } = await supabase.from('round_records').delete().in('game_id', gameIds);
      if (rrErr) throw rrErr;
      const { error: prErr } = await supabase.from('player_records').delete().in('game_id', gameIds);
      if (prErr) throw prErr;
      const { error: gErr } = await supabase.from('games').delete().eq('account_id', accountId);
      if (gErr) throw gErr;
    }

    // ストレージのゲーム写真削除（存在しなくても無視）
    try {
      const prefix = `games/${accountId}`;
      const { data: list } = await supabase.storage.from('game-photos').list(prefix, { limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } });
      if (list && list.length > 0) {
        const paths = list.map((o: any) => `${prefix}/${o.name}`);
        await supabase.storage.from('game-photos').remove(paths);
      }
    } catch {}

    // アカウント行を削除（存在しなくてもOK）
    const { error: accErr } = await supabase.from('accounts').delete().eq('id', accountId);
    if (accErr && (accErr as any).code !== 'PGRST116') throw accErr;

    await LocalStorageService.clearAll();
  }
}


