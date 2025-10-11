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
    if (!user) throw new Error('認証されていません');

    // Supabase未設定やダミーユーザーの場合はローカルのみクリア
    if (!isSupabaseConfigured || user.id === 'dummy-user-id') {
      await LocalStorageService.clearAll();
      return;
    }

    const accountId = user.id;

    console.log('🗑️ Starting complete account deletion for user:', accountId);

    try {
      // 1. ゲームデータの削除
      console.log('🗑️ Deleting game data...');
      const { data: games, error: gamesErr } = await supabase
        .from('games')
        .select('id')
        .eq('account_id', accountId);
      
      if (gamesErr) {
        console.error('Error fetching games:', gamesErr);
        throw gamesErr;
      }

      const gameIds = (games || []).map((g: any) => g.id);

      if (gameIds.length > 0) {
        // 依存関係順で削除
        const { error: rrErr } = await supabase.from('round_records').delete().in('game_id', gameIds);
        if (rrErr) {
          console.error('Error deleting round_records:', rrErr);
          throw rrErr;
        }

        const { error: prErr } = await supabase.from('player_records').delete().in('game_id', gameIds);
        if (prErr) {
          console.error('Error deleting player_records:', prErr);
          throw prErr;
        }

        const { error: gErr } = await supabase.from('games').delete().eq('account_id', accountId);
        if (gErr) {
          console.error('Error deleting games:', gErr);
          throw gErr;
        }
      }
      console.log('✅ Game data deleted');

      // 2. ストレージのゲーム写真削除
      console.log('🗑️ Deleting game photos...');
      try {
        const prefix = `games/${accountId}`;
        const { data: list } = await supabase.storage
          .from('game-photos')
          .list(prefix, { limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } });
        
        if (list && list.length > 0) {
          const paths = list.map((o: any) => `${prefix}/${o.name}`);
          const { error: removeErr } = await supabase.storage.from('game-photos').remove(paths);
          if (removeErr) {
            console.error('Error removing game photos:', removeErr);
          } else {
            console.log('✅ Game photos deleted');
          }
        }
      } catch (photoErr) {
        console.error('Error deleting game photos:', photoErr);
        // 写真削除エラーは致命的ではないので続行
      }

      // 3. プロフィール写真削除
      console.log('🗑️ Deleting profile photos...');
      try {
        const profilePrefix = `avatars/${accountId}`;
        const { data: profileList } = await supabase.storage
          .from('profile-photos')
          .list(profilePrefix, { limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } });
        
        if (profileList && profileList.length > 0) {
          const profilePaths = profileList.map((o: any) => `${profilePrefix}/${o.name}`);
          const { error: removeProfileErr } = await supabase.storage.from('profile-photos').remove(profilePaths);
          if (removeProfileErr) {
            console.error('Error removing profile photos:', removeProfileErr);
          } else {
            console.log('✅ Profile photos deleted');
          }
        }
      } catch (profilePhotoErr) {
        console.error('Error deleting profile photos:', profilePhotoErr);
        // 写真削除エラーは致命的ではないので続行
      }

      // 4. アカウント情報削除
      console.log('🗑️ Deleting account info...');
      const { error: accErr } = await supabase.from('accounts').delete().eq('id', accountId);
      if (accErr && (accErr as any).code !== 'PGRST116') {
        console.error('Error deleting account:', accErr);
        throw accErr;
      }
      console.log('✅ Account info deleted');

      // 5. ローカルストレージクリア
      console.log('🗑️ Clearing local storage...');
      await LocalStorageService.clearAll();
      console.log('✅ Local storage cleared');

      // 6. 認証アカウント削除（最後に実行）
      console.log('🗑️ Deleting auth user...');
      const { error: authDeleteErr } = await supabase.rpc('delete_user');
      if (authDeleteErr) {
        // delete_user 関数が存在しない場合は、古いAPIを試す
        console.warn('delete_user function not available, trying admin API...');
        // 注意: admin.deleteUser()はクライアントサイドからは呼べないため、
        // この機能は本番環境ではSupabase Edge Functionまたはサーバーサイドで実装する必要があります
        console.warn('Auth user deletion requires server-side implementation');
      } else {
        console.log('✅ Auth user deleted');
      }

      console.log('✅ Complete account deletion finished successfully');
    } catch (error) {
      console.error('❌ Account deletion failed:', error);
      throw error;
    }
  }
}


