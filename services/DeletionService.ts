import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { LocalStorageService } from '@/services/LocalStorageService';

/**
 * アカウントに紐づくすべてのデータを完全削除するサービス
 *
 * 削除されるデータ:
 * - 対局記録（games, player_records, round_records）
 * - 統計データ
 * - プロフィール情報（accounts）
 * - アップロードした写真（game-photos, profile-photos）
 * - ローカルストレージのすべてのデータ
 * - 認証アカウント（auth.users）
 */
export class DeletionService {
  static async deleteAllUserData(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('認証されていません');
    }

    // Supabase未設定やダミーユーザーの場合はローカルのみクリア
    if (!isSupabaseConfigured || user.id === 'dummy-user-id') {
      await LocalStorageService.clearAll();
      return;
    }

    const accountId = user.id;

    try {
      // 1. ゲームデータの削除
      const { data: games, error: gamesErr } = await supabase
        .from('games')
        .select('id')
        .eq('account_id', accountId);

      if (gamesErr) {
        throw gamesErr;
      }

      const gameIds = (games || []).map((g: any) => g.id);

      if (gameIds.length > 0) {
        // 依存関係順で削除
        const { error: rrErr } = await supabase.from('round_records').delete().in('game_id', gameIds);
        if (rrErr) {
          throw rrErr;
        }

        const { error: prErr } = await supabase.from('player_records').delete().in('game_id', gameIds);
        if (prErr) {
          throw prErr;
        }

        const { error: gErr } = await supabase.from('games').delete().eq('account_id', accountId);
        if (gErr) {
          throw gErr;
        }
      }

      // 2. ストレージのゲーム写真削除
      try {
        const prefix = `games/${accountId}`;
        const { data: list } = await supabase.storage
          .from('game-photos')
          .list(prefix, { limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } });

        if (list && list.length > 0) {
          const paths = list.map((o: any) => `${prefix}/${o.name}`);
          await supabase.storage.from('game-photos').remove(paths);
        }
      } catch {
        // 写真削除エラーは致命的ではないので続行
      }

      // 3. プロフィール写真削除
      try {
        const profilePrefix = `avatars/${accountId}`;
        const { data: profileList } = await supabase.storage
          .from('profile-photos')
          .list(profilePrefix, { limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } });

        if (profileList && profileList.length > 0) {
          const profilePaths = profileList.map((o: any) => `${profilePrefix}/${o.name}`);
          await supabase.storage.from('profile-photos').remove(profilePaths);
        }
      } catch {
        // 写真削除エラーは致命的ではないので続行
      }

      // 4. アカウント情報削除
      const { error: accErr } = await supabase.from('accounts').delete().eq('id', accountId);
      if (accErr && (accErr as any).code !== 'PGRST116') {
        throw accErr;
      }

      // 5. ローカルストレージクリア
      await LocalStorageService.clearAll();

      // 6. 認証アカウント削除（最後に実行）
      const { error: authDeleteErr } = await supabase.rpc('delete_user');
      if (authDeleteErr) {
        // delete_user 関数が存在しない場合のエラーメッセージ
        if ((authDeleteErr as any).message?.includes('function') || (authDeleteErr as any).code === '42883') {
          throw new Error(
            'アカウント削除機能が利用できません。\n' +
            'データベースのマイグレーションを実行する必要があります。\n' +
            '開発者に連絡してください。'
          );
        }

        // その他のエラー
        throw new Error('認証アカウントの削除に失敗しました: ' + authDeleteErr.message);
      }
    } catch (error) {
      throw error;
    }
  }
}
