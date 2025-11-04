# GameService ドキュメント

## 概要

`GameService`は、麻雀対局記録アプリの対局データ管理を行うサービスクラスです。Supabaseをバックエンドとして使用し、ローカルストレージとの同期機能を提供します。

## 主な機能

- 対局記録の追加・取得・更新・削除
- 統計データの計算と取得
- ローカルストレージとの同期
- オフライン対応（ローカル・ファーストアーキテクチャ）

## アーキテクチャ

### データフロー

```
┌─────────────┐
│   UI層      │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  GameService     │
│  (このクラス)    │
└──────┬──────────┘
       │
       ├─► Supabase (リモートDB)
       │
       └─► LocalStorageService (ローカルキャッシュ)
```

### 設計パターン

- **ローカル・ファースト**: まずローカルデータを返し、バックグラウンドで同期
- **型安全性**: データベース型とアプリケーション型の変換をマッピング関数で実現
- **エラーハンドリング**: エラー時はローカルデータを返すフォールバック機能

---

## プライベートヘルパーメソッド

### ユーティリティ関数

#### `isDummyUser(accountId: string): boolean`
ダミーユーザーIDかどうかを判定します。

**用途**: 開発・テスト環境でのモックデータ処理

---

### データマッピング関数

データベース形式とアプリケーション形式の相互変換を行います。

#### `mapPlayerRecordFromDb(playerRecord: any): Player`
データベースのプレイヤー記録を`Player`型に変換します。

**変換内容**:
- `player_name` → `name`
- `is_main_account` → `isMainAccount`
- `final_score` → `finalScore`
- `starting_position` → `startingPosition` (型キャスト)

#### `mapRoundRecordFromDb(roundRecord: any): GameRoundRecord`
データベースの局記録を`GameRoundRecord`型に変換します。

**変換内容**:
- `riichi_sticks` → `riichiSticks`
- `hand_type` → `handType` (型キャスト)
- `points` → `points` (型キャスト)
- `memo` → 空文字列の場合は`''`に正規化

#### `mapGameFromDb(game: any): GameRecord`
データベースのゲームデータを`GameRecord`型に変換します。

**変換内容**:
- `account_id` → `accountId`
- `game_type` → `gameType`
- `duration_minutes` → `duration` (0の場合は`undefined`)
- `game_end_condition` → `gameEndCondition`
- `final_riichi_sticks` → `finalRiichiSticks`
- `final_honba` → `finalHonba`
- `photo_path` → `photoPath`
- 関連する`player_records`と`round_records`も変換

#### `mapGameToDb(gameData: GameRecord): GameInsert`
`GameRecord`型をデータベース形式に変換します。

**変換内容**:
- `accountId` → `account_id`
- `gameType` → `game_type`
- `duration` → `duration_minutes` (0以下は`null`)
- `gameEndCondition` → `game_end_condition`
- `finalRiichiSticks` → `final_riichi_sticks`
- `finalHonba` → `final_honba`
- `photoPath` → `photo_path`

#### `mapPlayerToDb(player: Player, gameId: string): PlayerRecordInsert`
`Player`型をデータベース形式に変換します。

#### `mapRoundToDb(round: GameRoundRecord, gameId: string): RoundRecordInsert`
`GameRoundRecord`型をデータベース形式に変換します。

---

### クエリビルダー

#### `buildGamesQuery(accountId: string)`
Supabaseのゲーム取得クエリを構築します。

**返り値**: Supabaseクエリビルダー（`select`, `eq`が適用済み）

**使用箇所**:
- `getGames()`
- `getAllGames()`
- `getRecentGames()`

---

### ビジネスロジック関数

#### `getDefaultPlayerStats(): PlayerStats`
デフォルトの統計データを返します（データが存在しない場合に使用）。

**返り値**: すべての統計値が0の`PlayerStats`オブジェクト

#### `updateGameRelatedRecords(gameId: string, gameData: GameRecord): Promise<void>`
ゲームの関連レコード（プレイヤー記録と局記録）を更新します。

**処理フロー**:
1. 既存のプレイヤー記録を削除
2. 新しいプレイヤー記録を挿入
3. 既存の局記録を削除
4. 新しい局記録を挿入（存在する場合）

**エラーハンドリング**: エラー発生時は例外をスロー

#### `filterByPeriod(date: Date, period: 'month' | 'year' | 'all', selectedDate: Date): boolean`
期間でフィルタリングします。

**パラメータ**:
- `date`: フィルタリング対象の日付
- `period`: 期間タイプ（`'month'` | `'year'` | `'all'`）
- `selectedDate`: 基準となる日付

**返り値**: フィルタ条件に一致する場合`true`

#### `isValidRoundRecord(points: any[]): boolean`
有効な局記録かどうかを判定します。

**判定条件**:
- 点数配列が4要素以上
- `null`、`undefined`、空文字が含まれていない

---

## パブリックメソッド

### 対局記録のCRUD操作

#### `addGame(gameData: Omit<GameRecord, 'id'>): Promise<GameRecord>`
新しい対局記録を追加します。

**パラメータ**:
- `gameData`: ID以外の対局記録データ

**処理フロー**:
1. 認証チェック
2. Supabase未設定またはダミーユーザーの場合、ローカルIDを生成して返す
3. ゲーム記録をSupabaseに挿入
4. プレイヤー記録を挿入
5. 局記録を挿入（存在する場合）
6. ローカルストレージに保存
7. バックグラウンドで同期を実行

**返り値**: 追加された対局記録（IDを含む）

**エラーハンドリング**: エラー時は`'対局記録の保存に失敗しました'`をスロー

---

#### `getGames(): Promise<GameRecord[]>`
対局記録のリストを取得します（ローカル・ファースト）。

**処理フロー**:
1. ローカルデータを取得
2. キャッシュが有効でデータが存在する場合は即座に返す
3. Supabase未設定の場合はモックデータを返す
4. バックグラウンドで同期を実行
5. ローカルデータがあれば返す（同期中でも表示可能）
6. ローカルデータがない場合はリモートから取得してキャッシュ

**返り値**: 対局記録の配列（日付降順）

**エラーハンドリング**: エラー時はローカルデータを返す

---

#### `getGameById(accountId: string, gameId: string): Promise<GameRecord | null>`
指定されたIDの対局記録を取得します。

**パラメータ**:
- `accountId`: アカウントID
- `gameId`: ゲームID

**処理フロー**:
1. Supabase未設定の場合はモックデータを返す
2. ゲームデータを取得
3. プレイヤー記録を取得
4. 局記録を取得（`round`でソート）
5. `GameRecord`形式に変換

**返り値**: 対局記録、または見つからない場合は`null`

**エラーハンドリング**: エラー時は`null`を返す

---

#### `updateGame(accountId: string, gameId: string, gameData: GameRecord): Promise<void>`
対局記録を更新します。

**パラメータ**:
- `accountId`: アカウントID
- `gameId`: ゲームID
- `gameData`: 更新する対局記録データ

**処理フロー**:
1. Supabase未設定の場合は何もしない
2. ゲームデータを更新
3. 関連レコード（プレイヤー記録と局記録）を更新
4. ローカルキャッシュを更新
5. キャッシュの有効期限をリセット

**エラーハンドリング**: エラー時は例外をスロー

**注意**: 関連レコードは削除→挿入の方式で更新されます

---

#### `deleteGame(accountId: string, gameId: string): Promise<void>`
対局記録を削除します。

**パラメータ**:
- `accountId`: アカウントID
- `gameId`: ゲームID

**処理フロー**:
1. Supabase未設定の場合は何もしない
2. 関連レコードを削除（局記録 → プレイヤー記録 → ゲーム記録の順）

**エラーハンドリング**: エラー時は例外をスロー

---

### 対局記録の取得（バリエーション）

#### `getAllGames(accountId: string): Promise<GameRecord[]>`
指定されたアカウントのすべての対局記録を取得します。

**パラメータ**:
- `accountId`: アカウントID

**処理フロー**:
1. ダミーユーザーの場合はモックデータを返す
2. Supabaseから全対局記録を取得（日付降順、作成日時降順）
3. ローカルキャッシュを更新

**返り値**: 対局記録の配列

**エラーハンドリング**: エラー時は空配列を返す

---

#### `getRecentGames(accountId: string, limit: number = 5): Promise<GameRecord[]>`
指定されたアカウントの最近の対局記録を取得します。

**パラメータ**:
- `accountId`: アカウントID
- `limit`: 取得件数（デフォルト: 5）

**処理フロー**:
1. ダミーユーザーの場合はモックデータを返す（上限適用）
2. Supabaseから最近の対局記録を取得

**返り値**: 対局記録の配列（最大`limit`件）

**エラーハンドリング**: エラー時は空配列を返す

---

### 統計データの取得

#### `getPlayerStats(accountId: string): Promise<PlayerStats>`
プレイヤーの統計データを取得します。

**パラメータ**:
- `accountId`: アカウントID

**処理フロー**:
1. ダミーユーザーの場合はモック統計を返す
2. メインアカウントのプレイヤー記録を取得
3. 日付降順でソート
4. 統計を計算:
   - 総対局数
   - 平均順位
   - 平均得点
   - 1位率
   - トップ2率
   - 最下位回避率
   - 最高得点・最低得点
   - 最大連荘
   - 順位分布

**返り値**: `PlayerStats`オブジェクト

**エラーハンドリング**: エラー時は`'統計データの取得に失敗しました'`をスロー

---

#### `getHanchanStats(accountId: string, period: 'month' | 'year' | 'all', selectedDate: Date): Promise<PlayerStats>`
半荘（局）単位の統計データを取得します。

**パラメータ**:
- `accountId`: アカウントID
- `period`: 期間タイプ（`'month'` | `'year'` | `'all'`）
- `selectedDate`: 基準となる日付

**処理フロー**:
1. ダミーユーザーの場合はモック統計を返す
2. 局記録を取得
3. 期間でフィルタリング
4. 有効な局記録のみを抽出（4人分の点数が揃っている）
5. 日付・作成時刻順でソート
6. 各局の順位を計算（点数配列から）
7. 統計を計算（`getPlayerStats`と同様）

**返り値**: `PlayerStats`オブジェクト（`totalGames`は局数を示す）

**エラーハンドリング**: エラー時は`'統計データの取得に失敗しました'`をスロー

**注意**: 順位は点数配列から計算されます（0番目のプレイヤーがメインアカウント）

---

#### `getChartData(accountId: string, period: 'month' | 'year' | 'all', selectedDate: Date): Promise<{ labels: string[], scores: number[], ranks: number[] }>`
チャート用のデータを取得します。

**パラメータ**:
- `accountId`: アカウントID
- `period`: 期間タイプ
- `selectedDate`: 基準となる日付

**処理フロー**:
1. ダミーユーザーの場合はモックチャートデータを返す
2. ゲームデータを取得（プレイヤー記録と局記録を含む）
3. 期間でフィルタリング
4. 日付昇順でソート
5. 各局の順位を抽出（メインアカウントの順位）

**返り値**: 
```typescript
{
  labels: string[],  // 局番号（"1", "2", ...）
  scores: number[],  // 空配列（将来拡張用）
  ranks: number[]    // 各局の順位
}
```

**エラーハンドリング**: エラー時は空のデータを返す

---

### ユーティリティメソッド

#### `exportData(accountId: string): Promise<string>`
対局記録をJSON形式でエクスポートします。

**パラメータ**:
- `accountId`: アカウントID

**処理フロー**:
1. ダミーユーザーの場合は空のJSONを返す
2. すべての対局記録を取得
3. JSON文字列に変換（インデント付き）

**返り値**: JSON文字列

**エラーハンドリング**: エラー時は`'データのエクスポートに失敗しました'`をスロー

---

#### `getYearRange(accountId: string): Promise<{ minYear: number; maxYear: number } | null>`
対局記録が存在する年の範囲を取得します。

**パラメータ**:
- `accountId`: アカウントID

**処理フロー**:
1. Supabase未設定またはダミーユーザーの場合はモックデータから計算
2. 最古の対局記録の年を取得
3. 最新の対局記録の年を取得

**返り値**: `{ minYear, maxYear }` または `null`（データがない場合）

**エラーハンドリング**: エラー時は`null`を返す

---

#### `resetData(accountId: string): Promise<void>`
指定されたアカウントのすべての対局記録を削除します。

**パラメータ**:
- `accountId`: アカウントID

**処理フロー**:
1. ダミーユーザーの場合は何もしない
2. アカウントIDに一致するすべてのゲームを削除

**エラーハンドリング**: エラー時は`'データのリセットに失敗しました'`をスロー

**注意**: 関連レコード（プレイヤー記録、局記録）は外部キー制約により自動的に削除されます

---

## データ型

### 使用する主な型

- `GameRecord`: 対局記録
- `Player`: プレイヤー情報
- `GameRoundRecord`: 局記録
- `PlayerStats`: 統計データ

詳細は`@/types/GameRecord`を参照してください。

---

## エラーハンドリング

### エラー処理の原則

1. **ローカル・ファースト**: エラー時は可能な限りローカルデータを返す
2. **フォールバック**: Supabase未設定時はモックデータを使用
3. **エラーログ**: すべてのエラーをコンソールに記録
4. **ユーザーフレンドリー**: エラーメッセージは日本語で統一

### エラーパターン

| エラータイプ | 処理方法 | 例 |
|------------|---------|-----|
| 認証エラー | 例外をスロー | `'認証されていません'` |
| データベースエラー | ローカルデータを返す or 例外をスロー | `getGames()`はローカルデータを返す |
| データ不存在 | `null` or 空配列を返す | `getGameById()`は`null`を返す |

---

## 使用例

### 対局記録の追加

```typescript
const newGame: Omit<GameRecord, 'id'> = {
  accountId: 'user-123',
  date: '2024-01-15',
  location: '雀荘A',
  gameType: '東南戦',
  rules: { /* ルール設定 */ },
  players: [
    { name: 'プレイヤー1', finalScore: 35000, rank: 1, isMainAccount: true, startingPosition: 'East' },
    // ...
  ],
  rounds: [],
  finalRiichiSticks: 0,
  finalHonba: 0,
  gameEndCondition: 'normal',
};

const savedGame = await GameService.addGame(newGame);
console.log('保存されたゲームID:', savedGame.id);
```

### 対局記録の取得

```typescript
// すべての対局記録を取得（ローカル・ファースト）
const games = await GameService.getGames();

// 特定の対局記録を取得
const game = await GameService.getGameById('user-123', 'game-456');

// 最近の5件を取得
const recentGames = await GameService.getRecentGames('user-123', 5);
```

### 統計データの取得

```typescript
// プレイヤー統計
const stats = await GameService.getPlayerStats('user-123');
console.log('平均順位:', stats.averageRank);
console.log('1位率:', stats.firstPlaceRate);

// 半荘統計（2024年1月）
const hanchanStats = await GameService.getHanchanStats(
  'user-123',
  'month',
  new Date('2024-01-15')
);
```

### データの更新

```typescript
const updatedGame: GameRecord = {
  ...existingGame,
  memo: 'メモを追加',
};

await GameService.updateGame('user-123', 'game-456', updatedGame);
```

---

## 注意事項

### パフォーマンス

- `getGames()`はローカル・ファースト方式のため、初回はリモート取得が必要です
- 統計計算は大量のデータがある場合、処理時間がかかる可能性があります

### データ整合性

- `updateGame()`は関連レコードを削除→挿入で更新するため、トランザクションは使用されていません
- エラー発生時は部分的な更新状態になる可能性があります

### オフライン対応

- Supabase未設定時やダミーユーザーの場合、ローカルIDを生成して返します
- 実際の同期は後で実行されます

---

## 依存関係

- `@/lib/supabase`: Supabaseクライアント
- `./LocalStorageService`: ローカルストレージ管理
- `./SyncService`: 同期処理
- `./MockDataService`: モックデータ生成
- `@/types/GameRecord`: 型定義

---

## 更新履歴

- リファクタリング: マッピング関数の抽出、共通ロジックの整理
- ローカル・ファーストアーキテクチャの実装
- 統計計算機能の追加

