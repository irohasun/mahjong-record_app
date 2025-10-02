// メディア（写真）関連の型定義
// 目的: 今後のカメラ撮影・画像選択機能の実装に先立ち、
//       画面層やサービス層で共通利用できる最小限の型を用意する。

export interface PhotoAsset {
  // 端末ローカルまたは一時ファイルのURI（例: file:// ...）
  uri: string;
  // 画像のピクセル幅
  width: number;
  // 画像のピクセル高さ
  height: number;
  // 画像のMIMEタイプ（例: image/jpeg）。取得不可の場合は未設定
  mimeType?: string;
  // 端末側で付与されるファイル名（取得不可の場合は未設定）
  fileName?: string;
}


