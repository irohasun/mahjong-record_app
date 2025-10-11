-- ユーザー自身がアカウントを削除できる関数を作成
-- セキュリティ: この関数は認証済みユーザーが自分自身のアカウントのみ削除可能

-- 既存の関数を削除（存在する場合）
DROP FUNCTION IF EXISTS delete_user();

-- ユーザーアカウント削除関数
CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- この関数は関数作成者の権限で実行される
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- 現在認証されているユーザーのIDを取得
  current_user_id := auth.uid();
  
  -- 認証されていない場合はエラー
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- auth.usersテーブルからユーザーを削除
  -- ON DELETE CASCADEにより、関連するデータも自動的に削除される
  DELETE FROM auth.users WHERE id = current_user_id;
  
  -- 削除が成功した場合、ログに記録
  RAISE NOTICE 'User % deleted successfully', current_user_id;
END;
$$;

-- この関数を認証済みユーザーが実行できるように権限を付与
GRANT EXECUTE ON FUNCTION delete_user() TO authenticated;

-- コメントを追加
COMMENT ON FUNCTION delete_user() IS 'ユーザーが自分自身のアカウントを削除するための関数。認証済みユーザーのみ実行可能。';

