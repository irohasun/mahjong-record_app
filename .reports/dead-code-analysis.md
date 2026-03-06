# デッドコード分析レポート

生成日: 2026-03-06
前回分析: 2026-03-04

## 使用ツール
- **knip v5.84.1**: 未使用ファイル・エクスポート・依存関係の検出
- **手動分析**: import/export グラフの追跡、grep による参照確認
- **tsc --noEmit**: TypeScript 型チェック

---

## 事前テスト状況（変更前ベースライン）

**6 テスト失敗 / 200 テスト（既存の不具合 -- 今回の変更とは無関係）**

| スイート | 失敗数 | 失敗理由 |
|---------|--------|---------|
| `ScoreCalculator.autoComplete.test.ts` | 2 | `calculateFourthPlayerScore` エッジケースの仕様差異 |
| `GameService.test.ts` | 4 | `getGameSummaries`, `getHanchanStats`, `getChartData` のモック不一致（`player_count` パラメータ追加による差異） |

---

## 今回の分析結果（2026-03-06）

前回（2026-03-04）のクリーンアップ以降、最新コミット（73d2901: レーティング機能・フレンド承認・グループ招待）で追加・修正されたファイルを精査した。

### 新規追加ファイル
| ファイル | 使用状況 |
|---------|---------|
| `components/PlayerAvatar.tsx` | `add-game.tsx`・`edit-game.tsx` でインポート・使用 ✅ |
| `components/groups/GroupMatchModal.tsx` | `group-details.tsx` でインポート・使用 ✅ |
| `supabase/migrations/20260307000000_fix_duplicate_friendship.sql` | マイグレーションファイル ✅ |

### 修正ファイルの未使用 import 確認
| ファイル | 結果 |
|---------|------|
| `app/(tabs)/add-game.tsx` | `Camera`, `ImagePicker` は実際に使用されている ✅ |
| `app/(tabs)/edit-game.tsx` | `Camera`, `ImagePicker`, `ArrowLeft` はすべて使用 ✅ |
| `app/(tabs)/friends.tsx` | `AccountService` は `getMyRating()` で使用 ✅ |
| `app/(tabs)/group-details.tsx` | 全 import 使用 ✅ |
| `app/ranking.tsx` | 全 import 使用 ✅ |
| `services/AuthService.ts` | 全 import 使用 ✅ |
| `services/FriendService.ts` | `notifyFriendsChanged` は `removeFriend`/`blockUser` で使用 ✅ |

**結論: 新規デッドコードなし。今回は削除対象なし。**

---

## 今回削除した項目

なし（前回 2026-03-04 のクリーンアップで対応済み）

---

## 削除しなかった項目（理由付き）

### DANGER（Expo/ビルドシステム関連 -- 削除厳禁）
| 対象 | 理由 |
|-----|------|
| `metro.config.js` | Expo バンドラーが暗黙的に参照（knip の誤検知） |
| `plugins/withAndroidManifestFix.js` | `app.json` の plugins で明示的に参照 |
| `plugins/withAndroidManifestFix.ts` | 上記 .js のソースファイル |
| `babel.config.js` | Expo/Jest が暗黙的に参照 |

### CAUTION（Supabase 自動生成型 -- 削除非推奨）
| 対象 | ファイル | 理由 |
|-----|---------|------|
| `Tables` type | `types/database.ts:440` | Supabase CLI 自動生成ヘルパー型。現在直接参照なしだが、DB 型システムの一部 |
| `TablesInsert` type | `types/database.ts:469` | 同上 |
| `TablesUpdate` type | `types/database.ts:494` | 同上 |
| `Enums` type | `types/database.ts:519` | 同上 |
| `CompositeTypes` type | `types/database.ts:536` | 同上 |

### CAUTION（内部使用のみだが機能的に必要）
| 対象 | ファイル | 理由 |
|-----|---------|------|
| `NotificationSettings` interface | `services/NotificationService.ts:6` | `NotificationService` 内部で使用されている（knip の誤検知） |

---

## 既知の TypeScript エラー（型エラー、デッドコードとは別問題）

`tsc --noEmit` で検出された型エラー（今回の変更とは無関係の既存問題）:

| ファイル | エラー内容 |
|---------|---------|
| `services/AccountService.ts:233,274` | `new Date(string \| null)` - null チェック不足 |
| `services/AccountService.ts:280` | `number \| null` を `number` に代入 |
| `services/AccountService.ts:299` | `'get_all_ratings'` が既知 RPC 名でない（型生成の未反映） |
| `services/GameService.ts:901-916` | RPC 戻り値の型が `Json` のまま、プロパティアクセスで型エラー |

---

## 残存する既知の問題

1. **テスト不一致**: `GameService.test.ts` が `player_count` パラメータの追加に追従していない
2. **テスト不一致**: `ScoreCalculator.autoComplete.test.ts` のエッジケース仕様がソースコードと一致していない
3. **TypeScript 型エラー**: `AccountService.ts` / `GameService.ts` で RPC 戻り値の型が未整合（`types/database.ts` の再生成が必要）

---

## 最終 knip 結果（最新）

```
Unused files (3)           -- 全て Expo ビルド設定、削除不可
Unused devDependencies (0) -- 解消済み
Unused exports (0)         -- 解消済み
Unused exported types (6)  -- Supabase 自動生成型5件 + NotificationSettings (内部使用)
Unlisted dependencies (1)  -- expo-updates (app.json 参照、Expo 内部)
Unresolved imports (1)     -- babel-preset-expo (Expo 内部)
```

## サマリー

| 項目 | 件数 |
|------|------|
| 削除ファイル | 0（前回対応済み） |
| 削除エクスポート | 0（前回対応済み） |
| テスト結果 | 6失敗/200テスト -- 既存不具合のみ（変化なし） |
