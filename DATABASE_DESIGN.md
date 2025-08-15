# データベース設計 - クリーンな設計

## 概要
UIページに必要なテーブルのみを含む、シンプルで効率的なデータベース設計に変更しました。

## 変更日時
2024年12月

## テーブル構成

### 1. accounts（ユーザーアカウント）
```sql
CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL DEFAULT 'プレイヤー',
  created_at timestamptz DEFAULT now(),
  is_premium boolean DEFAULT false,
  purchase_date timestamptz,
  monthly_game_count integer DEFAULT 0,
  last_reset_date timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**用途**: ユーザーの基本情報とプレミアム機能の管理

### 2. games（対局記録）
```sql
CREATE TABLE games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date timestamptz NOT NULL,
  location text,
  game_type text NOT NULL CHECK (game_type IN ('東風戦', '東南戦')),
  rules jsonb NOT NULL DEFAULT '{}',
  memo text,
  duration_minutes integer,
  game_end_condition text DEFAULT 'normal' CHECK (game_end_condition IN ('normal', 'bankruptcy', 'timeout', 'time_limit')),
  final_riichi_sticks integer DEFAULT 0,
  final_honba integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

**用途**: 対局の基本情報を保存

### 3. player_records（プレイヤー記録）
```sql
CREATE TABLE player_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  is_main_account boolean DEFAULT false,
  final_score integer NOT NULL,
  rank integer NOT NULL CHECK (rank BETWEEN 1 AND 4),
  starting_position text NOT NULL CHECK (starting_position IN ('East', 'South', 'West', 'North')),
  created_at timestamptz DEFAULT now()
);
```

**用途**: 各対局でのプレイヤーの成績を保存

### 4. round_records（局記録）
```sql
CREATE TABLE round_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round text NOT NULL,
  honba integer DEFAULT 0,
  riichi_sticks integer DEFAULT 0,
  winner integer,
  loser integer,
  hand_type text NOT NULL CHECK (hand_type IN ('ron', 'tsumo', 'draw', 'abort')),
  points jsonb NOT NULL DEFAULT '[]',
  han integer,
  fu integer,
  yakuman boolean DEFAULT false,
  memo text,
  created_at timestamptz DEFAULT now()
);
```

**用途**: 各局の詳細情報を保存

## 削除されたテーブル

### 1. game_photos
- **理由**: 現在のUIで使用されていない
- **影響**: なし（使用されていない機能）

### 2. user_profiles
- **理由**: 現在のUIで使用されていない
- **影響**: なし（使用されていない機能）

### 3. user_roles
- **理由**: 現在のUIで使用されていない
- **影響**: なし（使用されていない機能）

### 4. user_role_assignments
- **理由**: 現在のUIで使用されていない
- **影響**: なし（使用されていない機能）

## セキュリティ

### Row Level Security (RLS)
- 全テーブルでRLSを有効化
- ユーザーは自分のデータのみアクセス可能

### ポリシー
- **accounts**: ユーザーは自分のアカウント情報のみ読み書き可能
- **games**: ユーザーは自分の対局記録のみ読み書き可能
- **player_records**: ユーザーは自分の対局に関連するプレイヤー記録のみ読み書き可能
- **round_records**: ユーザーは自分の対局に関連する局記録のみ読み書き可能

## パフォーマンス

### インデックス
```sql
CREATE INDEX idx_games_account_date ON games(account_id, date DESC);
CREATE INDEX idx_player_records_game ON player_records(game_id);
CREATE INDEX idx_player_records_main ON player_records(is_main_account, game_id);
CREATE INDEX idx_round_records_game ON round_records(game_id);
CREATE INDEX idx_accounts_username ON accounts(username);
```

### 自動更新トリガー
```sql
-- updated_at を自動更新するトリガー
CREATE TRIGGER update_accounts_updated_at 
    BEFORE UPDATE ON accounts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

## 統計機能

### get_player_stats 関数
```sql
CREATE OR REPLACE FUNCTION get_player_stats(user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- 統計情報を計算してJSONで返す
$$;
```

**提供する統計情報**:
- 総対局数
- 平均順位
- 1位率
- 平均得点
- 最高得点
- 最低得点
- 連対率
- ラス回避率
- 順位分布

## データ整合性

### 制約
- **games.game_type**: '東風戦' または '東南戦' のみ
- **games.game_end_condition**: 'normal', 'bankruptcy', 'timeout', 'time_limit' のみ
- **player_records.rank**: 1-4の範囲
- **player_records.starting_position**: 'East', 'South', 'West', 'North' のみ
- **round_records.hand_type**: 'ron', 'tsumo', 'draw', 'abort' のみ

### 外部キー制約
- **games.account_id** → **accounts.id** (CASCADE DELETE)
- **player_records.game_id** → **games.id** (CASCADE DELETE)
- **round_records.game_id** → **games.id** (CASCADE DELETE)

## 改善効果

### 1. シンプルさ
- 不要なテーブルを削除することで、データベース構造がシンプルになりました
- メンテナンスが容易になりました

### 2. パフォーマンス
- 不要なテーブルを削除することで、クエリの複雑さが減少
- 適切なインデックスにより、検索パフォーマンスが向上

### 3. セキュリティ
- RLSにより、ユーザーは自分のデータのみアクセス可能
- 適切なポリシーにより、データの漏洩を防止

### 4. 拡張性
- 必要に応じて新しいテーブルを追加可能
- 統計機能により、将来的な分析機能の拡張が容易

## 移行手順

1. **バックアップ**: 既存データのバックアップを取得
2. **マイグレーション実行**: 新しいマイグレーションファイルを実行
3. **データ検証**: 既存データが正しく移行されていることを確認
4. **アプリケーションテスト**: 全機能が正常に動作することを確認

## 今後の注意点

- 新しい機能を追加する際は、必要最小限のテーブルのみを作成する
- 定期的に使用されていないテーブルやカラムをチェックし、削除を検討する
- パフォーマンス監視を行い、必要に応じてインデックスを追加する 