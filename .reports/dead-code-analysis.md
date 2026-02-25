# デッドコード分析レポート

生成日: 2026-02-21

## 使用ツール
- **knip**: 未使用ファイル・エクスポート・依存関係の検出
- **depcheck**: 未使用 npm パッケージの検出
- **手動分析**: インポート/呼び出しグラフの追跡

---

## 事前テスト状況（変更前）

**8 テスト失敗 / 145 テスト（既存の不具合）**

| スイート | 失敗理由 |
|---------|---------|
| `ScoreCalculator.autoComplete.test.ts` | `calculateFourthPlayerScore` エッジケースの仕様差異 |
| `GameService.test.ts` | `getHanchanStats`, `getChartData` の RPC モック不一致 |
| `statistics.logic.test.ts` | `buildStatsCacheKey` のシグネチャ変更 |

---

## 分析結果

### 🔴 DANGER（手を付けない）

| 対象 | 理由 |
|-----|------|
| `coverage/lcov-report/*.js` | 自動生成ファイル（.gitignore 追加推奨） |
| `metro.config.js` | Expo バンドラーが内部で参照 |
| `plugins/withAndroidManifestFix.ts` | Expo プラグイン（app.json で参照） |
| `scripts/seed.ts` | DB シードスクリプト（手動実行用） |
| `types/database.ts` の型エクスポート | Supabase 自動生成型（`Tables`, `TablesInsert` 等） |
| `expo-file-system`, `expo-splash-screen` 等 | Expo が実行時に使用する可能性あり |

---

### 🟡 CAUTION（要確認）

| 対象 | ファイル | 説明 |
|-----|---------|------|
| `notifyFriendsChanged()` | `utils/cacheInvalidation.ts:28` | `onFriendsChanged` リスナーは `friends.tsx` で登録済みだが、**FriendService から一度も呼ばれていない**（未配線のバグ） |
| `notifyGroupsChanged()` | `utils/cacheInvalidation.ts:46` | 同上（GroupService から呼ばれていない） |
| `MockDataService` 全体 | `services/MockDataService.ts` | Supabase 未設定時のフォールバックとして `GameService`, `AccountService` から参照 |

---

### 🟢 SAFE（削除・修正対象）

#### 1. console.log DEBUG 文の削除

| ファイル | 削除件数 |
|---------|---------|
| `services/NotificationService.ts` | 17件 |
| `services/SyncService.ts` | 18件 |

> `console.error` は保持（エラーハンドリング用）

#### 2. 不要な export の削除（ファイル内でのみ使用）

| 対象 | ファイル |
|-----|---------|
| `SyncStatus` interface | `services/SyncService.ts:7` |
| `ChangeType` type | `services/SyncService.ts:15` |
| `PendingChange` interface | `services/SyncService.ts:18` |
| `ChartDataItem` interface | `components/statistics/SimpleChart.tsx:4` |
| `AutoCompleteResult` interface | `utils/ScoreCalculator.ts:249` |

#### 3. 未使用 devDependencies

| パッケージ | 理由 |
|---------|------|
| `@types/react-native` | RN 型は本体に含まれ重複 |
| `ts-node` | `scripts/seed.ts` のみ。直接 tsx で実行可能 |

---

## 未解決の問題（対応が必要）

- `notifyFriendsChanged()` / `notifyGroupsChanged()` が FriendService・GroupService から呼ばれていない
  → フレンド/グループデータ変更後に UI が自動更新されない
- `buildStatsCacheKey` のシグネチャ変更によるテスト失敗（既存の不具合）
- `calculateFourthPlayerScore` エッジケーステスト失敗（既存の不具合）
