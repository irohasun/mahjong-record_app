import 'dotenv/config';
import { supabase } from '../lib/supabase';

async function seed() {
  // ダミーユーザー
  const userId = 'dummy-user-id';

  // accounts テーブルにダミーユーザーを追加
  await supabase.from('accounts').upsert([
    { id: userId, username: 'テストユーザー', isPremium: false }
  ]);

  // stats テーブルにダミー統計データを追加
  await supabase.from('stats').upsert([
    { user_id: userId, totalGames: 10, averageRank: 2.5 }
  ]);

  // 必要に応じて他のテーブルも追加可能

  console.log('ダミーデータ投入完了');
}

seed().then(() => process.exit(0)); 