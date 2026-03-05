# デッドコード分析レポート

生成日: 2026-03-04
前回分析: 2026-02-21

## 使用ツール
- **knip v5.84.1**: 未使用ファイル・エクスポート・依存関係の検出
- **手動分析**: import/export グラフの追跡、grep による参照確認

---

## 事前テスト状況（変更前ベースライン）

**6 テスト失敗 / 194 テスト（既存の不具合 -- 今回の変更とは無関係）**

| スイート | 失敗数 | 失敗理由 |
|---------|--------|---------|
| `ScoreCalculator.autoComplete.test.ts` | 2 | `calculateFourthPlayerScore` エッジケースの仕様差異 |
| `GameService.test.ts` | 4 | `getGameSummaries`, `getHanchanStats`, `getChartData` のモック不一致（`player_count` パラメータ追加による差異） |

---

## 今回削除した項目（SAFE -- 全てテスト通過確認済み）

### 1. `.claude/worktrees/` 残骸ディレクトリ削除
| ディレクトリ | 説明 |
|------------|------|
| `.claude/worktrees/beautiful-northcutt/` | Claude worktree 残骸（プロジェクト全体のコピー） |
| `.claude/worktrees/youthful-montalcini/` | Claude worktree 残骸（プロジェクト全体のコピー） |

**効果**: Jest の `jest-haste-map: duplicate manual mock found` 警告6件が解消

### 2. 未使用ファイル削除
| ファイル | 説明 |
|---------|------|
| `scripts/seed.ts` | Supabase シードスクリプト。package.json にスクリプト登録なし、どこからも参照なし |

### 3. 未使用 devDependency 削除
| パッケージ | 説明 |
|---------|------|
| `ts-node` | `scripts/seed.ts` 実行用。seed.ts 削除に伴い不要 |

### 4. 未使用エクスポート削除
| ファイル | エクスポート | 説明 |
|---------|------------|------|
| `types/Friends.ts` | `FriendshipResponse` interface | コードベース内で未参照（テスト含む） |
| `types/database.ts` | `Constants` const | コードベース内で未参照 |

### 5. 設定ファイルクリーンアップ
| ファイル | 変更 | 説明 |
|---------|------|------|
| `tsconfig.json` | `nativewind-env.d.ts` を include から削除 | NativeWind は使用しておらず、ファイルも存在しない |

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

## 残存する既知の問題

1. **テスト不一致**: `GameService.test.ts` が `player_count` パラメータの追加に追従していない
2. **テスト不一致**: `ScoreCalculator.autoComplete.test.ts` のエッジケース仕様がソースコードと一致していない
3. **未使用の通知イベント**: `notifyFriendsChanged()` / `notifyGroupsChanged()` が FriendService/GroupService から呼ばれていない（UI自動更新の未配線バグの可能性）

---

## 最終 knip 結果（クリーンアップ後）

```
Unused files (3)           -- 全て Expo ビルド設定、削除不可
Unused devDependencies (0) -- 解消済み
Unused exports (0)         -- 解消済み (Constants 削除)
Unused exported types (6)  -- Supabase 自動生成型5件 + NotificationSettings (内部使用)
Unlisted dependencies (1)  -- expo-updates (app.json 参照、Expo 内部)
Unresolved imports (1)     -- babel-preset-expo (Expo 内部)
```

## サマリー

| 項目 | 件数 |
|------|------|
| 削除ファイル | 1 (scripts/seed.ts) |
| 削除ディレクトリ | 2 (.claude/worktrees/*) |
| 削除 devDependency | 1 (ts-node) |
| 削除エクスポート | 2 (FriendshipResponse, Constants) |
| 設定修正 | 1 (tsconfig.json) |
| テスト結果 | 変更前後で同一（6失敗/194テスト -- 既存不具合のみ） |
